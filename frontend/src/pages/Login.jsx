import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      const res = err.response;
      const data = res?.data;
      if (res?.status === 401) {
        setError(data?.error || 'Adresse e-mail ou mot de passe incorrect.');
      } else {
        setError(data?.error || 'Erreur de connexion. Vérifiez vos identifiants.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 transition-colors duration-150 relative">
      
      {/* Bouton de bascule thème en haut à droite */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151921] shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          {theme === 'dark' ? '☀️ Mode Clair' : '🌙 Mode Sombre'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#151921] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        
        {/* En-tête Institutionnel */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <img
              src="/Logo.png"
              alt="ISETAG"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Portail Administratif ISETAG
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestion du chatbot d'orientation et des pré-inscriptions
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-5 p-3 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@isetag.cm"
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101319] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101319] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg font-semibold text-xs text-slate-900 bg-[#E5B80B] hover:bg-[#D4A708] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Connexion en cours...</span>
              </span>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          Institut Supérieur Évangélique des Technologies Appliquées et de Gestion
        </p>
      </div>
    </div>
  );
};

export default Login;