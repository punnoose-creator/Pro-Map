import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';
import {
  fetchAdminDashboard,
  type AdminDashboardStats,
  type AdminEmployeeRow,
} from '../services/adminDashboardApi';

export type GeoLabel = { area: string; city: string };

async function buildGeoMap(list: AdminEmployeeRow[]): Promise<Record<string, GeoLabel>> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') return {};

  const byCoordKey = new Map<string, GeoLabel>();
  const keys: string[] = [];
  for (const e of list) {
    const p = e.lastPing;
    if (!p) continue;
    const ck = `${p.latitude.toFixed(3)}_${p.longitude.toFixed(3)}`;
    if (!byCoordKey.has(ck)) {
      keys.push(ck);
      byCoordKey.set(ck, { area: '—', city: '' });
    }
  }
  for (const ck of keys) {
    const [la, lo] = ck.split('_').map(Number);
    try {
      const geo = await Location.reverseGeocodeAsync({
        latitude: la,
        longitude: lo,
      });
      const g = geo[0];
      byCoordKey.set(ck, {
        area: g?.district || g?.name || g?.street || '—',
        city: g?.city || g?.subregion || g?.region || '',
      });
    } catch {
      /* keep placeholder */
    }
    await new Promise((r) => setTimeout(r, 320));
  }
  const out: Record<string, GeoLabel> = {};
  for (const e of list) {
    const p = e.lastPing;
    if (!p) continue;
    const ck = `${p.latitude.toFixed(3)}_${p.longitude.toFixed(3)}`;
    const lab = byCoordKey.get(ck);
    if (lab) out[e._id] = lab;
  }
  return out;
}

export function useAdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [employees, setEmployees] = useState<AdminEmployeeRow[]>([]);
  const [geoByEmployeeId, setGeoByEmployeeId] = useState<Record<string, GeoLabel>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDashboard();
      if (!data.success) {
        setError(data.message ?? 'Could not load dashboard');
        setStats(null);
        setEmployees([]);
        setGeoByEmployeeId({});
        return;
      }
      setStats(data.stats);
      setEmployees(data.employees);
      setGeoByEmployeeId({});
      void buildGeoMap(data.employees).then(setGeoByEmployeeId);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.message ?? e.message ?? 'Network error');
      } else {
        setError('Something went wrong');
      }
      setStats(null);
      setEmployees([]);
      setGeoByEmployeeId({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const onRefresh = useCallback(() => void load(true), [load]);

  return {
    stats,
    employees,
    geoByEmployeeId,
    loading,
    refreshing,
    error,
    onRefresh,
    reload: () => void load(false),
  };
}
