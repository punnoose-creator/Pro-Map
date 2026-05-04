import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  fetchEmployeeDaySnapshot,
  type DaySnapshotResponse,
} from '../services/employeeDayApi';

export function useEmployeeDaySnapshot(employeeId: string | undefined, dateStr: string) {
  const [data, setData] = useState<DaySnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!employeeId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetchEmployeeDaySnapshot(employeeId, dateStr);
        if (!res.success) {
          setError(res.message ?? 'Failed to load');
          setData(null);
          return;
        }
        setData(res);
      } catch (e) {
        if (axios.isAxiosError(e)) {
          setError(e.response?.data?.message ?? e.message ?? 'Network error');
        } else {
          setError('Could not load employee day');
        }
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [employeeId, dateStr]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return { data, loading, refreshing, error, reload: () => void load(false), onRefresh: () => void load(true) };
}
