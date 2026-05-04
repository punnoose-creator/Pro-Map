import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import type { AdminEmployeeRow as RowType } from '../../services/adminDashboardApi';
import type { GeoLabel } from '../../hooks/useAdminDashboard';
import { formatTimeAgo } from '../../utils/timeAgo';

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '—';
}

type Props = {
  item: RowType;
  geo?: GeoLabel;
  onPress: () => void;
};

export function AdminEmployeeRow({ item, geo, onPress }: Props) {
  const active = item.isWorking && item.isActive;
  const inactiveAccount = !item.isActive;
  const hasPin = !!item.lastPing;
  const locPrimary =
    geo?.area && geo.area !== '—'
      ? geo.area
      : hasPin
        ? `${item.lastPing!.latitude.toFixed(2)}°, ${item.lastPing!.longitude.toFixed(2)}°`
        : '—';
  const locSecondary = geo?.city ?? '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <LinearGradient colors={[Colors.orange, Colors.gold]} style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.fullName)}</Text>
      </LinearGradient>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.fullName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          <ChevronRight color={Colors.textSubtle} size={22} />
        </View>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.badge,
              active && styles.badgeActive,
              !active && !inactiveAccount && styles.badgeIdle,
              inactiveAccount && styles.badgeOff,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                active && styles.badgeTextActive,
                !active && !inactiveAccount && styles.badgeTextIdle,
              ]}
            >
              {inactiveAccount ? 'Inactive' : active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text style={[styles.time, active && styles.timeActive]}>
            {formatTimeAgo(item.lastActivityAt)}
          </Text>
        </View>
        <View style={styles.locRow}>
          <MapPin size={15} color={Colors.orange} />
          {hasPin ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.loc1} numberOfLines={1}>
                {locPrimary}
              </Text>
              {!!locSecondary && (
                <Text style={styles.loc2} numberOfLines={1}>
                  {locSecondary}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noData}>No location data</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#0C0C0C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.22)',
    padding: 14,
    marginBottom: 12,
    shadowColor: Colors.orange,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '900', color: '#0B0B0B' },
  body: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '800', color: Colors.text },
  email: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#222',
  },
  badgeActive: { backgroundColor: 'rgba(34,197,94,0.2)' },
  badgeIdle: { backgroundColor: 'rgba(251,191,36,0.15)' },
  badgeOff: { backgroundColor: '#2A2A2A' },
  badgeText: { fontSize: 11, fontWeight: '800', color: Colors.textMuted },
  badgeTextActive: { color: '#4ADE80' },
  badgeTextIdle: { color: Colors.gold },
  time: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  timeActive: { color: '#4ADE80' },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, gap: 6 },
  loc1: { fontSize: 13, fontWeight: '700', color: Colors.text },
  loc2: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  noData: { fontSize: 12, color: Colors.textSubtle, fontStyle: 'italic', flex: 1 },
});
