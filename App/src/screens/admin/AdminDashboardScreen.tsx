import React, { useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  Menu,
  Bell,
  Users,
  MapPin,
  ClipboardList,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Crown,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAdminData } from '../../context/AdminDashboardContext';
import { Colors } from '../../theme/colors';
import { MapGridBackground } from '../../components/login/MapGridBackground';
import { AdminStatCard } from '../../components/admin/AdminStatCard';
import { AdminEmployeeRow } from '../../components/admin/AdminEmployeeRow';
import type { AdminTabParamList } from '../../navigation/adminTypes';
import type { AdminEmployeeRow as EmpRow } from '../../services/adminDashboardApi';

export type AdminDashboardNav = BottomTabNavigationProp<AdminTabParamList, 'AdminDashboard'>;

type StatusFilter = 'all' | 'active' | 'inactive';
type DateFilter = 'all' | 'today' | 'week';

function GreenDot() {
  return (
    <View style={styles.greenDotWrap}>
      <View style={styles.greenDot} />
    </View>
  );
}

export function AdminDashboardScreen() {
  const navigation = useNavigation<AdminDashboardNav>();
  const { logout } = useAuth();
  const {
    stats,
    employees,
    geoByEmployeeId,
    loading,
    refreshing,
    error,
    onRefresh,
    reload,
  } = useAdminData();

  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>('all');
  const [draftDate, setDraftDate] = useState<DateFilter>('all');

  const openFilter = useCallback(() => {
    setDraftStatus(statusFilter);
    setDraftDate(dateFilter);
    setFilterOpen(true);
  }, [statusFilter, dateFilter]);

  const applyFilter = useCallback(() => {
    setStatusFilter(draftStatus);
    setDateFilter(draftDate);
    setFilterOpen(false);
  }, [draftStatus, draftDate]);

  const filtered = useMemo(() => {
    let rows = employees;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'active') {
      rows = rows.filter((e) => e.isWorking && e.isActive);
    } else if (statusFilter === 'inactive') {
      rows = rows.filter((e) => !e.isWorking);
    }
    if (dateFilter === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      rows = rows.filter(
        (e) => e.lastActivityAt && new Date(e.lastActivityAt) >= start
      );
    } else if (dateFilter === 'week') {
      const t = Date.now() - 7 * 86400000;
      rows = rows.filter(
        (e) => e.lastActivityAt && new Date(e.lastActivityAt).getTime() >= t
      );
    }
    return rows;
  }, [employees, search, statusFilter, dateFilter]);

  const onRowPress = useCallback(
    (item: EmpRow) => {
      navigation.navigate('AdminEmployees', {
        screen: 'EmployeeActivity',
        params: { employeeId: item._id, fullName: item.fullName },
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: EmpRow }) => (
      <AdminEmployeeRow
        item={item}
        geo={geoByEmployeeId[item._id]}
        onPress={() => onRowPress(item)}
      />
    ),
    [geoByEmployeeId, onRowPress]
  );

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={12}>
            <Menu color={Colors.text} size={26} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => Alert.alert('Notifications', 'No new alerts.')}
            hitSlop={12}
          >
            <Bell color={Colors.text} size={24} strokeWidth={2} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcome}>
          Welcome, <Text style={styles.welcomeAccent}>Admin</Text> 👋
        </Text>
        <Text style={styles.sub}>{"Here's what's happening today"}</Text>

        <View style={styles.statGrid}>
          <AdminStatCard
            label="Total Employees"
            value={stats?.totalEmployees ?? 0}
            sub="All time"
            icon={<Users color={Colors.orange} size={22} />}
          />
          <AdminStatCard
            label="Active Now"
            value={stats?.activeNow ?? 0}
            sub="Currently working"
            icon={<GreenDot />}
          />
          <AdminStatCard
            label="Locations Tracked"
            value={stats?.locationsTrackedToday ?? 0}
            sub="Today"
            icon={<MapPin color={Colors.orange} size={22} />}
          />
          <AdminStatCard
            label="Work Updates"
            value={stats?.workUpdatesToday ?? 0}
            sub="Today"
            icon={<ClipboardList color={Colors.orange} size={22} />}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => reload()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Search size={20} color={Colors.textSubtle} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee by name or email..."
              placeholderTextColor={Colors.textSubtle}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={openFilter}>
            <SlidersHorizontal color={Colors.orange} size={20} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Employees</Text>
          <TouchableOpacity
            style={styles.viewAll}
            onPress={() => navigation.navigate('AdminEmployees', { screen: 'EmployeeList' })}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color={Colors.orange} />
          </TouchableOpacity>
        </View>
      </>
    ),
    [stats, error, search, navigation, reload, openFilter]
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.summaryCard}>
        <View style={styles.crownCircle}>
          <Crown size={22} color={Colors.orange} />
        </View>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.summaryTitle}>Get Smart Summaries</Text>
          <Text style={styles.summaryDesc}>
            Generate weekly or monthly reports for any employee
          </Text>
        </View>
        <TouchableOpacity
          style={styles.summaryCta}
          onPress={() => navigation.navigate('AdminEmployees', { screen: 'EmployeeList' })}
        >
          <Text style={styles.summaryCtaText}>Browse employees</Text>
          <ChevronRight size={16} color={Colors.orange} />
        </TouchableOpacity>
      </View>
    ),
    [navigation]
  );

  if (loading && stats === null && !error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.loadingLabel}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.bgFull}>
        <MapGridBackground />
      </View>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <Text style={styles.empty}>No employees match your filters.</Text>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.orange}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>Pro Map</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate('AdminEmployees', { screen: 'EmployeeList' });
              }}
            >
              <Text style={styles.menuItemText}>All employees</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate('AdminSettings');
              }}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                void logout();
              }}
            >
              <Text style={[styles.menuItemText, { color: Colors.error }]}>Log out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={filterOpen} transparent animationType="slide">
        <Pressable style={styles.filterOverlay} onPress={() => setFilterOpen(false)}>
          <Pressable style={styles.filterSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterTitle}>Filters</Text>
            <Text style={styles.filterSection}>Status</Text>
            <View style={styles.chipRow}>
              {(['all', 'active', 'inactive'] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, draftStatus === k && styles.chipOn]}
                  onPress={() => setDraftStatus(k)}
                >
                  <Text style={[styles.chipTxt, draftStatus === k && styles.chipTxtOn]}>
                    {k === 'all' ? 'All' : k === 'active' ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterSection}>Last activity</Text>
            <View style={styles.chipRow}>
              {(['all', 'today', 'week'] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, draftDate === k && styles.chipOn]}
                  onPress={() => setDraftDate(k)}
                >
                  <Text style={[styles.chipTxt, draftDate === k && styles.chipTxtOn]}>
                    {k === 'all' ? 'Any' : k === 'today' ? 'Today' : '7 days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilter}>
              <LinearGradient
                colors={[Colors.orange, Colors.gold]}
                style={styles.applyGrad}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              >
                <Text style={styles.applyTxt}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  bgFull: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
  },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingLabel: { marginTop: 12, color: Colors.textMuted, fontWeight: '600' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  bell: { padding: 8 },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  welcomeAccent: { color: Colors.orange },
  sub: { fontSize: 14, color: Colors.textMuted, marginBottom: 18 },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.1)',
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: { color: Colors.error, fontWeight: '600', marginBottom: 10 },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  retryBtnText: { color: Colors.orange, fontWeight: '800' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 6 },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: 'rgba(249,115,22,0.08)',
  },
  filterBtnText: { color: Colors.orange, fontWeight: '800', fontSize: 14 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { color: Colors.orange, fontWeight: '800', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 24, fontWeight: '600' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0E0E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  crownCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(249,115,22,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTitle: { fontSize: 16, fontWeight: '900', color: Colors.text, marginBottom: 4 },
  summaryDesc: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  summaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  summaryCtaText: { color: Colors.orange, fontWeight: '800', fontSize: 12 },
  greenDotWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingLeft: 12,
  },
  menuSheet: {
    width: '78%',
    maxWidth: 300,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
  },
  menuTitle: { fontSize: 18, fontWeight: '900', color: Colors.text, marginBottom: 16 },
  menuItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  menuItemText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterTitle: { fontSize: 20, fontWeight: '900', color: Colors.text, marginBottom: 16 },
  filterSection: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 10,
    marginTop: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#161616',
  },
  chipOn: { borderColor: Colors.orange, backgroundColor: 'rgba(249,115,22,0.12)' },
  chipTxt: { color: Colors.textMuted, fontWeight: '800', fontSize: 13 },
  chipTxtOn: { color: Colors.orange },
  applyBtn: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  applyGrad: { paddingVertical: 14, alignItems: 'center' },
  applyTxt: { color: '#0B0B0B', fontWeight: '900', fontSize: 16 },
});
