const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model")

async function createChat(req, res) {
  try {
    const { title } = req.body;

    // Ensure the user object exists
    const user = req.user;
    if (!user || !user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Create the chat
    const chat = await chatModel.create({
      user: user._id,
      title,
    });

    // Optionally create an initial AI/system message so the chat isn't empty
    try {
      const initial = await messageModel.create({
        user: user._id,
        chat: chat._id,
        content: "Welcome! This is the start of your new chat. Ask anything to begin.",
        role: 'model'
      });
    } catch (err) {
      console.warn('Could not create initial message for chat:', err);
    }

    // Respond with success
    res.status(201).json({
      message: "Chat created successfully",
      chat: {
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
        user: chat.user,
      },
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getChats(req, res) {
    const user = req.user;

    const chats = await chatModel.find({ user: user._id });

    res.status(200).json({
        message: "Chats retrieved successfully",
        chats: chats.map(chat => ({
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user
        }))
    });
}

async function getMessages(req, res) {

    const chatId = req.params.id;

    const messages = await messageModel.find({ chat: chatId }).sort({ createdAt: 1 });

    res.status(200).json({
        message: "Messages retrieved successfully",
        messages: messages
    })

}

module.exports = {
  createChat,
  getChats,
  getMessages,
  // Delete a chat and its messages (only owner can delete)
  async deleteChat(req, res) {
    try {
      const chatId = req.params.id;
      const user = req.user;

      if (!user || !user._id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const chat = await chatModel.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      // Ensure owner
      if (String(chat.user) !== String(user._id)) {
        return res.status(403).json({ message: 'Forbidden: cannot delete this chat' });
      }

      // Delete messages belonging to the chat
      await messageModel.deleteMany({ chat: chatId });

      // Delete the chat
      await chatModel.deleteOne({ _id: chatId });

      res.status(200).json({ message: 'Chat and messages deleted' });
    } catch (err) {
      console.error('Error deleting chat:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  ,
  // Delete a single message by id. Only the chat owner or message author can delete.
  async deleteMessage(req, res) {
    try {
      const messageId = req.params.id;
      const user = req.user;

      if (!user || !user._id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const message = await messageModel.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      const chat = await chatModel.findById(message.chat);
      if (!chat) {
        return res.status(404).json({ message: 'Parent chat not found' });
      }

      // Allow if requester is chat owner or the message author
      if (String(chat.user) !== String(user._id) && String(message.user) !== String(user._id)) {
        return res.status(403).json({ message: 'Forbidden: cannot delete this message' });
      }

      await messageModel.deleteOne({ _id: messageId });

      res.status(200).json({ message: 'Message deleted' });
    } catch (err) {
      console.error('Error deleting message:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};