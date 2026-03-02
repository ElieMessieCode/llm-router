"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import styles from '@/styles/theme.module.css';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/session')
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  const login = async (code: string) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (res.ok) {
        setIsAuthenticated(true);
        setIsSubmitting(false);
        return true;
      } else {
        setErrorMsg('Invalid access code');
        setIsSubmitting(false);
        return false;
      }
    } catch {
      setErrorMsg('Network error');
      setIsSubmitting(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' });
    } finally {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '320px', padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, textAlign: 'center', margin: 0 }}>LLM Router</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="password"
              placeholder="Access Code"
              className={styles.input}
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  login(passcode);
                }
              }}
              autoFocus
            />
            {errorMsg && <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center' }}>{errorMsg}</div>}
            <button
              className={styles.buttonPrimary}
              disabled={isSubmitting || !passcode}
              onClick={() => login(passcode)}
            >
              {isSubmitting ? 'Authenticating...' : 'Enter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
