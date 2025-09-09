const {Server} = require("socket.io")
const cookie = require("cookie")
const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const aiService = require("../services/ai.service")
const messageModel = require("../models/message.model")
const {createMemory,queryMemory} = require("../services/vector.service")

function initSocketServer(httpserver){
                const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
                const io = new Server(httpserver, {
                cors: {
                        origin: CLIENT_URL,
                        methods: ["GET", "POST"],
                        allowedHeaders: [ "Content-Type", "Authorization" ],
                        credentials: true
                }
        })
io.use(async (socket, next)=>{
        try {
            // First try cookie token (for browsers that support cross-site cookies)
            const cookies = cookie.parse(socket.request.headers.cookie || '');
            let token = cookies.token;

            // If no cookie token, accept token passed in socket handshake auth (client side: io(url, { auth: { token } }))
            if (!token && socket.handshake && socket.handshake.auth && socket.handshake.auth.token) {
                token = socket.handshake.auth.token;
            }

            if (!token) {
                console.warn('Socket auth failed: no token provided');
                return next(new Error('Unauthorized'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id || decoded.Id);
            if (!user) {
                console.warn('Socket auth failed: user not found for id', decoded.id || decoded.Id);
                return next(new Error('Unauthorized'));
            }

            socket.user = user;
            return next();
        } catch (err) {
            console.error('Socket auth error:', err && err.message ? err.message : err);
            return next(new Error('Unauthorized'));
        }

})
  
     io.on("connection", (socket) => {
        console.log("New client connected", socket.id)
        socket.on("ai-message", async (messagePayload) => {
            /* messagePayload = { chat:chatId,content:message text } */
            const [ message, vectors ] = await Promise.all([
                messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: messagePayload.content,
                    role: "user"
                }),
                aiService.generateVector(messagePayload.content),
            ])

            await createMemory({
                vectors,
                messageId: message._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: messagePayload.content
                }
            })


            const [ memory, chatHistory ] = await Promise.all([

                queryMemory({
                    queryVector: vectors,
                    limit: 3,
                    metadata: {
                        user: socket.user._id
                    }
                }),

                messageModel.find({
                    chat: messagePayload.chat
                }).sort({ createdAt: -1 }).limit(20).lean().then(messages => messages.reverse())
            ])

            const stm = chatHistory.map(item => {
                return {
                    role: item.role,
                    parts: [ { text: item.content } ]
                }
            })

            const ltm = [
                {
                    role: "user",
                    parts: [ {
                        text: `

                        these are some previous messages from the chat, use them to generate a response

                        ${memory.map(item => item.metadata.text).join("\n")}
                        
                        ` } ]
                }
            ]


            const response = await aiService.generateResponse([ ...ltm, ...stm ])




            socket.emit('ai-response', {
                content: response,
                chat: messagePayload.chat
            })

            const [ responseMessage, responseVectors ] = await Promise.all([
                messageModel.create({
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    content: response,
                    role: "model"
                }),
                aiService.generateVector(response)
            ])

            await createMemory({
                vectors: responseVectors,
                messageId: responseMessage._id,
                metadata: {
                    chat: messagePayload.chat,
                    user: socket.user._id,
                    text: response
                }
            })

        })

        // New listener: handle messages that include uploaded files/attachments
        // Frontend emits 'ai-message-with-files' with { chat, text, attachments }
        socket.on("ai-message-with-files", async (payload) => {
            try {
                const messageText = (payload.text || '').trim();
                const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];

                // Build a human-readable text block describing attachments so the AI has context.
                // If attachments have server-relative URLs ("/uploads/...") convert to absolute using SERVER_URL if available.
                const serverBase = process.env.SERVER_URL || (`http://localhost:${process.env.PORT || 3001}`);
                const attachmentLines = attachments.map(a => {
                    let url = a.data || '';
                    if (typeof url === 'string' && url.startsWith('/')) url = `${serverBase}${url}`;
                    return `Attachment: ${a.name} (${a.type}) - ${url}`;
                }).join('\n');

                const combinedContent = [messageText, attachmentLines].filter(Boolean).join('\n\n');

                // Persist the user message
                const [ message, vectors ] = await Promise.all([
                    messageModel.create({
                        chat: payload.chat,
                        user: socket.user._id,
                        content: combinedContent || ' ',
                        role: "user"
                    }),
                    aiService.generateVector(combinedContent || ' '),
                ])

                await createMemory({
                    vectors,
                    messageId: message._id,
                    metadata: {
                        chat: payload.chat,
                        user: socket.user._id,
                        text: combinedContent
                    }
                })

                const [ memory, chatHistory ] = await Promise.all([
                    queryMemory({
                        queryVector: vectors,
                        limit: 3,
                        metadata: {
                            user: socket.user._id
                        }
                    }),

                    messageModel.find({ chat: payload.chat }).sort({ createdAt: -1 }).limit(20).lean().then(messages => messages.reverse())
                ])

                const stm = chatHistory.map(item => ({ role: item.role, parts: [ { text: item.content } ] }))

                const ltm = [ {
                    role: "user",
                    parts: [ { text: `\n\nthese are some previous messages from the chat, use them to generate a response\n\n${memory.map(item => item.metadata.text).join("\n")}` } ]
                } ]

                const response = await aiService.generateResponse([ ...ltm, ...stm ])

                // Emit AI response back to client
                socket.emit('ai-response', {
                    content: response,
                    chat: payload.chat
                })

                // Save model response and its vectors
                const [ responseMessage, responseVectors ] = await Promise.all([
                    messageModel.create({
                        chat: payload.chat,
                        user: socket.user._id,
                        content: response,
                        role: "model"
                    }),
                    aiService.generateVector(response)
                ])

                await createMemory({
                    vectors: responseVectors,
                    messageId: responseMessage._id,
                    metadata: {
                        chat: payload.chat,
                        user: socket.user._id,
                        text: response
                    }
                })

            } catch (err) {
                console.error('Error handling ai-message-with-files:', err && err.message ? err.message : err);
                socket.emit('ai-response', { content: 'Sorry, I could not process the uploaded files.', chat: payload.chat });
            }
        })

    })
}


module.exports = initSocketServer;