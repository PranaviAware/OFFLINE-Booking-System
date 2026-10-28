import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LayoutGrid, CalendarCheck, ShieldCheck, LogOut } from 'lucide-react';

interface NavbarProps {
  currentTab: 'catalog' | 'my-bookings' | 'admin';
  setCurrentTab: (tab: 'catalog' | 'my-bookings' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'catalog' as const, label: 'Catalog', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'my-bookings' as const, label: 'My Bookings', icon: <CalendarCheck className="w-4 h-4" /> },
    ...(user?.role === 'ADMIN'
      ? [{ id: 'admin' as const, label: 'Admin Dashboard', icon: <ShieldCheck className="w-4 h-4" /> }]
      : [])
  ];

  const handleTab = (tab: 'catalog' | 'my-bookings' | 'admin') => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleTab('catalog')}>
              <span className="w-3.5 h-3.5 rounded-full bg-kpit-green" />
              <span className="text-xl font-bold text-kpit-purple tracking-tight">Office Link</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    currentTab === item.id
                      ? item.id === 'admin'
                        ? 'bg-kpit-purpleLight text-kpit-purple font-semibold'
                        : 'bg-kpit-greenLight text-kpit-green font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Desktop Right: user info + logout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-800">{user?.name}</div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                user?.role === 'ADMIN' ? 'bg-purple-100 text-kpit-purple' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 pt-3 pb-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  currentTab === item.id
                    ? 'bg-kpit-greenLight text-kpit-green font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            {/* Mobile user info + logout */}
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">{user?.name}</div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  user?.role === 'ADMIN' ? 'bg-purple-100 text-kpit-purple' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
