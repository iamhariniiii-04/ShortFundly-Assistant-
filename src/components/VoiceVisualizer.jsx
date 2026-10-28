import React from 'react';
import { Mic, Volume2 } from 'lucide-react';

export function VoiceVisualizer({ isListening, isSpeaking, transcript, interimTranscript, mode }) {
  const isActive = isListening || isSpeaking;

  return (
    <div className="visualizer-container" role="region" aria-label="Voice Interaction Visualizer">
      {/* Transcript feedback box */}
      <div 
        className="transcript-preview" 
        role="status" 
        aria-live="polite"
      >
        {isListening ? (
          <span>
            {interimTranscript || transcript ? (
              `"${interimTranscript || transcript}"`
            ) : (
              <span style={{ color: 'var(--primary)' }}>Listening for your voice... speak now</span>
            )}
          </span>
        ) : isSpeaking ? (
          <span style={{ color: 'var(--secondary)' }}>
            <Volume2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Speaking response...
          </span>
        ) : (
          <span>Tap microphone or press Spacebar to speak</span>
        )}
      </div>

      {/* Waveform Bars */}
      <div className={`wave-bars ${isActive ? 'active' : ''}`} aria-hidden="true">
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
        <span className="wave-bar"></span>
      </div>
    </div>
  );
}
