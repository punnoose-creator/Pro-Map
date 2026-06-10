import axios from 'axios';
import { API_BASE } from '../config/constants';

export type WorkLogPayload = {
  text: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  /** Local file URI of the geo-stamped photo (mandatory for new submissions). */
  photoUri: string;
};

export type WorkLogResponse = {
  success: boolean;
  message?: string;
  sheet?: string;
};

/** Builds the multipart body the backend expects (fields + photo file). */
function buildFormData(payload: WorkLogPayload): FormData {
  const form = new FormData();
  form.append('text', payload.text);
  form.append('latitude', String(payload.latitude));
  form.append('longitude', String(payload.longitude));
  form.append('timestamp', payload.timestamp);
  form.append('photo', {
    // React Native FormData file shape
    uri: payload.photoUri,
    name: `work-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);
  return form;
}

export async function postWorkLog(payload: WorkLogPayload): Promise<WorkLogResponse> {
  const { data } = await axios.post(`${API_BASE}/log-entry`, buildFormData(payload), {
    timeout: 45000,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export { buildFormData };
