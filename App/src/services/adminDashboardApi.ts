import axios from 'axios';
import { API_BASE } from '../config/constants';

export type AdminDashboardStats = {
  totalEmployees: number;
  activeNow: number;
  locationsTrackedToday: number;
  workUpdatesToday: number;
};

export type AdminEmployeeRow = {
  _id: string;
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  isActive: boolean;
  isWorking: boolean;
  lastPing: { at: string; latitude: number; longitude: number } | null;
  lastLogAt: string | null;
  lastActivityAt: string | null;
};

export type AdminDashboardResponse = {
  success: boolean;
  stats: AdminDashboardStats;
  employees: AdminEmployeeRow[];
  message?: string;
};

export async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  const { data } = await axios.get<AdminDashboardResponse>(`${API_BASE}/admin/dashboard`, {
    timeout: 30000,
  });
  return data;
}
