import axios from 'axios';
import { API_BASE } from '../config/constants';

/**
 * Opens a work shift for the authenticated employee. The backend resumes an
 * existing same-day shift if one is already open, so this is safe to call on
 * every "Start Work". Auth header is set globally by AuthContext.
 */
export async function startShift(token?: string | null): Promise<void> {
  await axios.post(
    `${API_BASE}/shifts/start`,
    {},
    {
      timeout: 15000,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    }
  );
}

/** Closes the current open shift for the authenticated employee. */
export async function stopShift(token?: string | null): Promise<void> {
  await axios.post(
    `${API_BASE}/shifts/stop`,
    {},
    {
      timeout: 15000,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    }
  );
}
