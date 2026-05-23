import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  InteractionManager,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import LeafletMapView, { type LeafletMapHandle, type MapLayer } from '../../components/maps/LeafletMapView';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import type { StackScreenProps } from '@react-navigation/stack';
import {
  ArrowLeft,
  Bell,
  MapPin,
  ZoomIn,
  ZoomOut,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
} from 'lucide-react-native';

import { Colors } from '../../theme/colors';
import { MapGridBackground } from '../../components/login/MapGridBackground';
import type { AdminEmployeesStackParamList } from '../../navigation/adminTypes';
import { useEmployeeDaySnapshot } from '../../hooks/useEmployeeDaySnapshot';
import { addDaysToIsoDate } from '../../utils/dateIso';
import { formatTimeAgo } from '../../utils/timeAgo';
import type { DayLog, DayPing } from '../../services/employeeDayApi';
import { fetchEmployeeSummaries } from '../../services/employeeDayApi';

type Props = StackScreenProps<AdminEmployeesStackParamList, 'EmployeeActivity'>;

type MainTab = 'map' | 'work' | 'summary' | 'reports';

const toNum = (v: unknown): number => parseFloat(String(v ?? 0));

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '—';
}

function closestPingIndex(pings: DayPing[], logTimeMs: number): number {
  if (!pings.length) return -1;
  let best = 0;
  let bestDiff = Math.abs(new Date(pings[0].createdAt).getTime() - logTimeMs);
  for (let i = 1; i < pings.length; i++) {
    const d = Math.abs(new Date(pings[i].createdAt).getTime() - logTimeMs);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return best;
}

export function AdminEmployeeActivityScreen({ navigation, route }: Props) {
  const { employeeId, fullName: routeName } = route.params;
  const isScreenFocused = useIsFocused();
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [mainTab, setMainTab] = useState<MainTab>('map');
  const [mapLayer, setMapLayer] = useState<MapLayer>('standard');
  const [selectedPingIdx, setSelectedPingIdx] = useState<number | null>(null);
  // Delay map mount; clear on blur so switching bottom tabs never keeps a WebView alive
  // alongside AdminMapScreen (two WebViews crashes Android).
  const [mapMounted, setMapMounted] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [summaries, setSummaries] = useState<{
    daily?: string;
    weekly?: string;
    monthly?: string;
  } | null>(null);
  const [sumLoading, setSumLoading] = useState(false);
  const mapRef = useRef<LeafletMapHandle>(null);
  const timelineScrollRef = useRef<ScrollView>(null);
  const stopStripRef = useRef<ScrollView>(null);
  /** Non-zero once map row has laid out — avoids WebView/Leaflet init at 0×0 height (Android crash). */
  const [mapSlotHeight, setMapSlotHeight] = useState(0);

  const { data, loading, refreshing, error, onRefresh, reload } = useEmployeeDaySnapshot(
    employeeId,
    dateStr
  );

  const employee = data?.employee;
  const pings = data?.pings ?? [];
  const logs = data?.logs ?? [];
  const displayName = employee?.fullName ?? routeName ?? 'Employee';

  const coords = useMemo(
    () =>
      pings.map((p) => ({
        latitude: toNum(p.latitude),
        longitude: toNum(p.longitude),
      })),
    [pings]
  );

  const [pingLabels, setPingLabels] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pings.length) {
        setPingLabels({});
        return;
      }
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted' || cancelled) return;
      const next: Record<number, string> = {};
      for (let i = 0; i < pings.length; i++) {
        const p = pings[i];
        try {
          const geo = await Location.reverseGeocodeAsync({
            latitude: toNum(p.latitude),
            longitude: toNum(p.longitude),
          });
          const g = geo[0];
          const line = [g?.name, g?.district, g?.city].filter(Boolean).join(' · ');
          next[i] = line || `${toNum(p.latitude).toFixed(3)}°, ${toNum(p.longitude).toFixed(3)}°`;
        } catch {
          next[i] = `${toNum(p.latitude).toFixed(2)}°, ${toNum(p.longitude).toFixed(2)}°`;
        }
        await new Promise((r) => setTimeout(r, 280));
        if (cancelled) return;
      }
      if (!cancelled) setPingLabels(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [pings]);

  useEffect(() => {
    setSummaries(null);
  }, [dateStr, employeeId]);

  // Mount WebView only while this stack screen is focused; tear down on blur.
  // Delay + runAfterInteractions reduces overlap with other tabs' WebViews.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const task = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        timeoutId = setTimeout(() => {
          if (!cancelled) setMapMounted(true);
        }, 420);
      });
      return () => {
        cancelled = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (task && typeof (task as { cancel?: () => void }).cancel === 'function') {
          (task as { cancel: () => void }).cancel();
        }
        setMapMounted(false);
      };
    }, [])
  );

  const fitRoute = useCallback(() => {
    mapRef.current?.fitAll();
  }, []);

  const cycleLayer = useCallback(() => {
    setMapLayer((l) => {
      const next: MapLayer = l === 'standard' ? 'satellite' : l === 'satellite' ? 'hybrid' : 'standard';
      mapRef.current?.setLayer(next);
      return next;
    });
  }, []);

  const onLogPress = useCallback(
    (log: DayLog) => {
      setSelectedLogId(log._id);
      const idx = closestPingIndex(pings, new Date(log.createdAt).getTime());
      if (idx < 0) return;
      setSelectedPingIdx(idx);
    },
    [pings]
  );

  const onLeafletMarkerPress = useCallback(
    (id: string) => {
      const idx = pings.findIndex((p) => p._id === id);
      if (idx >= 0) setSelectedPingIdx(idx);
    },
    [pings]
  );

  useEffect(() => {
    if (mainTab === 'summary' && employeeId && !summaries && !sumLoading) {
      setSumLoading(true);
      void fetchEmployeeSummaries(employeeId, dateStr)
        .then((r) => {
          if (r.success && r.summaries) setSummaries(r.summaries);
          else Alert.alert('Summaries', r.message ?? 'Could not generate summaries.');
        })
        .catch(() => Alert.alert('Summaries', 'Request failed.'))
        .finally(() => setSumLoading(false));
    }
  }, [mainTab, employeeId, dateStr, summaries, sumLoading]);

  const shareSummary = useCallback(
    async (kind: 'weekly' | 'monthly') => {
      try {
        const r = await fetchEmployeeSummaries(employeeId, dateStr);
        const body =
          kind === 'weekly' ? r.summaries?.weekly : r.summaries?.monthly;
        if (!body) {
          Alert.alert('Download', 'No summary text returned yet.');
          return;
        }
        await Share.share({
          message: `Pro Map — ${kind} summary\n${displayName}\n${dateStr}\n\n${body}`,
          title: `${displayName} ${kind} summary`,
        });
      } catch {
        Alert.alert('Download', 'Could not share summary.');
      }
    },
    [employeeId, dateStr, displayName]
  );

  const logDescription = (log: DayLog) => {
    if (log.rawText?.trim()) return log.rawText.trim();
    if (log.purpose && log.purpose !== 'N/A') return log.purpose;
    if (log.company && log.company !== 'N/A') return log.company;
    return 'Work update';
  };

  const timelineItem = (log: DayLog) => {
    const t = new Date(log.createdAt);
    const time = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const idx = closestPingIndex(pings, t.getTime());
    const place =
      idx >= 0 ? pingLabels[idx] ?? `Ping #${idx + 1}` : 'No GPS match';
    return { time, place, text: logDescription(log), tag: log.category || 'Work Update' };
  };

  useEffect(() => {
    if (logs.length && mainTab === 'work') {
      setTimeout(() => timelineScrollRef.current?.scrollToEnd({ animated: true }), 400);
    }
  }, [logs.length, mainTab]);

  useEffect(() => {
    if (mainTab !== 'map' || !mapMounted || !isScreenFocused || mapSlotHeight < 64) return;
    const markers = pings.map((p, idx) => {
      const isFirst = idx === 0;
      const isLast  = idx === pings.length - 1;
      const label   = isFirst ? 'S' : isLast ? 'E' : String(idx);
      const color   = selectedPingIdx === idx
        ? 'gold'
        : isFirst
          ? 'green'
          : isLast
            ? 'red'
            : 'orange';
      return {
        id: p._id,
        latitude:  toNum(p.latitude),
        longitude: toNum(p.longitude),
        title: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sub:   pingLabels[idx],
        color,
        label,
      };
    });
    mapRef.current?.setData(markers, coords);
  }, [mainTab, mapMounted, isScreenFocused, mapSlotHeight, pings, coords, pingLabels, selectedPingIdx]);

  if (loading && !data) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.orange} />
        <Text style={styles.bootText}>Loading employee…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <ArrowLeft color={Colors.orange} size={26} />
          <Text style={styles.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.errTitle}>Could not load</Text>
        <Text style={styles.errBody}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => reload()}>
          <Text style={styles.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const active = employee?.isWorking && employee?.isActive;
  const lastUp =
    logs.length > 0
      ? logs[logs.length - 1].createdAt
      : pings.length > 0
        ? pings[pings.length - 1].createdAt
        : null;

  return (
    <View style={styles.root}>
      <View style={styles.bg}>
        <MapGridBackground />
      </View>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <ArrowLeft color={Colors.orange} size={26} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Employee Details</Text>
          <TouchableOpacity onPress={() => Alert.alert('Notifications', 'No new alerts.')}>
            <Bell color={Colors.text} size={24} />
            <View style={styles.dot} />
          </TouchableOpacity>
        </View>

        {/* Fixed header — card + tabs never scroll */}
        <View style={styles.card}>
          <LinearGradient colors={[Colors.orange, Colors.gold]} style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials(displayName)}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{employee?.email ?? '—'}</Text>
            <View style={styles.rowMeta}>
              <View style={[styles.badge, active ? styles.badgeOn : styles.badgeOff]}>
                <Text style={[styles.badgeTxt, active && styles.badgeTxtOn]}>
                  {active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <Text style={styles.last}>Updated {formatTimeAgo(lastUp)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          {(
            [
              ['map', 'Map'],
              ['work', 'Work Updates'],
              ['summary', 'Summary'],
              ['reports', 'Reports'],
            ] as const
          ).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, mainTab === key && styles.tabOn]}
              onPress={() => setMainTab(key)}
            >
              <Text style={[styles.tabTxt, mainTab === key && styles.tabTxtOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Map tab — WebView is NOT inside a ScrollView (prevents Android crash) */}
        {mainTab === 'map' && (
          <View style={styles.mapTabContainer}>
            <View style={styles.dateBar}>
              <TouchableOpacity onPress={() => setDateStr((d) => addDaysToIsoDate(d, -1))}>
                <ChevronLeft color={Colors.orange} size={28} />
              </TouchableOpacity>
              <Text style={styles.dateTxt}>{dateStr}</Text>
              <TouchableOpacity onPress={() => setDateStr((d) => addDaysToIsoDate(d, 1))}>
                <ChevronRight color={Colors.orange} size={28} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterIco} onPress={() => setFilterOpen(true)}>
                <Filter color={Colors.orange} size={22} />
              </TouchableOpacity>
            </View>
            <View
              style={styles.mapSlot}
              onLayout={(e) => setMapSlotHeight(e.nativeEvent.layout.height)}
            >
              {mapMounted && isScreenFocused && mapSlotHeight > 64 ? (
                <LeafletMapView
                  ref={mapRef}
                  style={styles.mapFlex}
                  onMarkerPress={onLeafletMarkerPress}
                />
              ) : mapMounted && isScreenFocused ? (
                <View style={styles.mapSlotLoading}>
                  <ActivityIndicator color={Colors.orange} />
                </View>
              ) : null}
            </View>
            {coords.length === 0 && (
              <View style={styles.mapEmpty}>
                <MapPin color={Colors.textMuted} size={36} />
                <Text style={styles.mapEmptyTxt}>No location data for this day</Text>
              </View>
            )}
            <View style={styles.mapControls}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={fitRoute}>
                <Text style={styles.ctrlTxt}>Fit route</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => mapRef.current?.zoomIn()}>
                <ZoomIn color={Colors.orange} size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => mapRef.current?.zoomOut()}>
                <ZoomOut color={Colors.orange} size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={cycleLayer}>
                <Layers color={Colors.gold} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.workTime}>Work time: {data?.workTime ?? '0h 0m'}</Text>

            {/* ── Stop strip ─────────────────────────────────────────── */}
            {pings.length > 0 && (
              <ScrollView
                ref={stopStripRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.stopStrip}
                contentContainerStyle={styles.stopStripContent}
              >
                {pings.map((p, idx) => {
                  const isFirst = idx === 0;
                  const isLast  = idx === pings.length - 1;
                  const label   = isFirst ? 'S' : isLast ? 'E' : String(idx);
                  const dotColor = selectedPingIdx === idx
                    ? '#FBBF24'
                    : isFirst ? '#22C55E'
                    : isLast  ? '#EF4444'
                    : '#F97316';
                  const time = new Date(p.createdAt).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit',
                  });
                  const address = pingLabels[idx] ?? '…';
                  const selected = selectedPingIdx === idx;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={[styles.stopCard, selected && styles.stopCardSel]}
                      onPress={() => {
                        setSelectedPingIdx(idx);
                        mapRef.current?.fitAll();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.stopDot, { backgroundColor: dotColor }]}>
                        <Text style={styles.stopDotLabel}>{label}</Text>
                      </View>
                      <Text style={styles.stopTime}>{time}</Text>
                      <Text style={styles.stopAddr} numberOfLines={2}>{address}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Non-map tabs each get their own ScrollView with pull-to-refresh */}
        {mainTab === 'work' && (
          <ScrollView
            style={styles.tabScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange} />
            }
          >
            <View style={styles.timelineBlock}>
              <Text style={styles.sectionLabel}>Timeline</Text>
              {logs.length === 0 ? (
                <Text style={styles.empty}>No activity for this day.</Text>
              ) : (
                logs.map((item) => {
                  const { time, place, text, tag } = timelineItem(item);
                  const sel = selectedLogId === item._id;
                  return (
                    <TouchableOpacity
                      key={item._id}
                      style={[styles.tlRow, sel && styles.tlRowSel]}
                      onPress={() => onLogPress(item)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.tlDotCol}>
                        <View style={[styles.tlDot, sel && styles.tlDotSel]} />
                        <View style={styles.tlLine} />
                      </View>
                      <View style={styles.tlBody}>
                        <Text style={styles.tlTime}>{time} → {place}</Text>
                        <Text style={styles.tlText}>{text}</Text>
                        <View style={styles.tlTag}>
                          <Text style={styles.tlTagTxt}>{tag}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={styles.downloadRow}>
                <TouchableOpacity style={styles.dlBtn} onPress={() => void shareSummary('weekly')}>
                  <Download size={16} color={Colors.orange} />
                  <Text style={styles.dlTxt}>Download Weekly Summary</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dlBtn} onPress={() => void shareSummary('monthly')}>
                  <Download size={16} color={Colors.orange} />
                  <Text style={styles.dlTxt}>Download Monthly Summary</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.note}>Summaries are AI-generated using work updates and location data.</Text>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        )}

        {mainTab === 'summary' && (
          <ScrollView
            style={styles.tabScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange} />
            }
          >
            <View style={styles.summaryBlock}>
              {sumLoading ? (
                <ActivityIndicator color={Colors.orange} style={{ marginVertical: 24 }} />
              ) : summaries ? (
                <>
                  <Text style={styles.sumHead}>Daily</Text>
                  <Text style={styles.sumBody}>{summaries.daily ?? '—'}</Text>
                  <Text style={styles.sumHead}>Weekly</Text>
                  <Text style={styles.sumBody}>{summaries.weekly ?? '—'}</Text>
                  <Text style={styles.sumHead}>Monthly</Text>
                  <Text style={styles.sumBody}>{summaries.monthly ?? '—'}</Text>
                </>
              ) : (
                <Text style={styles.empty}>Open this tab to load AI summaries.</Text>
              )}
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        )}

        {mainTab === 'reports' && (
          <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.reportsBlock}>
              <Text style={styles.reportsTitle}>Reports</Text>
              <Text style={styles.reportsBody}>
                Export packaged PDF/CSV can be added when the API returns files. For now, use
                Download on the Work Updates tab to share text summaries.
              </Text>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={filterOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filters</Text>
            <Text style={styles.modalSub}>Custom date range and advanced filters can be wired here.</Text>
            <TouchableOpacity onPress={() => setFilterOpen(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const W = Dimensions.get('window').width;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  safe: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  bootText: { marginTop: 12, color: Colors.textMuted, fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  screenTitle: { fontSize: 17, fontWeight: '900', color: Colors.text },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  card: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.28)',
    backgroundColor: '#0A0A0A',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 18, fontWeight: '900', color: '#0B0B0B' },
  name: { fontSize: 18, fontWeight: '900', color: Colors.text },
  email: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#222',
  },
  badgeOn: { backgroundColor: 'rgba(34,197,94,0.2)' },
  badgeOff: { backgroundColor: '#2A2A2A' },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: Colors.textMuted },
  badgeTxtOn: { color: '#4ADE80' },
  last: { fontSize: 12, color: Colors.textSubtle, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabOn: { borderBottomWidth: 2, borderBottomColor: Colors.orange },
  tabTxt: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textAlign: 'center' },
  tabTxtOn: { color: Colors.orange },
  // Map tab fills remaining vertical space — no ScrollView wrapper (prevents Android crash)
  mapTabContainer: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  mapSlot: { flex: 1, minHeight: 200 },
  mapSlotLoading: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  mapFlex: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)', overflow: 'hidden' },
  tabScroll: { flex: 1 },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  dateTxt: { fontSize: 16, fontWeight: '800', color: Colors.text, minWidth: 110, textAlign: 'center' },
  filterIco: { marginLeft: 8, padding: 6 },
  mapEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  mapEmptyTxt: { color: Colors.textMuted, marginTop: 8, fontWeight: '700' },
  mapControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  ctrlBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  ctrlTxt: { color: Colors.orange, fontWeight: '800', fontSize: 13 },
  iconBtn: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#141414',
  },
  workTime: { marginTop: 10, color: Colors.gold, fontWeight: '800', fontSize: 13 },
  // ── Stop strip ────────────────────────────────────────────────────────────
  stopStrip: { marginTop: 10 },
  stopStripContent: { paddingHorizontal: 2, gap: 8, flexDirection: 'row' },
  stopCard: {
    width: 100,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    gap: 6,
  },
  stopCardSel: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  stopDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopDotLabel: { fontSize: 10, fontWeight: '900', color: '#0B0B0B' },
  stopTime: { fontSize: 12, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  stopAddr: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 14 },
  timelineBlock: { marginTop: 16, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '900', color: Colors.text, marginBottom: 12 },
  empty: { color: Colors.textMuted, fontStyle: 'italic', marginVertical: 16 },
  tlRow: { flexDirection: 'row', marginBottom: 4 },
  tlRowSel: { backgroundColor: 'rgba(251,191,36,0.06)', borderRadius: 12 },
  tlDotCol: { width: 22, alignItems: 'center' },
  tlDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  tlDotSel: { backgroundColor: Colors.gold },
  tlLine: { flex: 1, width: 2, backgroundColor: '#2A2A2A', marginTop: 2, minHeight: 40 },
  tlBody: { flex: 1, paddingBottom: 16, paddingLeft: 8 },
  tlTime: { fontSize: 13, fontWeight: '800', color: Colors.orange, marginBottom: 4 },
  tlText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  tlTag: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(249,115,22,0.15)',
  },
  tlTagTxt: { fontSize: 10, fontWeight: '900', color: Colors.orange },
  downloadRow: { marginTop: 20, gap: 10 },
  dlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    backgroundColor: '#101010',
  },
  dlTxt: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  note: { marginTop: 12, fontSize: 11, color: Colors.textSubtle, lineHeight: 16 },
  summaryBlock: { paddingHorizontal: 16, marginTop: 16 },
  sumHead: { marginTop: 14, fontSize: 13, fontWeight: '900', color: Colors.orange },
  sumBody: { marginTop: 6, fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  reportsBlock: { paddingHorizontal: 16, marginTop: 16 },
  reportsTitle: { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 8 },
  reportsBody: { fontSize: 14, color: Colors.textMuted, lineHeight: 22 },
  callout: { width: W * 0.55, padding: 8 },
  calloutTime: { fontWeight: '900', color: '#111', marginBottom: 4 },
  calloutLoc: { fontSize: 12, color: '#333' },
  backRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  backTxt: { color: Colors.orange, fontWeight: '700' },
  errTitle: { fontSize: 20, fontWeight: '900', color: Colors.text, paddingHorizontal: 16 },
  errBody: { color: Colors.textMuted, padding: 16 },
  retry: {
    marginHorizontal: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.orange,
  },
  retryTxt: { color: Colors.orange, fontWeight: '800' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 8 },
  modalSub: { color: Colors.textMuted, marginBottom: 16, lineHeight: 20 },
  modalClose: { color: Colors.orange, fontWeight: '800' },
});
