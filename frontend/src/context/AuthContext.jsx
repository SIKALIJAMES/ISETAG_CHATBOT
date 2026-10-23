import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getToken,
  setToken,
  clearToken,
  recordActivity,
  getLastActivity,
  isSessionExpired,
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  authAPI,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !isSessionExpired());
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [warningSeconds, setWarningSeconds] = useState(60);

  const warningTimerRef = useRef(null);

  // Logout handler
  const logout = useCallback((reason = null) => {
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
    setShowWarning(false);
    if (reason) {
      window.location.href = `/login?reason=${reason}`;
    } else {
      window.location.href = '/login';
    }
  }, []);

  // Lock session immediately
  const lockSession = useCallback(() => {
    logout('locked');
  }, [logout]);

  // Extend / keep session active
  const extendSession = useCallback(() => {
    recordActivity();
    setShowWarning(false);
    setWarningSeconds(60);
  }, []);

  // Verify token on mount if authenticated
  useEffect(() => {
    const token = getToken();
    if (!token || isSessionExpired()) {
      clearToken();
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    authAPI
      .verify()
      .then((res) => {
        setUser(res.data.user);
        setIsAuthenticated(true);
        recordActivity();
      })
      .catch(() => {
        clearToken();
        setIsAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // ─────────────────────────────────────────────
  // Inactivity & Tab Visibility Watcher
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset activity on any user interaction
    const handleUserActivity = () => {
      // If warning modal is not active, record activity quietly
      if (!showWarning) {
        recordActivity();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Heartbeat check every 2 seconds
    const interval = setInterval(() => {
      const token = getToken();
      if (!token) {
        logout();
        return;
      }

      const elapsed = Date.now() - getLastActivity();

      // Expired!
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        logout('idle');
        return;
      }

      // Warning threshold reached (last 60 seconds)
      if (elapsed >= INACTIVITY_WARNING_MS) {
        const remainingSec = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setShowWarning(true);
        setWarningSeconds(remainingSec);
      } else {
        if (showWarning) setShowWarning(false);
      }
    }, 2000);

    // Visibility change handler: user leaves tab or closes laptop
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - getLastActivity();
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          logout('idle');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [isAuthenticated, showWarning, logout]);

  // Login action
  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token, user: userData } = res.data;
    setToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    recordActivity();
    return userData;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        lockSession,
        extendSession,
      }}
    >
      {children}

      {/* Inactivity Warning Modal */}
      {showWarning && isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-8 text-center border shadow-2xl relative animate-scale-up"
            style={{
              background: 'var(--isetag-dark)',
              borderColor: 'rgba(245,158,11,0.4)',
              boxShadow: '0 25px 50px -12px rgba(245,158,11,0.25)',
            }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-amber-500/20 text-amber-400 text-3xl font-black">
              ⏳
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Session inactive</h3>
            <p className="text-sm text-white/70 mb-6 leading-relaxed">
              Pour des raisons de sécurité et de protection des données étudiantes, votre session sera verrouillée dans{' '}
              <span className="font-extrabold text-amber-400 text-base">{warningSeconds}s</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => logout('manual')}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                Déconnecter
              </button>
              <button
                onClick={extendSession}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-amber-400 text-black hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20"
              >
                Rester connecté
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
