import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Clock, ChevronLeft, MapPin, RefreshCw, Download } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { API_BASE } from '../../context/AuthContext';
import axios from 'axios';

type Ping = {
  latitude: number;
  longitude: number;
  createdAt: string;
};

type Activity = {
  _id: string;
  tab: string;
  createdAt: string;
  date?: string;
  company: string;
  purpose: string;
  nextAction: string;
  outcome?: string;
  rawText?: string;
  estValue?: number;
};

const toNum = (v: any): number => parseFloat(String(v ?? 0));

export const AdminTrackingScreen = ({ route, navigation }: any) => {
  const { employeeId, fullName } = route.params || {};

  useEffect(() => {
    if (!employeeId || !fullName) {
      Alert.alert('Error', 'Missing employee information.');
      navigation.goBack();
    }
  }, [employeeId, fullName, navigation]);

  const [pings, setPings] = useState<Ping[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [workTime, setWorkTime] = useState('0h 0m');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [locRes, actRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/locations/${employeeId}?date=${date}`),
        axios.get(`${API_BASE}/admin/activity/${encodeURIComponent(fullName || '')}`),
      ]);
      if (locRes.data.success) {
        setPings(locRes.data.pings ?? []);
        setWorkTime(locRes.data.workTime || '0h 0m');
      }
      if (actRes.data.success) {
        setActivity(actRes.data.activity ?? []);
      }
    } catch (error) {
      console.error('Tracking fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, date, fullName]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fit map to all markers whenever pings update
  useEffect(() => {
    if (pings.length === 0 || !mapRef.current) return;
    const coords = pings.map(p => ({ latitude: toNum(p.latitude), longitude: toNum(p.longitude) }));
    // Delay to ensure MapView has finished its initial layout
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
        animated: true,
      });
    }, 1000);
  }, [pings]);

  const handleLogClick = (act: Activity) => {
    setSelectedLogId(act._id);
    if (pings.length === 0) return;

    const targetMs = new Date(act.createdAt).getTime();
    let closest = pings[0];
    let minDiff = Math.abs(new Date(pings[0].createdAt).getTime() - targetMs);

    for (let i = 1; i < pings.length; i++) {
      const diff = Math.abs(new Date(pings[i].createdAt).getTime() - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pings[i];
      }
    }

    mapRef.current?.animateToRegion(
      {
        latitude: toNum(closest.latitude),
        longitude: toNum(closest.longitude),
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      800
    );
  };

  const generateReport = (period: 'weekly' | 'monthly'): string => {
    const daysBack = period === 'weekly' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    cutoff.setHours(0, 0, 0, 0);

    const filtered = activity.filter(a => new Date(a.createdAt) >= cutoff);
    const label = period === 'weekly' ? 'Weekly' : 'Monthly';

    let report = `FIELD IQ — ${label.toUpperCase()} REPORT\n`;
    report += `Employee : ${fullName}\n`;
    report += `Period   : Last ${daysBack} days (${cutoff.toLocaleDateString()} – ${new Date().toLocaleDateString()})\n`;
    report += `Entries  : ${filtered.length}\n`;
    report += `${'─'.repeat(48)}\n\n`;

    if (filtered.length === 0) {
      report += 'No activity entries in this period.\n';
      return report;
    }

    filtered.forEach((act, idx) => {
      report += `${idx + 1}. ${new Date(act.createdAt).toLocaleString()}\n`;
      if (act.tab && act.tab !== 'N/A') report += `   Category   : ${act.tab}\n`;
      if (act.company && act.company !== 'N/A') report += `   Company    : ${act.company}\n`;
      if (act.purpose && act.purpose !== 'N/A') report += `   Purpose    : ${act.purpose}\n`;
      if (act.outcome && act.outcome !== 'N/A') report += `   Outcome    : ${act.outcome}\n`;
      if (act.nextAction && act.nextAction !== 'N/A') report += `   Next Action: ${act.nextAction}\n`;
      if (act.rawText) report += `   Note       : ${act.rawText}\n`;
      report += '\n';
    });

    return report;
  };

  const handleDownload = async (period: 'weekly' | 'monthly') => {
    const report = generateReport(period);
    try {
      await Share.share(
        {
          message: report,
          title: `${fullName} — ${period === 'weekly' ? 'Weekly' : 'Monthly'} Summary`,
        },
        { dialogTitle: `Share ${period} report for ${fullName}` }
      );
    } catch (_) {
      Alert.alert('Error', 'Could not share the report.');
    }
  };

  const dubaiRegion = { latitude: 25.2048, longitude: 55.2708, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  const mapInitialRegion =
    pings.length > 0
      ? {
          latitude: toNum(pings[pings.length - 1].latitude),
          longitude: toNum(pings[pings.length - 1].longitude),
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : dubaiRegion;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading tracking data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{fullName}</Text>
          <Text style={styles.headerSubtitle}>{date}</Text>
        </View>
        <View style={styles.workTimeContainer}>
          <Text style={styles.workTimeLabel}>Work Time</Text>
          <Text style={styles.workTimeValue}>{workTime}</Text>
        </View>
      </View>

      {/* Ping count + Refresh */}
      <View style={styles.pingBar}>
        <View style={styles.pingBadge}>
          <MapPin size={14} color={Colors.primary} />
          <Text style={styles.pingBadgeText}>
            {pings.length} GPS {pings.length === 1 ? 'Ping' : 'Pings'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => fetchData(true)} style={styles.refreshBtn}>
          <RefreshCw size={16} color={Colors.primary} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Map — always rendered so the ref is always valid */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={mapInitialRegion}
          userInterfaceStyle="light"
        >
          {pings.length > 1 && (
            <Polyline
              coordinates={pings.map(p => ({
                latitude: toNum(p.latitude),
                longitude: toNum(p.longitude),
              }))}
              strokeColor={Colors.primary}
              strokeWidth={3}
            />
          )}

          {pings.map((ping, idx) => (
            <Marker
              key={idx}
              coordinate={{
                latitude: toNum(ping.latitude),
                longitude: toNum(ping.longitude),
              }}
              title={`Point #${idx + 1}`}
              description={ping.createdAt ? new Date(ping.createdAt).toLocaleTimeString() : ''}
              pinColor={
                idx === 0 ? '#22c55e' : idx === pings.length - 1 ? '#ef4444' : '#ffc0a8'
              }
            />
          ))}
        </MapView>

        {pings.length === 0 && (
          <View style={styles.noMapOverlay}>
            <MapPin size={40} color={Colors.textMuted} />
            <Text style={styles.noMapText}>No GPS data yet</Text>
            <Text style={styles.noMapSubtext}>
              Pings will appear once the employee starts their shift.
            </Text>
          </View>
        )}
      </View>

      {/* Activity logs */}
      <View style={styles.logsContainer}>
        <View style={styles.logsHeader}>
          <Text style={styles.sectionTitle}>
            Activity Logs
            {activity.length > 0 && (
              <Text style={styles.logCount}> ({activity.length})</Text>
            )}
          </Text>

          <View style={styles.downloadRow}>
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => handleDownload('weekly')}
            >
              <Download size={14} color={Colors.primary} />
              <Text style={styles.downloadText}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => handleDownload('monthly')}
            >
              <Download size={14} color={Colors.primary} />
              <Text style={styles.downloadText}>Monthly</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.logsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={Colors.primary}
            />
          }
        >
          {activity.length === 0 ? (
            <Text style={styles.noLogs}>No activity logs for this employee.</Text>
          ) : (
            activity.map(act => {
              const hasStructured =
                act.company !== 'N/A' || act.purpose !== 'N/A' || act.nextAction !== 'N/A';
              return (
                <TouchableOpacity
                  key={act._id}
                  style={[styles.logCard, selectedLogId === act._id && styles.logCardSelected]}
                  onPress={() => handleLogClick(act)}
                  activeOpacity={0.7}
                >
                  <View style={styles.logHeader}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{act.tab || 'LOG'}</Text>
                    </View>
                    <View style={styles.timeRow}>
                      <Clock size={12} color={Colors.textMuted} />
                      <Text style={styles.timeText}>
                        {act.createdAt
                          ? new Date(act.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--:--'}
                      </Text>
                    </View>
                  </View>

                  {hasStructured ? (
                    <>
                      <Text style={styles.logCompany}>
                        {act.company !== 'N/A' ? act.company : 'Log Entry'}
                      </Text>
                      {act.purpose !== 'N/A' && (
                        <Text style={styles.logPurpose}>{act.purpose}</Text>
                      )}
                    </>
                  ) : act.rawText ? (
                    <Text style={styles.logPurpose} numberOfLines={4}>
                      {act.rawText}
                    </Text>
                  ) : null}

                  <View style={styles.logFooter}>
                    {act.nextAction !== 'N/A' && (
                      <Text style={styles.logNext}>Next: {act.nextAction}</Text>
                    )}
                    {pings.length > 0 && (
                      <View style={styles.tapHint}>
                        <MapPin size={10} color={Colors.primary} />
                        <Text style={styles.tapHintText}>Tap to locate</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: Colors.textMuted, marginTop: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },
  headerSubtitle: { fontSize: 12, color: Colors.textMuted },
  workTimeContainer: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  workTimeLabel: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  workTimeValue: { fontSize: 14, fontWeight: '800', color: Colors.white },
  pingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pingBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  mapContainer: { height: 280, width: '100%' },
  map: { ...StyleSheet.absoluteFillObject },
  noMapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 24,
  },
  noMapText: { color: Colors.white, fontSize: 16, fontWeight: '700', marginTop: 12 },
  noMapSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  logsContainer: { flex: 1, padding: 16 },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  logCount: { color: Colors.textMuted, fontWeight: '400' },
  downloadRow: { flexDirection: 'row', gap: 8 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.primaryMuted,
  },
  downloadText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  logsList: { flex: 1 },
  noLogs: {
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  logCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 12,
  },
  logCardSelected: {
    borderLeftColor: '#22c55e',
    borderColor: 'rgba(74, 222, 128, 0.3)',
    borderWidth: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: Colors.textMuted },
  logCompany: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  logPurpose: { fontSize: 13, color: Colors.textMuted, lineHeight: 18, marginBottom: 8 },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logNext: { fontSize: 11, color: Colors.primary, fontWeight: '600', flex: 1 },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.7 },
  tapHintText: { fontSize: 10, color: Colors.primary, fontWeight: '500' },
});
