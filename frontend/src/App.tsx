import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CatalogPage } from './pages/CatalogPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Toast } from './components/Toast';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'catalog' | 'my-bookings' | 'admin'>('catalog');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'catalog' && <CatalogPage onNotify={showNotification} />}
        {currentTab === 'my-bookings' && <MyBookingsPage onNotify={showNotification} />}
        {currentTab === 'admin' && <AdminDashboardPage onNotify={showNotification} />}
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">Office Link Reservation Platform</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Engineered with ACID Concurrency Control, PostgreSQL/SQLite immediate locks, UTC data integrity & OIDC/JWT RBAC.
        </p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
