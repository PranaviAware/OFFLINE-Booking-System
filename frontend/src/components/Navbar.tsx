import React from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: 'catalog' | 'my-bookings' | 'admin';
  setCurrentTab: (tab: 'catalog' | 'my-bookings' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand */}
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setCurrentTab('catalog')}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-kpit-green"></span>
              <span className="text-xl font-bold text-kpit-purple tracking-tight">Office Link</span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setCurrentTab('catalog')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'catalog'
                    ? 'bg-kpit-greenLight text-kpit-green font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Catalog
              </button>

              <button
                onClick={() => setCurrentTab('my-bookings')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentTab === 'my-bookings'
                    ? 'bg-kpit-greenLight text-kpit-green font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Bookings
              </button>

              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => setCurrentTab('admin')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    currentTab === 'admin'
                      ? 'bg-kpit-purpleLight text-kpit-purple font-semibold'
                      : 'text-slate-600 hover:text-kpit-purple'
                  }`}
                >
                  Admin Dashboard
                </button>
              )}
            </nav>
          </div>

          {/* User Status & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-800">{user?.name}</div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                user?.role === 'ADMIN'
                  ? 'bg-purple-100 text-kpit-purple'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
