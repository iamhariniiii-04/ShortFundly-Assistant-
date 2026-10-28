import React, { useState } from 'react';
import { Mic, MicOff, Send, Compass, Trash2 } from 'lucide-react';

export function ControlsBar({ 
  isListening, 
  onToggleMic, 
  onSendMessage, 
  useSearch, 
  onToggleSearch, 
  onClearHistory,
  mode
}) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="controls-bar" role="toolbar" aria-label="Voice and message controls">
      {/* Clear conversation */}
      <button
        className="icon-btn"
        onClick={onClearHistory}
        title="Clear conversation history"
        aria-label="Clear conversation history"
      >
        <Trash2 size={18} />
      </button>

      {/* Live Web Search toggle (Gemini Grounding) */}
      {mode !== 'offline' && (
        <button
          className={`pill-btn ${useSearch ? 'active' : ''}`}
          onClick={onToggleSearch}
          title={useSearch ? "Live Web Search Active (Gemini Grounding)" : "Enable Live Web Search"}
          aria-pressed={useSearch}
          aria-label="Toggle Google Search Grounding"
        >
          <Compass size={16} />
          <span>Search</span>
        </button>
      )}

      {/* Text input form */}
      <form onSubmit={handleSubmit} className="text-input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isListening ? "Listening..." : "Type or tap the microphone to speak..."}
          className="chat-input"
          aria-label="Message input"
        />
        {inputText.trim() && (
          <button
            type="submit"
            className="icon-btn"
            style={{ position: 'absolute', right: '6px', top: '6px' }}
            title="Send message"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </form>

      {/* Main Microphone Button */}
      <button
        type="button"
        className={`mic-btn ${isListening ? 'listening' : ''}`}
        onClick={onToggleMic}
        title={isListening ? "Stop listening" : "Start speaking"}
        aria-label={isListening ? "Stop listening" : "Start microphone to speak"}
      >
        {isListening ? <MicOff size={28} /> : <Mic size={28} />}
      </button>
    </div>
  );
}
