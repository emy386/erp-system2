/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { Inventory } from './components/Inventory';
import { Production } from './components/Production';
import { Staff } from './components/Staff';
import { Accounts } from './components/Accounts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion } from 'motion/react';

type Permission = 'dashboard' | 'orders' | 'inventory' | 'production' | 'staff' | 'accounts';

const ALL_PAGES: { permission: Permission; path: string }[] = [
  { permission: 'dashboard',  path: '/' },
  { permission: 'orders',     path: '/orders' },
  { permission: 'inventory',  path: '/inventory' },
  { permission: 'production', path: '/production' },
  { permission: 'staff',      path: '/staff' },
  { permission: 'accounts',   path: '/accounts' },
];

function getFirstAllowedPath(perms: string[]): string {
  if (perms.includes('all')) return '/';
  for (const page of ALL_PAGES) {
    if (perms.includes(page.permission)) return page.path;
  }
  return '/no-access';
}

const ProtectedRoute: React.FC<{ permission: Permission; children: React.ReactNode }> = ({ permission, children }) => {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role === "owner") return <>{children}</>;
  const perms = currentUser.permissions || [];
  if (perms.includes("all")) return <>{children}</>;
  if (perms.includes(permission)) return <>{children}</>;
  const firstAllowed = getFirstAllowedPath(perms);
  return <Navigate to={firstAllowed} replace />;
};

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

function SyncErrorBanner() {
  const { syncStatus, syncMessage } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect((): void | (() => void) => {
    if (syncStatus === 'error') {
      setVisible(true);
      return;
    }
    if (syncStatus === 'synced') {
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [syncStatus, syncMessage]);

  if (!visible || syncStatus === 'idle' || syncStatus === 'syncing') return null;

  if (syncStatus === 'error') {
    return (
      <div className="fixed bottom-4 left-4 z-50 max-w-sm bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3 text-sm font-bold" dir="rtl">
        <span className="text-base mt-0.5">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="font-black text-red-800 mb-0.5">فشل الحفظ في Supabase</div>
          <div className="text-xs font-medium text-red-600 leading-relaxed break-words">{syncMessage}</div>
        </div>
        <button onClick={() => setVisible(false)} className="text-red-400 hover:text-red-600 mt-0.5 shrink-0">✕</button>
      </div>
    );
  }

  return null;
}

function AppContent() {
  const { currentUser } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If no user is logged in, show the Login/Register screens
  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 flex text-right font-sans selection:bg-blue-100 selection:text-blue-900" dir="rtl">
      
      {/* Slide-over Sidebar drawer navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Sync error banner — bottom-left, auto-dismiss on success */}
      <SyncErrorBanner />

      {/* Main Panel Content Area */}
      {/* On desktop view, lg:mr-64 offset makes space on the right for the RTL fix-docked Sidebar */}
      <div className="flex-1 flex flex-col lg:mr-64 min-w-0 transition-all duration-300">
        
        {/* Top Header bar with search & profiles info */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Dynamic Client Routing Pages wrapper */}
        <main className="p-4 md:p-8 flex-1 overflow-y-auto w-full max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<PageTransition><ProtectedRoute permission="dashboard"><Dashboard /></ProtectedRoute></PageTransition>} />
            <Route path="/orders" element={<PageTransition><ProtectedRoute permission="orders"><Orders /></ProtectedRoute></PageTransition>} />
            <Route path="/inventory" element={<PageTransition><ProtectedRoute permission="inventory"><Inventory /></ProtectedRoute></PageTransition>} />
            <Route path="/production" element={<PageTransition><ProtectedRoute permission="production"><Production /></ProtectedRoute></PageTransition>} />
            <Route path="/staff" element={<PageTransition><ProtectedRoute permission="staff"><Staff /></ProtectedRoute></PageTransition>} />
            <Route path="/accounts" element={<PageTransition><ProtectedRoute permission="accounts"><ErrorBoundary><Accounts /></ErrorBoundary></ProtectedRoute></PageTransition>} />
            <Route path="/no-access" element={
              <PageTransition>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                  <div className="text-5xl">🔒</div>
                  <h2 className="text-xl font-black text-slate-700">ليس لديك صلاحية الوصول</h2>
                  <p className="text-sm text-slate-400 font-bold">تواصل مع مسؤول النظام لمنحك الصلاحيات اللازمة.</p>
                </div>
              </PageTransition>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
  return (
    <AppProvider>
      <BrowserRouter basename={basePath}>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}
