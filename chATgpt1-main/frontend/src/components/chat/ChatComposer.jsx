import React, { useCallback, useRef, useLayoutEffect, useState, useEffect } from 'react';
import './ChatComposer.css';

// Simple composer without microphone/visualizer or TTS
const ChatComposer = ({ input, setInput, onSend, isSending }) => {
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('speech_lang') || 'en-US');
  // file upload removed: composer will only handle text input

  useEffect(() => {
    localStorage.setItem('speech_lang', lang);
  }, [lang]);

  // Auto-grow textarea height up to max-height
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 320) + 'px';
  }, [input]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) onSend();
    }
  }, [onSend, input]);

  // file handling removed: messages are sent via onSend (text only)

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    try {
      const recog = new SpeechRecognition();
      recog.lang = lang || 'en-US';
      recog.interimResults = true;
      recog.continuous = false;

      recog.onresult = (e) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) final += res[0].transcript;
          else interim += res[0].transcript;
        }
        if (final) setInput(final);
        else if (interim) setInput(interim);
      };

      recog.onend = () => {
        setListening(false);
      };

      recog.onerror = () => {
        setListening(false);
      };

      return recog;
    } catch (e) {
      return null;
    }
  };

  const toggleListen = () => {
    if (listening) {
      try { recognitionRef.current && recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const recog = startRecognition();
    if (!recog) return;
    recognitionRef.current = recog;
    try {
      recog.start();
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  };

  return (
    <form className="composer" onSubmit={e => { e.preventDefault(); if (input.trim()) onSend(); }}>
  <div className="composer-surface" data-state={isSending ? 'sending' : undefined}>
        <div className="composer-field">
          <textarea
            ref={textareaRef}
            className="composer-input"
            placeholder="Message ChatGPT…"
            aria-label="Message"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            spellCheck
            autoComplete="off"
          />
          <div className="composer-hint" aria-hidden="true">Enter ↵ to send • Shift+Enter = newline</div>

          {/* file attachments removed from composer UI */}
        </div>

        {/* language selector (en-US / hi-IN) */}
        <select aria-label="Speech language" value={lang} onChange={e => setLang(e.target.value)} style={{height:32, marginRight:8}}>
          <option value="en-US">English</option>
          <option value="hi-IN">Hindi</option>
        </select>

        {/* mic toggle button */}
        <button
          type="button"
          onClick={toggleListen}
          className="send-btn icon-btn"
          aria-pressed={listening}
          aria-label={listening ? 'Stop listening' : 'Start voice input'}
          style={{marginRight:8}}
        >
          {listening ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v11"/><path d="M19 11a7 7 0 0 1-14 0"/></svg>
          )}
        </button>

  {/* file add removed */}

        <button
          type="submit"
          className="send-btn icon-btn"
          disabled={!input.trim() || isSending}
          aria-label={isSending ? 'Sending' : 'Send message'}
        >
          <span className="send-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>
    </form>
  );
};

export default ChatComposer;