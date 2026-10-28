import React, { useEffect, useRef } from 'react';
import { Volume2, ExternalLink, Bot, User, CloudSun, Compass, ShieldCheck } from 'lucide-react';

export function ChatArea({ messages, onSpeakText, onSelectPrompt }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const promptSuggestions = [
    { label: "Weather in Chennai", prompt: "What is the weather in Chennai?" },
    { label: "Search Latest News", prompt: "Search latest news about Indian cinema" },
    { label: "Offline Calculation", prompt: "Calculate 15 percent of 4500" },
    { label: "Current Time & Date", prompt: "What time and date is it?" },
    { label: "Tamil/Tanglish", prompt: "Innaiku weather eppadi irukku?" }
  ];

  return (
    <div className="messages-list" role="log" aria-label="Conversation Messages">
      {messages.length === 0 ? (
        <div style={{ textAlign: 'center', margin: 'auto', padding: '40px 20px', maxWidth: 480 }}>
          <Bot size={48} style={{ color: 'var(--primary)', marginBottom: 12 }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: 8, fontWeight: 700 }}>Welcome to ShortFundly AI</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: 24 }}>
            Your accessible voice assistant. Tap the big microphone to talk or try one of these voice commands:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {promptSuggestions.map((item, idx) => (
              <button
                key={idx}
                className="pill-btn"
                onClick={() => onSelectPrompt(item.prompt)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={msg.id || index} 
              className={`message-row ${isUser ? 'user' : 'assistant'}`}
              role="article"
            >
              <div className="message-meta">
                {isUser ? (
                  <>
                    <span>You</span>
                    <User size={13} />
                  </>
                ) : (
                  <>
                    <Bot size={13} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600 }}>ShortFundly Assistant</span>
                    {msg.provider && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '1px 6px', 
                        borderRadius: 4, 
                        background: 'var(--border)', 
                        color: 'var(--text-muted)' 
                      }}>
                        {msg.provider}
                      </span>
                    )}
                  </>
                )}
                {msg.timestamp && (
                  <time style={{ marginLeft: 6 }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                )}
              </div>

              <div className="bubble">
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                {/* Search Grounding Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources-card">
                    <h4>Web Sources (Gemini Search Grounding)</h4>
                    <div className="sources-list">
                      {msg.sources.map((src, sIdx) => (
                        <a 
                          key={sIdx} 
                          href={src.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="source-item"
                        >
                          <ExternalLink size={12} />
                          <span>{src.title || src.uri}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Speak message aloud button */}
                {!isUser && (
                  <div className="bubble-actions">
                    <button
                      className="speech-btn"
                      onClick={() => onSpeakText(msg.content)}
                      aria-label="Read this message aloud"
                      title="Read aloud"
                    >
                      <Volume2 size={14} />
                      <span>Listen</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
