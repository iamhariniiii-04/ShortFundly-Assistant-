import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Server, Sliders, Volume2, Shield } from 'lucide-react';
import { api } from '../services/api.js';

export function SettingsModal({ 
  isOpen, 
  onClose, 
  speechSpeed, 
  onChangeSpeechSpeed,
  language,
  onChangeLanguage,
  largeText,
  onToggleLargeText
}) {
  if (!isOpen) return null;

  const [backendUrl, setBackendUrl] = useState(api.getBaseUrl());
  const [healthData, setHealthData] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const checkBackend = async () => {
    setChecking(true);
    try {
      const data = await api.checkHealth();
      setHealthData(data);
    } catch {
      setHealthData(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  const handleSaveUrl = (e) => {
    e.preventDefault();
    api.setBaseUrl(backendUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    checkBackend();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="modal-card" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2 id="settings-modal-title" className="modal-title">Settings & Configuration</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        {/* Backend & API Health Status */}
        <div style={{
          padding: '14px',
          background: 'var(--bg-surface-elevated)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 18,
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Server size={15} /> Backend API Services
            </span>
            <button 
              className="speech-btn" 
              onClick={checkBackend}
              disabled={checking}
            >
              {checking ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {healthData?.services?.huggingface?.configured ? (
                <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              ) : (
                <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
              )}
              <span>Hugging Face: {healthData?.services?.huggingface?.configured ? 'Active' : 'Missing Key'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {healthData?.services?.gemini_search?.configured ? (
                <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              ) : (
                <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
              )}
              <span>Gemini Grounding: {healthData?.services?.gemini_search?.configured ? 'Active' : 'Missing Key'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {healthData?.services?.openweather?.configured ? (
                <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              ) : (
                <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
              )}
              <span>OpenWeather: {healthData?.services?.openweather?.configured ? 'Active' : 'Missing Key'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              <span>sherpa-onnx: v{healthData?.services?.sherpa_onnx?.version || '2.0.1'}</span>
            </div>
          </div>
        </div>

        {/* Speech Speed */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Voice Speech Speed</span>
            <span>{speechSpeed.toFixed(2)}x</span>
          </label>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={speechSpeed}
            onChange={(e) => onChangeSpeechSpeed(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)' }}
            aria-label="Speech playback rate slider"
          />
        </div>

        {/* Accessibility Large Text */}
        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div>
            <span className="form-label">Large Text Mode</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High readability text size for visually impaired users</p>
          </div>
          <button 
            type="button" 
            className={`pill-btn ${largeText ? 'active' : ''}`}
            onClick={onToggleLargeText}
          >
            {largeText ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Backend URL setting */}
        <form onSubmit={handleSaveUrl} style={{ marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">Flask Backend URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
                placeholder="http://localhost:5000"
              />
              <button type="submit" className="pill-btn active">
                Save
              </button>
            </div>
            {saveSuccess && (
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4 }}>
                Backend URL updated successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
