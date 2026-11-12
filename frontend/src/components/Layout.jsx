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
    { name: 'Base documentaire', path: '/knowledge', icon: Database },
    { name: 'Conversations', path: '/conversations', icon: MessageSquare },
    { name: 'Pré-inscriptions', path: '/preinscriptions', icon: ClipboardList },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 transition-colors duration-150">
      
      {/* ── Sidebar Gauche ──────────────────────────────── */}
      <aside className="w-64 fixed h-full flex flex-col p-4 z-20 bg-white dark:bg-[#101319] border-r border-slate-200 dark:border-slate-800">
        
        {/* Identité Institutionnelle */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-100 dark:border-slate-800/60 pb-5">
          <div className="w-10 h-10 rounded-lg p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-xs">
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
            <h1 className="font-bold text-base text-slate-900 dark:text-white leading-tight tracking-tight">
              ISETAG
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Espace Administratif
            </p>
          </div>
        </div>

        {/* Menu Principal */}
        <nav className="flex-1 space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <item.icon
                  size={16}
                  className={isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}
                />
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight size={13} className="opacity-60 text-emerald-700 dark:text-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bas de Sidebar */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
          
          {/* Switch Mode Sombre / Clair */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-500" />}
              <span>{theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Profil Utilisateur Connecté */}
          {user?.email && (
            <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Connecté
                </p>
              </div>
              <button
                onClick={() => logout('manual')}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Se déconnecter"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Contenu Principal ───────────────────────────── */}
      <main className="ml-64 flex-1 min-h-screen p-8 bg-slate-50 dark:bg-[#0B0E14]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;