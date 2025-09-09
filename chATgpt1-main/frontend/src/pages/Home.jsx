import React, { useEffect, useState } from 'react';
import { io } from "socket.io-client";
import ChatMobileBar from '../components/chat/ChatMobileBar.jsx';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import ChatMessages from '../components/chat/ChatMessages.jsx';
import ChatComposer from '../components/chat/ChatComposer.jsx';
import '../components/chat/ChatLayout.css';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  startNewChat,
  selectChat,
  setInput,
  sendingStarted,
  sendingFinished,
  setChats
} from '../store/chatSlice.js';

const Home = () => {
  const dispatch = useDispatch();
  const chats = useSelector(state => state.chat.chats);
  const activeChatId = useSelector(state => state.chat.activeChatId);
  const input = useSelector(state => state.chat.input);
  const isSending = useSelector(state => state.chat.isSending);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  // TTS/visualizer removed — keep socket/token logic

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // =======================
  // Create new chat
  // =======================
  const handleNewChat = async (title) => {
    if (!title || typeof title !== 'string') return;

    try {
      const response = await axios.post(
        "http://localhost:3001/api/chat",
        { title },
        { withCredentials: true }
      );

      const newChat = response.data.chat;
      dispatch(startNewChat(newChat));
      getMessages(newChat._id);   // load messages
      setSidebarOpen(false);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  // =======================
  // Fetch messages for a chat
  // =======================
  const getMessages = async (chatId) => {
    if (!chatId) return;

    try {
      const response = await axios.get(
        `http://localhost:3001/api/chat/messages/${chatId}`,
        { withCredentials: true }
      );

      const msgs = response.data.messages.map(m => ({
        _id: m._id,
        type: m.role === 'user' ? 'user' : 'ai',
        content: m.content,
        role: m.role,
        attachments: m.attachments || []
      }));

      setMessages(msgs);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  // =======================
  // Send user message
  // =======================
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !activeChatId || isSending) return;

    dispatch(sendingStarted());

    const newMessages = [...messages, { type: 'user', content: trimmed }];
    setMessages(newMessages);
    dispatch(setInput(''));

    socket.emit("ai-message", {
      chat: activeChatId,
      content: trimmed
    });
  };

  // =======================
  // Initialize socket and fetch chats
  // =======================
  useEffect(() => {
    // Attach token from localStorage if present
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Fetch all chats
    axios.get("http://localhost:3001/api/chat", { withCredentials: true })
      .then(res => {
        dispatch(setChats(res.data.chats.reverse()));
      })
      .catch(err => console.error("Error fetching chats:", err));

    // Initialize socket
    const tempSocket = io("http://localhost:3001", { withCredentials: true, auth: { token } });

    tempSocket.on("ai-response", (messagePayload) => {
      // Add AI message to UI and update sending state. Automatic TTS removed.
      setMessages(prev => [...prev, { type: 'ai', content: messagePayload.content }]);
      dispatch(sendingFinished());
    });

    setSocket(tempSocket);

    // Cleanup on unmount
    return () => tempSocket.disconnect();
  }, [dispatch]);

  // Delete chat handler
  const handleDeleteChat = async (chatId) => {
    if (!chatId) return;
    try {
      await axios.delete(`http://localhost:3001/api/chat/${chatId}`, { withCredentials: true });
      // remove from state
      dispatch(setChats(chats.filter(c => c._id !== chatId)));
      // if deleting active chat, clear messages and activeChatId
      if (activeChatId === chatId) {
        setMessages([]);
        dispatch(selectChat(null));
      }
    } catch (err) {
      console.error('Error deleting chat', err);
    }
  };

  // Delete a single message
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    try {
      await axios.delete(`http://localhost:3001/api/chat/message/${messageId}`, { withCredentials: true });
      // remove from UI
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch (err) {
      console.error('Error deleting message', err);
    }
  };

  // Logout handler (simple): clear token and reload
  const handleLogout = () => {
    // Call backend to clear cookie then clear local tokens and redirect
    axios.post('http://localhost:3001/api/auth/logout', {}, { withCredentials: true })
      .then(() => {
  try { localStorage.removeItem('auth_token'); } catch (e) {}
  try { delete axios.defaults.headers.common['Authorization']; } catch (e) {}
  window.location.href = '/login';
      })
      .catch((err) => {
        console.error('Logout failed', err);
        // fallback: clear local token and reload
        try { localStorage.removeItem('auth_token'); } catch (e) {}
        window.location.reload();
      });
  };

  // Listen for attachment events from ChatComposer
  useEffect(() => {
    const handler = async (e) => {
      const { attachments, text } = e.detail || {};
      if (!attachments || !attachments.length) return;

      // Optimistically add the message with current attachments (data URLs may be present)
      const optimistic = { type: 'user', content: text || '', attachments };
      setMessages(prev => [...prev, optimistic]);
      // Emit attachments directly to socket (no server-side upload step)
      try {
        if (socket) socket.emit('ai-message-with-files', { chat: activeChatId, text: text || '', attachments });
      } catch (err) {
        console.error('Error emitting attachments', err);
      }
    };

    window.addEventListener('chat-files', handler);
    return () => window.removeEventListener('chat-files', handler);
  }, [socket, activeChatId]);

  return (
  <div className="chat-layout minimal">
    <ChatMobileBar
      onToggleSidebar={() => setSidebarOpen(o => !o)}
      onNewChat={handleNewChat}
    />
    <ChatSidebar
      chats={chats}
      activeChatId={activeChatId}
      onSelectChat={(id) => {
        dispatch(selectChat(id));
        setSidebarOpen(false);
        getMessages(id);
      }}
      onNewChat={handleNewChat}
  onDeleteChat={handleDeleteChat}
  onLogout={handleLogout}
      open={sidebarOpen}
    />
    <main className="chat-main" role="main">
      {messages.length === 0 && (
        <div className="chat-welcome" aria-hidden="true">
          <div className="chip">Early Preview</div>
          <h1>ChatGPT Clone</h1>
          <p>Ask anything. Paste text, brainstorm ideas, or get quick explanations. Your chats stay in the sidebar so you can pick up where you left off.</p>
        </div>
      )}
  <ChatMessages messages={messages} isSending={isSending} onDeleteMessage={handleDeleteMessage} />
      {
        activeChatId &&
        <ChatComposer
          input={input}
          setInput={(v) => dispatch(setInput(v))}
          onSend={sendMessage}
          isSending={isSending}
        />}
    </main>
    {sidebarOpen && (
      <button
        className="sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={() => setSidebarOpen(false)}
      />
    )}
  </div>
);
};

  // Delete a single message
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    try {
      await axios.delete(`http://localhost:3001/api/chat/message/${messageId}`, { withCredentials: true });
      // remove from UI
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch (err) {
      console.error('Error deleting message', err);
    }
  };

export default Home;