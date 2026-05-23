import React, { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/';
    } catch {
      setError('Adresse e-mail ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--isetag-black)' }}
    >
      {/* Ambient blobs */}
      <div
        className="absolute top-[-120px] left-[-80px] w-[420px] h-[420px] rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'var(--isetag-yellow)' }}
      />
      <div
        className="absolute bottom-[-100px] right-[-60px] w-[360px] h-[360px] rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'var(--isetag-green)' }}
      />

      {/* Card */}
      <div className="glass w-full max-w-md rounded-3xl p-10 animate-fade-up relative z-10">

        {/* Logo + branding */}
        <header className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl"
              style={{ background: 'linear-gradient(135deg, var(--isetag-yellow), var(--isetag-green))' }}
            >
              {/* If logo.png exists, it will show; otherwise shows initials */}
              <img
                src="/logo.png"
                alt="ISETAG"
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <span
                className="text-isetag-black font-black text-2xl hidden items-center justify-center w-full h-full"
              >
                IS
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-black text-brand mb-1">ISETAG</h1>
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Espace Administration — Chatbot AI
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn-yellow w-full py-4 text-base flex items-center justify-center gap-3 rounded-2xl disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-isetag-black/30 border-t-isetag-black rounded-full animate-spin" />
                Connexion...
              </span>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
          ISETAG © 2025 — Institut Supérieur Évangélique des Technologies Appliquées et de Gestion
        </p>
      </div>
    </div>
  );
};

export default Login;
