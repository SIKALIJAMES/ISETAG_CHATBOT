import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, MessageSquare, LogOut, ChevronRight } from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  const menu = [
    { name: 'Tableau de bord', path: '/',              icon: LayoutDashboard, desc: 'Statistiques globales' },
    { name: 'Base de Connaissance', path: '/knowledge',      icon: Database,        desc: 'Documents & FAQ' },
    { name: 'Conversations',  path: '/conversations',  icon: MessageSquare,   desc: 'Discussions live' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--isetag-black)' }}>

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside
        className="w-72 fixed h-full flex flex-col p-6 z-20"
        style={{ background: 'var(--isetag-dark)', borderRight: '1px solid var(--isetag-border)' }}
      >
        {/* Branding */}
        <div className="flex items-center gap-3 px-3 mb-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--isetag-yellow), var(--isetag-green))' }}
          >
            <img
              src="/Logo.png"
              alt="ISETAG"
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span className="hidden text-isetag-black font-black text-lg">IS</span>
          </div>
          <div>
            <h2 className="font-black text-xl text-brand leading-none">ISETAG</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Admin Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  isActive ? 'nav-active' : 'hover:bg-white/5 text-white/50'
                }`}
              >
                <item.icon
                  size={20}
                  style={{ color: isActive ? 'var(--isetag-yellow)' : undefined }}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? '' : 'group-hover:text-white/80'}`}
                     style={{ color: isActive ? 'var(--isetag-yellow)' : undefined }}>
                    {item.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {item.desc}
                  </p>
                </div>
                {isActive && <ChevronRight size={14} style={{ color: 'var(--isetag-yellow)' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-4" style={{ borderTop: '1px solid var(--isetag-border)' }} />

        {/* Status indicator */}
        <div className="px-4 py-3 rounded-2xl mb-4 flex items-center gap-3"
          style={{ background: 'rgba(93,203,106,0.08)', border: '1px solid rgba(93,203,106,0.2)' }}>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: 'var(--isetag-green)' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--isetag-green)' }}>Chatbot en ligne</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Railway — Production</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full text-left transition-all hover:bg-red-500/10 group"
          style={{ color: 'rgba(248,113,113,0.6)' }}
        >
          <LogOut size={20} />
          <span className="text-sm font-semibold group-hover:text-red-400 transition-colors">Déconnexion</span>
        </button>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="ml-72 flex-1 min-h-screen" style={{ background: 'var(--isetag-black)' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
