import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Toast } from './components/Toast';

export const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'catalog' | 'my-bookings' | 'admin'>('catalog');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
        Loading Office Link...
      </div>
    );
  }

  // If user is not authenticated, show simple Login Screen
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {currentTab === 'catalog' && <CatalogPage onNotify={showNotification} />}
        {currentTab === 'my-bookings' && <MyBookingsPage onNotify={showNotification} />}
        {currentTab === 'admin' && <AdminDashboardPage onNotify={showNotification} />}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Office Link — Resource Reservation System (KPIT Technologies)
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
