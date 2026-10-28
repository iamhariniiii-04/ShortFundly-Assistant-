import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.jsx';
import { VoiceVisualizer } from './components/VoiceVisualizer.jsx';
import { ChatArea } from './components/ChatArea.jsx';
import { ControlsBar } from './components/ControlsBar.jsx';
import { WeatherWidget } from './components/WeatherWidget.jsx';
import { AuthModal } from './components/AuthModal.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';

import { speechManager } from './services/speech.js';
import { api } from './services/api.js';
import { 
  subscribeAuthState, 
  syncMessageToCloud, 
  subscribeToCloudMessages, 
  savePreferences, 
  loadPreferences 
} from './services/firebase.js';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [mode, setMode] = useState('auto'); // 'online', 'offline', 'auto'
  const [useSearch, setUseSearch] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en', 'ta', 'tanglish'
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [theme, setTheme] = useState('dark');
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Apply theme & accessibility attributes to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-high-contrast', highContrast.toString());
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-large-text', largeText.toString());
  }, [largeText]);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribeAuth = subscribeAuthState(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load cloud preferences
        const prefs = await loadPreferences(currentUser.uid);
        if (prefs) {
          if (prefs.language) setLanguage(prefs.language);
          if (prefs.theme) setTheme(prefs.theme);
          if (prefs.speechSpeed) setSpeechSpeed(prefs.speechSpeed);
          if (prefs.highContrast !== undefined) setHighContrast(prefs.highContrast);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Subscribe to Cloud Firestore Messages
  useEffect(() => {
    const unsubscribeMessages = subscribeToCloudMessages(user?.uid, (cloudMsgs) => {
      if (cloudMsgs && cloudMsgs.length > 0) {
        setMessages(cloudMsgs);
      }
    });
    return () => unsubscribeMessages();
  }, [user]);

  // Speech manager callbacks setup
  useEffect(() => {
    speechManager.onStateChange = ({ isListening: listening, isSpeaking: speaking }) => {
      setIsListening(listening);
      setIsSpeaking(speaking);
    };

    speechManager.onTranscript = ({ final, interim }) => {
      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        setInterimTranscript('');
        handleSendMessage(final);
      }
    };

    speechManager.onError = (err) => {
      console.warn("Speech recognition error:", err);
    };
  }, [mode, language, useSearch, messages]);

  // Language update
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    speechManager.setLanguage(newLang);
    if (user?.uid) {
      savePreferences(user.uid, { language: newLang });
    }
  };

  // Send message router
  const handleSendMessage = async (text) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    // User message object
    const userMsg = {
      role: 'user',
      content: cleanText,
      timestamp: new Date().toISOString()
    };

    // Optimistic UI update
    setMessages(prev => [...prev, userMsg]);
    if (user?.uid) {
      syncMessageToCloud(user.uid, userMsg);
    }

    // Call backend API
    const response = await api.sendMessage(cleanText, {
      mode,
      history: messages.slice(-6),
      language,
      useSearch
    });

    const assistantReply = response.reply || response.message || "I didn't quite catch that. Could you please repeat?";
    const assistantMsg = {
      role: 'assistant',
      content: assistantReply,
      provider: response.provider || (mode === 'offline' ? 'Offline Core' : 'ShortFundly AI'),
      sources: response.sources || [],
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, assistantMsg]);
    if (user?.uid) {
      syncMessageToCloud(user.uid, assistantMsg);
    }

    // Speak response aloud automatically
    speechManager.playAudioCue('response');
    speechManager.speak(assistantReply, {
      speed: speechSpeed,
      language,
      preferOffline: mode === 'offline'
    });
  };

  // Keyboard shortcut listener (Accessibility)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If typing in input or modal open, don't trigger spacebar mic
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleMic();
      } else if (e.code === 'Escape') {
        speechManager.stopSpeaking();
        speechManager.stopListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  const handleToggleMic = () => {
    if (isListening) {
      speechManager.stopListening();
    } else {
      speechManager.startListening();
    }
  };

  const handleToggleMode = () => {
    const newMode = mode === 'offline' ? 'online' : 'offline';
    setMode(newMode);
    speechManager.speak(`Switched to ${newMode} mode.`);
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (user?.uid) savePreferences(user.uid, { theme: newTheme });
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear conversation history?")) {
      setMessages([]);
      if (user?.uid) {
        localStorage.removeItem(`shortfundly_msgs_${user.uid}`);
      }
      speechManager.playAudioCue('stop');
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        mode={mode}
        onToggleMode={handleToggleMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        language={language}
        onChangeLanguage={handleLanguageChange}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        isSpeaking={isSpeaking}
        onStopSpeaking={() => speechManager.stopSpeaking()}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
      />

      {/* Main Layout */}
      <div className="main-layout">
        <main className="chat-section">
          {/* Messages */}
          <ChatArea
            messages={messages}
            onSpeakText={(txt) => speechManager.speak(txt, { speed: speechSpeed, language, preferOffline: mode === 'offline' })}
            onSelectPrompt={(prompt) => handleSendMessage(prompt)}
          />

          {/* Voice Wave Visualizer */}
          <VoiceVisualizer
            isListening={isListening}
            isSpeaking={isSpeaking}
            transcript={transcript}
            interimTranscript={interimTranscript}
            mode={mode}
          />

          {/* Controls Bar */}
          <ControlsBar
            isListening={isListening}
            onToggleMic={handleToggleMic}
            onSendMessage={handleSendMessage}
            useSearch={useSearch}
            onToggleSearch={() => setUseSearch(!useSearch)}
            onClearHistory={handleClearHistory}
            mode={mode}
          />
        </main>

        {/* Right Info Sidebar (Weather & Device Status) */}
        <WeatherWidget
          language={language}
          onSpeakText={(txt) => speechManager.speak(txt, { speed: speechSpeed, language })}
        />
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        user={user}
        onUserChange={(u) => setUser(u)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        speechSpeed={speechSpeed}
        onChangeSpeechSpeed={(spd) => {
          setSpeechSpeed(spd);
          if (user?.uid) savePreferences(user.uid, { speechSpeed: spd });
        }}
        language={language}
        onChangeLanguage={handleLanguageChange}
        largeText={largeText}
        onToggleLargeText={() => setLargeText(!largeText)}
      />
    </div>
  );
}
