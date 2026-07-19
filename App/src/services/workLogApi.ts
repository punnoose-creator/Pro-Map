import axios from 'axios';
import { API_BASE } from '../config/constants';

export type WorkLogPayload = {
  text: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};

export type WorkLogResponse = {
  success: boolean;
  message?: string;
  sheet?: string;
};

export async function postWorkLog(payload: WorkLogPayload): Promise<WorkLogResponse> {
  const { data } = await axios.post(`${API_BASE}/log-entry`, payload, { timeout: 25000 });
  return data;
}
