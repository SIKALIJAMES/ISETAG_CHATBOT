import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LOCK_STORAGE_KEY = 'isetag_lock_until';

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason');

  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);

  // Lockout countdown timer
  const [lockedUntil, setLockedUntil] = useState(() => {
    const stored = sessionStorage.getItem(LOCK_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Check lockout on mount and tick countdown
  useEffect(() => {
    if (!lockedUntil) return;

    const tick = () => {
      const now = Date.now();
      if (now >= lockedUntil) {
        setLockedUntil(null);
        setSecondsLeft(0);
        sessionStorage.removeItem(LOCK_STORAGE_KEY);
        setError('');
      } else {
        setSecondsLeft(Math.ceil((lockedUntil - now) / 1000));
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      sessionStorage.removeItem(LOCK_STORAGE_KEY);
      navigate('/', { replace: true });
    } catch (err) {
      const res = err.response;
      const data = res?.data;

      if (res?.status === 429 || data?.isLocked) {
        // Locked out by anti-brute force
        const retrySec = data?.retryAfterSeconds || 15 * 60;
        const lockTime = data?.lockedUntil || Date.now() + retrySec * 1000;
        setLockedUntil(lockTime);
        setSecondsLeft(retrySec);
        sessionStorage.setItem(LOCK_STORAGE_KEY, String(lockTime));
        setRemainingAttempts(0);
        setError(data?.error || 'Compte temporairement verrouillé pour des raisons de sécurité.');
      } else if (res?.status === 401) {
        const remaining = data?.remainingAttempts;
        setRemainingAttempts(remaining ?? null);
        setError(
          data?.error ||
            'Adresse e-mail ou mot de passe incorrect.'
        );
      } else {
        setError(data?.error || 'Erreur de connexion. Vérifiez votre connexion internet.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const isFormDisabled = loading || (lockedUntil && Date.now() < lockedUntil);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--isetag-black)' }}
    >
      {/* Ambient background glows */}
      <div
        className="absolute top-[-140px] left-[-100px] w-[460px] h-[460px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'var(--isetag-yellow)' }}
      />
      <div
        className="absolute bottom-[-120px] right-[-80px] w-[400px] h-[400px] rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'var(--isetag-green)' }}
      />

      {/* Main Login Card */}
      <div className="glass w-full max-w-md rounded-3xl p-8 sm:p-10 animate-fade-up relative z-10 border border-white/10 shadow-2xl">
        {/* Logo + branding */}
        <header className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl p-1"
              style={{ background: 'linear-gradient(135deg, var(--isetag-yellow), var(--isetag-green))' }}
            >
              <img
                src="/Logo.png"
                alt="ISETAG"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <span className="text-isetag-black font-black text-2xl hidden items-center justify-center w-full h-full">
                IS
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-brand mb-1 tracking-tight">ISETAG</h1>
          <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Espace Administration Sécurisé
          </p>
        </header>

        {/* Reason Banners (Idle timeout, session expired, manual lock) */}
        {reason === 'idle' && (
          <div className="mb-5 p-3.5 rounded-2xl text-xs flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 text-amber-300">
            <Clock size={18} className="flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-bold">Session fermée pour inactivité</p>
              <p className="opacity-80 mt-0.5">
                Après 15 minutes sans interaction, la session a été verrouillée pour protéger les données.
              </p>
            </div>
          </div>
        )}

        {reason === 'expired' && (
          <div className="mb-5 p-3.5 rounded-2xl text-xs flex items-start gap-3 bg-red-500/10 border border-red-500/25 text-red-300">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-bold">Session expirée</p>
              <p className="opacity-80 mt-0.5">Veuillez vous reconnecter pour poursuivre vos actions.</p>
            </div>
          </div>
        )}

        {reason === 'locked' && (
          <div className="mb-5 p-3.5 rounded-2xl text-xs flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 text-blue-300">
            <Lock size={18} className="flex-shrink-0 mt-0.5 text-blue-400" />
            <div>
              <p className="font-bold">Écran verrouillé</p>
              <p className="opacity-80 mt-0.5">Entrez votre mot de passe pour reprendre votre session.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            />
            <input
              id="login-email"
              type="email"
              placeholder="Adresse e-mail"
              className="input-dark pl-11"
              value={email}
              disabled={isFormDisabled}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            />
            <input
              id="login-password"
              type={showPwd ? 'text' : 'password'}
              placeholder="Mot de passe"
              className="input-dark pl-11 pr-12"
              value={password}
              disabled={isFormDisabled}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              disabled={isFormDisabled}
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80 disabled:opacity-30"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error & Remaining Attempts Warning */}
          {error && (
            <div
              className="px-4 py-3 rounded-2xl text-xs font-medium space-y-1"
              style={{
                background: 'rgba(248,113,113,0.12)',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.25)',
              }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className="text-[11px] text-amber-300 pl-6">
                  ⚠️ Il vous reste{' '}
                  <strong className="underline">{remainingAttempts}</strong> tentative(s) avant verrouillage temporaire de 15 minutes.
                </p>
              )}
            </div>
          )}

          {/* Lockout Active Banner */}
          {lockedUntil && Date.now() < lockedUntil && (
            <div
              className="px-4 py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <span className="flex items-center gap-2">
                <Lock size={15} className="animate-bounce" />
                Sécurité anti-brute force
              </span>
              <span className="font-mono text-white bg-red-500/30 px-2 py-0.5 rounded-lg border border-red-500/40">
                {formatCountdown(secondsLeft)}
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={isFormDisabled}
            className="btn-yellow w-full py-3.5 text-base flex items-center justify-center gap-3 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-isetag-black/30 border-t-isetag-black rounded-full animate-spin" />
                Vérification...
              </span>
            ) : lockedUntil && Date.now() < lockedUntil ? (
              <span className="flex items-center gap-2">
                <Lock size={18} />
                Verrouillé ({formatCountdown(secondsLeft)})
              </span>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Security Badges */}
        <div className="mt-8 pt-5 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-white/40">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
            <span>Anti-brute force</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-amber-400 flex-shrink-0" />
            <span>Déconnexion 15 min</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          ISETAG © 2026 — Plateforme d'Administration
        </p>
      </div>
    </div>
  );
};

export default Login;
