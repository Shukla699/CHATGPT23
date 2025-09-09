
import React, { useEffect, useRef, useState } from 'react';
import './ChatMessages.css';


const ChatMessages = ({ messages, isSending, onDeleteMessage }) => {
  const bottomRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isSending]);

  // Clear selection when clicking outside a message
  useEffect(() => {
    const onDocClick = (e) => {
      // if click is outside any .msg element, clear selection
      if (!e.target.closest || !e.target.closest('.msg')) {
        setSelectedMessage(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  return (
    <div className="messages" aria-live="polite">
      {messages.map((m,index) => (
        <div
          key={m._id || index}
          className={`msg msg-${m.type} ${selectedMessage === m._id ? 'selected' : ''}`}
          onClick={(e) => { e.stopPropagation(); setSelectedMessage(prev => prev === m._id ? null : m._id); }}
        >
          <div className="msg-role" aria-hidden="true">{m.type === 'user' ? 'You' : 'AI'}</div>
          <div className="msg-bubble">
            {m.content}

            {/* attachments rendering */}
            {m.attachments && m.attachments.length > 0 && (
              <div className="msg-attachments" style={{marginTop:8, display:'flex',flexDirection:'column',gap:8}}>
                {m.attachments.map((a, i) => (
                  <div key={i} className="attachment" style={{display:'flex',alignItems:'center',gap:12,padding:8,background:'#0f0f10',border:'1px solid #222',borderRadius:8}}>
                    {/^image\//.test(a.type) ? (
                      <a href={a.data} target="_blank" rel="noreferrer" style={{display:'inline-block'}}>
                        <img src={a.data} alt={a.name} style={{width:96,height:64,objectFit:'cover',borderRadius:6}} />
                      </a>
                    ) : /^video\//.test(a.type) ? (
                      <a href={a.data} target="_blank" rel="noreferrer" style={{display:'inline-block'}}>
                        <video src={a.data} style={{width:160,height:96,objectFit:'cover',borderRadius:6}} controls={false} />
                      </a>
                    ) : (
                      <div style={{width:56,height:56,display:'grid',placeItems:'center',background:'#0b0b0b',borderRadius:6}}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                      </div>
                    )}

                    <div style={{display:'flex',flexDirection:'column',flex:1}}>
                      <div style={{fontSize:13}}>{a.name}</div>
                      <div style={{fontSize:12,color:'#9a9a9a'}}>{Math.round(a.size/1024)} KB • {a.type}</div>
                    </div>

                    <div style={{display:'flex',gap:8}}>
                      <a href={a.data} download={a.name} target="_blank" rel="noreferrer" style={{color:'#cfcfcf'}}>Open</a>
                      <a href={a.data} download={a.name} style={{color:'#9a9a9a'}}>Download</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="msg-actions" role="group" aria-label="Message actions">
            <button type="button" aria-label="Copy message" onClick={() => navigator.clipboard.writeText(m.content)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
            {m.role === 'ai' && (
              <>
                <button type="button" aria-label="Like response">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 10v11" /><path d="M15 21H9a2 2 0 0 1-2-2v-9l5-7 1 1a2 2 0 0 1 .5 1.3V9h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2Z" /></svg>
                </button>
                <button type="button" aria-label="Dislike response">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 14V3" /><path d="M9 3h6a2 2 0 0 1 2 2v9l-5 7-1-1a2 2 0 0 1-.5-1.3V15H5a2 2 0 0 1-2-2l2-8a2 2 0 0 1 2-2Z" /></svg>
                </button>
                {/* Speak button removed to disable text-to-speech */}
                <button type="button" aria-label="Regenerate" onClick={() => { /* placeholder for regenerate logic */ }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12A10 10 0 0 1 12 2c2.5 0 4.8 1 6.5 2.5L22 8" /><path d="M22 2v6h-6" /><path d="M22 12a10 10 0 0 1-10 10c-2.5 0-4.8-1-6.5-2.5L2 16" /><path d="M2 22v-6h6" /></svg>
                </button>
              </>
            )}
              {/* Delete message (show for both user and model messages if handler provided) */}
              {onDeleteMessage && (
                <button type="button" aria-label="Delete message" onClick={() => onDeleteMessage && onDeleteMessage(m._id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
              )}
          </div>
        </div>
      ))}
      {isSending && (
        <div className="msg msg-ai pending">
          <div className="msg-role" aria-hidden="true">AI</div>
          <div className="msg-bubble typing-dots" aria-label="AI is typing">
            <span/><span/><span/>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;
