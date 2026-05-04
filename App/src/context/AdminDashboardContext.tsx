import React, { createContext, useContext } from 'react';
import { useAdminDashboard } from '../hooks/useAdminDashboard';

type Value = ReturnType<typeof useAdminDashboard>;

const AdminDashboardContext = createContext<Value | null>(null);

export function AdminDashboardProvider({ children }: { children: React.ReactNode }) {
  const value = useAdminDashboard();
  return (
    <AdminDashboardContext.Provider value={value}>{children}</AdminDashboardContext.Provider>
  );
}

export function useAdminData(): Value {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDashboardProvider');
  return ctx;
}
