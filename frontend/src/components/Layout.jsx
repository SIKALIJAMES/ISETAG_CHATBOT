import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, MessageSquare, LogOut } from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  const menu = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Knowledge', path: '/knowledge', icon: Database },
    { name: 'Conversations', path: '/conversations', icon: MessageSquare },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-slate-200 p-6 flex flex-col fixed h-full">
        <h2 className="text-2xl font-black text-blue-600 mb-10 px-4">ISETAG V2</h2>
        
        <nav className="flex-1 space-y-2">
          {menu.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 p-4 rounded-xl font-medium transition-all ${
                location.pathname === item.path 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 p-4 rounded-xl text-red-500 font-medium hover:bg-red-50 transition-all"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
