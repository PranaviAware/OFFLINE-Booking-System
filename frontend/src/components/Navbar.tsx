import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Calendar, ShieldCheck, UserCheck, Layers } from 'lucide-react';

interface NavbarProps {
  currentTab: 'catalog' | 'my-bookings' | 'admin';
  setCurrentTab: (tab: 'catalog' | 'my-bookings' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, loginAs } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('catalog')}>
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Office<span className="text-teal-600">Link</span></span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Hybrid Workspace</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentTab('catalog')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'catalog'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Resource Catalog</span>
            </button>

            <button
              onClick={() => setCurrentTab('my-bookings')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'my-bookings'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>My Bookings</span>
            </button>

            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'admin'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                  : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Admin Console</span>
              {user?.role === 'ADMIN' && (
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
              )}
            </button>
          </nav>

          {/* User Persona & Role Simulator for RBAC */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                {user?.name || 'Loading...'}
              </span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold px-2 text-slate-500 uppercase tracking-wider hidden md:inline">
                Role:
              </span>
              <button
                onClick={() => loginAs('user1')}
                title="Switch to Bob Employee (Standard User)"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  user?.id === 'usr_bob_user'
                    ? 'bg-white text-emerald-700 shadow-sm font-bold border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                User (Bob)
              </button>

              <button
                onClick={() => loginAs('user2')}
                title="Switch to Charlie Employee (Standard User)"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  user?.id === 'usr_charlie_user'
                    ? 'bg-white text-emerald-700 shadow-sm font-bold border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                User (Charlie)
              </button>

              <button
                onClick={() => loginAs('admin')}
                title="Switch to Alice Admin (Full Admin Privileges)"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  user?.role === 'ADMIN'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-purple-700 hover:bg-purple-100/50'
                }`}
              >
                Admin (Alice)
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
