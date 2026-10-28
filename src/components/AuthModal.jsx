import React, { useState } from 'react';
import { X, User, Mail, Lock, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { signInUser, signUpUser, signOutCurrentUser, isFirebaseConfigured } from '../services/firebase.js';

export function AuthModal({ isOpen, onClose, user, onUserChange }) {
  if (!isOpen) return null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUpUser(email, password, displayName);
        onUserChange(res.user);
      } else {
        const res = await signInUser(email, password);
        onUserChange(res.user);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutCurrentUser();
    onUserChange(null);
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="auth-modal-title" className="modal-title">
            {user ? 'User Profile' : (isSignUp ? 'Create ShortFundly Account' : 'Sign In')}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {user ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 20
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.2rem',
                fontWeight: 700
              }}>
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user.displayName || 'Assistant User'}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</p>
                <span style={{ fontSize: '0.75rem', color: isFirebaseConfigured ? 'var(--success)' : 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {isFirebaseConfigured ? '● Cloud Firestore Sync Active' : '● Offline Profile Mode'}
                </span>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ background: 'var(--border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {!isFirebaseConfigured && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid var(--warning)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                marginBottom: 16,
                display: 'flex',
                gap: 8
              }}>
                <AlertCircle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
                <span>
                  Firebase config not detected in .env.local yet. Signing in will use secure local profile mode until Firebase keys are added.
                </span>
              </div>
            )}

            {error && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: 14
              }}>
                {error}
              </div>
            )}

            {isSignUp && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="name@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ marginTop: 8 }}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
