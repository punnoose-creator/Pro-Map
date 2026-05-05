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

type LegacyStatsResponse = {
  success: boolean;
  stats?: {
    totalEmployees?: number;
    activeInField?: number;
    totalPings?: number;
    totalLogsToday?: number;
  };
  message?: string;
};

type LegacyEmployeesResponse = {
  success: boolean;
  employees?: Array<{
    _id: string;
    fullName: string;
    email: string;
    employeeId: string;
    department: string;
    isActive?: boolean;
    isWorking?: boolean;
    lastPing?: { at?: string; latitude?: number; longitude?: number } | null;
    lastLogAt?: string | null;
    lastActivityAt?: string | null;
  }>;
  message?: string;
};

function normalizeLegacyEmployees(
  employees: LegacyEmployeesResponse['employees']
): AdminEmployeeRow[] {
  return (employees ?? []).map((e) => ({
    _id: e._id,
    fullName: e.fullName,
    email: e.email,
    employeeId: e.employeeId,
    department: e.department,
    isActive: e.isActive ?? true,
    isWorking: e.isWorking ?? false,
    lastPing:
      e.lastPing && typeof e.lastPing.latitude === 'number' && typeof e.lastPing.longitude === 'number'
        ? {
            at: e.lastPing.at ?? new Date(0).toISOString(),
            latitude: e.lastPing.latitude,
            longitude: e.lastPing.longitude,
          }
        : null,
    lastLogAt: e.lastLogAt ?? null,
    lastActivityAt: e.lastActivityAt ?? null,
  }));
}

export async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  try {
    const { data } = await axios.get<AdminDashboardResponse>(`${API_BASE}/admin/dashboard`, {
      timeout: 30000,
    });
    return data;
  } catch (err) {
    if (!axios.isAxiosError(err) || err.response?.status !== 404) {
      throw err;
    }

    const [{ data: statsData }, { data: employeesData }] = await Promise.all([
      axios.get<LegacyStatsResponse>(`${API_BASE}/admin/stats`, { timeout: 30000 }),
      axios.get<LegacyEmployeesResponse>(`${API_BASE}/admin/employees`, { timeout: 30000 }),
    ]);

    if (!statsData.success || !employeesData.success) {
      return {
        success: false,
        stats: {
          totalEmployees: 0,
          activeNow: 0,
          locationsTrackedToday: 0,
          workUpdatesToday: 0,
        },
        employees: [],
        message: statsData.message ?? employeesData.message ?? 'Could not load dashboard',
      };
    }

    return {
      success: true,
      stats: {
        totalEmployees: statsData.stats?.totalEmployees ?? 0,
        activeNow: statsData.stats?.activeInField ?? 0,
        locationsTrackedToday: statsData.stats?.totalPings ?? 0,
        workUpdatesToday: statsData.stats?.totalLogsToday ?? 0,
      },
      employees: normalizeLegacyEmployees(employeesData.employees),
    };
  }
}
