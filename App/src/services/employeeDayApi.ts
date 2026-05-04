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

export async function fetchEmployeeDaySnapshot(
  employeeId: string,
  dateStr: string
): Promise<DaySnapshotResponse> {
  const { data } = await axios.get<DaySnapshotResponse>(
    `${API_BASE}/admin/employee/${employeeId}/day-snapshot`,
    { params: { date: dateStr }, timeout: 30000 }
  );
  return data;
}

export async function fetchEmployeeSummaries(employeeId: string, dateStr: string) {
  const { data } = await axios.get<{
    success: boolean;
    summaries?: { daily: string; weekly: string; monthly: string };
    message?: string;
  }>(`${API_BASE}/admin/summaries/${employeeId}`, { params: { date: dateStr }, timeout: 120000 });
  return data;
}
