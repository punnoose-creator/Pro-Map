import axios from 'axios';
import { API_BASE } from '../config/constants';

export type UserRole = 'employee' | 'admin' | 'manager';

export type AuthUser = {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
  employeeId: string;
};

export type LoginResponse = {
  success: boolean;
  token?: string;
  employee?: AuthUser;
  message?: string;
};

export async function loginRequest(
  identifier: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(
    `${API_BASE}/auth/login`,
    { email: identifier.trim(), password },
    { timeout: 20000 }
  );
  return data;
}
