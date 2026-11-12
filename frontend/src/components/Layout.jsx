import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  MessageSquare,
  LogOut,
  ChevronRight,
  ClipboardList,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const menu = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Base de Connaissance', path: '/knowledge', icon: Database },
    { name: 'Conversations', path: '/conversations', icon: MessageSquare },
    { name: 'Pré-inscriptions', path: '/preinscriptions', icon: ClipboardList },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#111315] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* ── Sidebar Pro ─────────────────────────────────── */}
      <aside className="w-64 fixed h-full flex flex-col p-5 z-20 bg-white dark:bg-[#16181b] border-r border-slate-200/80 dark:border-slate-800/80">
        
        {/* Logo & Titre Institutionnel */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
            <img
              src="/Logo.png"
              alt="ISETAG"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white leading-none tracking-tight">
              ISETAG
            </h2>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
              Portail Administratif
            </p>
          </div>
        </div>

        {/* Navigation Pro */}
        <nav className="flex-1 space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EAE74A]/20 dark:bg-[#EAE74A]/10 text-slate-900 dark:text-[#EAE74A] border border-[#EAE74A]/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-slate-900 dark:text-[#EAE74A]' : 'text-slate-400'} />
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar : Switch Thème + Profil Admin + Déconnexion */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          
          {/* Bouton Dark / Light Mode */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-500" />}
              <span>{theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">{theme}</span>
          </button>

          {/* Profil */}
          {user?.email && (
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.email}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connecté
                </p>
              </div>
              <button
                onClick={() => logout('manual')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Se déconnecter"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="ml-64 flex-1 min-h-screen p-8 bg-slate-50 dark:bg-[#111315]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
