import React from 'react';
import { 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  Globe, 
  User, 
  Settings, 
  Eye, 
  Sparkles,
  Volume2
} from 'lucide-react';

export function Header({ 
  mode, 
  onToggleMode, 
  theme, 
  onToggleTheme, 
  language, 
  onChangeLanguage, 
  user, 
  onOpenAuth, 
  onOpenSettings,
  isSpeaking,
  onStopSpeaking,
  highContrast,
  onToggleHighContrast
}) {
  return (
    <header className="app-header" role="banner">
      <div className="brand-section">
        <img 
          src="/logo.png" 
          alt="ShortFundly Logo" 
          className="brand-logo" 
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <h1 className="brand-title">
            ShortFundly <span className="brand-badge">Voice AI</span>
          </h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Speaking indicator / Stop audio */}
        {isSpeaking && (
          <button 
            className="pill-btn active"
            onClick={onStopSpeaking}
            title="Stop Assistant Voice"
            aria-label="Stop Assistant Voice"
          >
            <Volume2 size={16} className="animate-spin" />
            <span>Speaking (Stop)</span>
          </button>
        )}

        {/* Mode Toggle: Online vs Offline */}
        <button 
          className={`pill-btn ${mode === 'offline' ? 'offline-mode' : 'active'}`}
          onClick={onToggleMode}
          title={mode === 'offline' ? 'Current: Offline Mode (Local Commands & Sherpa-ONNX)' : 'Current: Online Mode (HF & Gemini Grounding)'}
          aria-label={`Toggle between online and offline mode. Current mode is ${mode}`}
        >
          {mode === 'offline' ? <WifiOff size={15} /> : <Wifi size={15} />}
          <span>{mode === 'offline' ? 'Offline' : 'Online'}</span>
        </button>

        {/* Language Selector */}
        <div style={{ position: 'relative' }}>
          <select 
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value)}
            className="pill-btn"
            style={{ appearance: 'none', paddingRight: '26px' }}
            aria-label="Select conversation language"
          >
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="tanglish">Tanglish</option>
          </select>
          <Globe size={13} style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none' }} />
        </div>

        {/* Accessibility High Contrast Toggle */}
        <button 
          className={`icon-btn ${highContrast ? 'active' : ''}`}
          onClick={onToggleHighContrast}
          title={highContrast ? 'High Contrast Active' : 'Enable High Contrast'}
          aria-label="Toggle High Contrast Mode for Visually Impaired Users"
        >
          <Eye size={18} />
        </button>

        {/* Light / Dark Theme */}
        <button 
          className="icon-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Settings */}
        <button 
          className="icon-btn"
          onClick={onOpenSettings}
          title="Settings and API Configuration"
          aria-label="Settings and API Configuration"
        >
          <Settings size={18} />
        </button>

        {/* Profile / Auth Button */}
        <button 
          className="pill-btn"
          onClick={onOpenAuth}
          title={user ? `Signed in as ${user.displayName || user.email}` : "Sign In or Sync with Firebase"}
          aria-label={user ? `User profile for ${user.displayName || user.email}` : "Sign in"}
        >
          <User size={15} />
          <span>{user ? (user.displayName || user.email?.split('@')[0]) : 'Sign In'}</span>
        </button>
      </div>
    </header>
  );
}
