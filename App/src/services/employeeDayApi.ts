import axios from 'axios';
import { API_BASE } from '../config/constants';

export type DayPing = {
  _id: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

export type DayLog = {
  _id: string;
  createdAt: string;
  category?: string;
  rawText?: string;
  purpose?: string;
  company?: string;
  metadata?: { clientCapture?: { latitude?: number; longitude?: number } };
};

export type DaySnapshotEmployee = {
  _id: string;
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  isActive: boolean;
  isWorking: boolean;
};

export type DaySnapshotResponse = {
  success: boolean;
  date: string;
  employee: DaySnapshotEmployee;
  pings: DayPing[];
  workTime: string;
  logs: DayLog[];
  message?: string;
};

function isSameDate(iso: string, dateStr: string): boolean {
  return new Date(iso).toISOString().split('T')[0] === dateStr;
}

export async function fetchEmployeeDaySnapshot(
  employeeId: string,
  dateStr: string
): Promise<DaySnapshotResponse> {
  try {
    const { data } = await axios.get<DaySnapshotResponse>(
      `${API_BASE}/admin/employee/${employeeId}/day-snapshot`,
      { params: { date: dateStr }, timeout: 30000 }
    );
    return data;
  } catch (err) {
    if (!axios.isAxiosError(err) || err.response?.status !== 404) throw err;

    const [{ data: employeesRes }, { data: locationsRes }] = await Promise.all([
      axios.get<{
        success: boolean;
        employees?: Array<{
          _id: string;
          fullName: string;
          email: string;
          employeeId: string;
          department: string;
          isActive?: boolean;
        }>;
        message?: string;
      }>(`${API_BASE}/admin/employees`, { timeout: 30000 }),
      axios.get<{
        success: boolean;
        pings?: DayPing[];
        workTime?: string;
        message?: string;
      }>(`${API_BASE}/admin/locations/${employeeId}`, { params: { date: dateStr }, timeout: 30000 }),
    ]);

    if (!employeesRes.success || !locationsRes.success) {
      return {
        success: false,
        date: dateStr,
        employee: {
          _id: employeeId,
          fullName: 'Employee',
          email: '',
          employeeId: '',
          department: '',
          isActive: false,
          isWorking: false,
        },
        pings: [],
        workTime: '0h 0m',
        logs: [],
        message: employeesRes.message ?? locationsRes.message ?? 'Could not load employee details',
      };
    }

    const employee = (employeesRes.employees ?? []).find((e) => e._id === employeeId);
    if (!employee) {
      return {
        success: false,
        date: dateStr,
        employee: {
          _id: employeeId,
          fullName: 'Employee',
          email: '',
          employeeId: '',
          department: '',
          isActive: false,
          isWorking: false,
        },
        pings: [],
        workTime: '0h 0m',
        logs: [],
        message: 'Employee not found',
      };
    }

    let logs: DayLog[] = [];
    try {
      const activityRes = await axios.get<{
        success: boolean;
        activity?: Array<{
          _id: string;
          createdAt: string;
          tab?: string;
          rawText?: string;
          purpose?: string;
          company?: string;
        }>;
        message?: string;
      }>(`${API_BASE}/admin/activity/${employee._id}`, {
        timeout: 30000,
      });

      logs = (activityRes.data.activity ?? [])
        .filter((a) => a.createdAt && isSameDate(a.createdAt, dateStr))
        .map((a) => ({
          _id: a._id,
          createdAt: a.createdAt,
          category: a.tab,
          rawText: a.rawText,
          purpose: a.purpose,
          company: a.company,
        }));
    } catch {
      logs = [];
    }

    return {
      success: true,
      date: dateStr,
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        isActive: employee.isActive ?? true,
        isWorking: false,
      },
      pings: locationsRes.pings ?? [],
      workTime: locationsRes.workTime ?? '0h 0m',
      logs,
    };
  }
}

export async function fetchEmployeeSummaries(employeeId: string, dateStr: string) {
  try {
    const { data } = await axios.get<{
      success: boolean;
      summaries?: { daily: string; weekly: string; monthly: string };
      message?: string;
    }>(`${API_BASE}/admin/summaries/${employeeId}`, {
      params: { date: dateStr },
      timeout: 120000,
    });
    return data;
  } catch (err) {
    if (!axios.isAxiosError(err) || err.response?.status !== 404) throw err;
    return {
      success: true,
      summaries: {
        daily: 'Summary service is not available on this backend deployment yet.',
        weekly: 'Summary service is not available on this backend deployment yet.',
        monthly: 'Summary service is not available on this backend deployment yet.',
      },
    };
  }
}
