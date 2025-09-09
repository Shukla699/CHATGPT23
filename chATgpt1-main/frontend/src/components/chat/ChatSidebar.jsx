import React, { useState } from 'react';
import { Plus, MessageSquare, Trash, LogOut } from "lucide-react"; // icon lib
import './ChatSidebar.css';

const ChatSidebar = ({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onLogout, open }) => {
  const [newChatTitle, setNewChatTitle] = useState("");

  const handleAddChat = () => {
    const title = newChatTitle.trim();
    if (!title) return; // ignore empty input
    onNewChat(title);    // call parent handler
    setNewChatTitle(""); // clear input
  };

  const handleEnterKey = (e) => {
    if (e.key === "Enter") handleAddChat();
  };

  return (
    <aside className={"chat-sidebar " + (open ? 'open' : '')} aria-label="Previous chats">
      
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h2>
          <MessageSquare size={18} /> Chats
        </h2>
      </div>

      {/* New Chat Input */}
      <div className="new-chat-input">
        <input
          type="text"
          value={newChatTitle}
          onChange={(e) => setNewChatTitle(e.target.value)}
          onKeyDown={handleEnterKey}
          placeholder="Enter chat title..."
        />
        <button className="small-btn" onClick={handleAddChat}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Chat List */}
      <nav className="chat-list" aria-live="polite">
        {chats.map((c) => (
          <div key={c._id} className={"chat-list-row " + (c._id === activeChatId ? "active" : "")}>
            <button
              className={"chat-list-item " + (c._id === activeChatId ? "active" : "")}
              onClick={() => onSelectChat(c._id)}
              aria-current={c._id === activeChatId ? "true" : "false"}
            >
              <span className="title-line">{c.title || "Untitled Chat"}</span>
              {c.lastMessage && (
                <span className="meta-line">
                  {c.lastMessage.length > 30 ? c.lastMessage.slice(0,30) + "..." : c.lastMessage}
                </span>
              )}
            </button>
            <button className="chat-delete-btn" title="Delete chat" onClick={() => onDeleteChat && onDeleteChat(c._id)}>
              <Trash size={14} />
            </button>
          </div>
        ))}

        {/* Empty State */}
        {chats.length === 0 && (
          <p className="empty-hint">
            💬 No chats yet. <br /> Start a new conversation!
          </p>
        )}
      </nav>

      {/* User panel */}
      <div className="sidebar-user">
        <div className="user-info">
          <div className="avatar">SS</div>
          <div className="user-meta">
            <div className="user-name">Shashwat Shukla</div>
            <div className="user-plan">Free</div>
          </div>
        </div>
        <div className="user-actions">
          <button className="logout-btn" onClick={() => onLogout && onLogout()}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ChatSidebar;
