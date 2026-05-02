import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Radar, Activity, FileText, Users, ChevronRight, LogOut } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { useAuth, API_BASE } from '../../context/AuthContext';
import axios from 'axios';

type Stats = {
  activeInField: number;
  totalPings: number;
  totalLogsToday: number;
};

type Employee = {
  _id: string;
  fullName: string;
  employeeId: string;
  department: string;
};

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, empRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`),
        axios.get(`${API_BASE}/admin/employees`),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (empRes.data.success) setEmployees(empRes.data.employees);
    } catch (error) {
      console.error('Admin fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Admin Panel...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Overview</Text>
          <TouchableOpacity onPress={logout}>
            <LogOut size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Radar size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats?.activeInField || 0}</Text>
            <Text style={styles.statLabel}>Active Now</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Activity size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats?.totalPings || 0}</Text>
            <Text style={styles.statLabel}>Total Pings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field Workforce</Text>
          <View style={styles.employeeList}>
            {employees.map((emp) => (
              <TouchableOpacity
                key={emp._id}
                style={styles.employeeCard}
                onPress={() => navigation.navigate('AdminTracking', { employeeId: emp._id, fullName: emp.fullName })}
              >
                <View style={styles.empAvatar}>
                  <Text style={styles.avatarText}>{emp.fullName.charAt(0)}</Text>
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{emp.fullName}</Text>
                  <Text style={styles.empId}>{emp.employeeId} • {emp.department}</Text>
                </View>
                <ChevronRight size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textMuted,
    marginTop: 16,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconBox: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primaryMuted,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
  },
  employeeList: {
    gap: 12,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  empAvatar: {
    width: 44,
    height: 44,
    backgroundColor: '#2a2a2a',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 2,
  },
  empId: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
