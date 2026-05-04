import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  MapPin,
  Play,
  Pause,
  ClipboardList,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { MapGridBackground } from '../../components/login/MapGridBackground';
import { useWorkLocation } from '../../hooks/useWorkLocation';
import { useSessionDuration } from '../../hooks/useSessionDuration';
import { STORAGE } from '../../constants/storageKeys';
import type { EmployeeStackParamList, EmployeeTabParamList } from '../../navigation/employeeTypes';

type DashboardNav = CompositeNavigationProp<
  BottomTabNavigationProp<EmployeeTabParamList, 'Dashboard'>,
  StackNavigationProp<EmployeeStackParamList>
>;

function firstName(fullName: string | undefined, email: string | undefined): string {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? fullName;
  }
  if (email?.trim()) return email.split('@')[0] ?? 'there';
  return 'there';
}

export function EmployeeDashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const { user, token, logout } = useAuth();
  const { isTracking, start, stop, errorMsg } = useWorkLocation(token);
  const durationLabel = useSessionDuration(isTracking);
  const [busy, setBusy] = useState(false);

  const displayName = firstName(user?.fullName, user?.email);

  const onToggleWork = useCallback(async () => {
    setBusy(true);
    try {
      if (isTracking) {
        await stop();
      } else {
        await start();
      }
    } finally {
      setBusy(false);
    }
  }, [isTracking, start, stop]);

  const onAddWork = useCallback(async () => {
    const sessionStartedAt = await AsyncStorage.getItem(STORAGE.WORK_SESSION_START);
    navigation.navigate('AddWork', { sessionStartedAt });
  }, [navigation]);

  const onLogout = useCallback(async () => {
    Alert.alert('Log out?', 'This will end your session and return you to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  }, [logout]);

  return (
    <View style={styles.root}>
      <View style={styles.bgDim}>
        <MapGridBackground />
      </View>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Hello,</Text>
              <MaskedView
                style={styles.nameMask}
                maskElement={
                  <View style={styles.nameMaskInner}>
                    <Text style={styles.nameText}>{displayName} 👋</Text>
                  </View>
                }
              >
                <LinearGradient
                  colors={[Colors.orange, Colors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </MaskedView>
              <Text style={styles.role}>Employee</Text>
            </View>
            <TouchableOpacity
              style={styles.bell}
              onPress={() => Alert.alert('Notifications', 'You have no new notifications.')}
              hitSlop={12}
            >
              <Bell size={26} color={Colors.orange} strokeWidth={2} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {errorMsg ? <Text style={styles.banner}>{errorMsg}</Text> : null}

          <View style={[styles.statusCard, isTracking && styles.statusCardActive]}>
            <View style={styles.statusLeft}>
              <View style={styles.pinGlow}>
                <LinearGradient colors={[Colors.orange, Colors.gold]} style={styles.pinCircle}>
                  <MapPin color="#0B0B0B" size={26} strokeWidth={2.2} />
                </LinearGradient>
              </View>
              <View style={styles.statusTextCol}>
                <Text style={styles.statusTitle}>Work Status</Text>
                <Text style={[styles.statusState, isTracking && styles.statusStateOn]}>
                  {isTracking ? 'Active' : 'Not Started'}
                </Text>
                <Text style={styles.statusSub}>
                  {isTracking
                    ? 'Location updates are sent about every 5 minutes while you work.'
                    : 'Start your work session to track your location'}
                </Text>
                {durationLabel ? (
                  <Text style={styles.timer}>{durationLabel}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.statusDecor}>
              <LinearGradient
                colors={['rgba(249,115,22,0.35)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <MapPin color={Colors.orange} size={48} style={{ opacity: 0.25 }} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionGlow]}
            activeOpacity={0.88}
            onPress={onToggleWork}
            disabled={busy}
          >
            <View style={styles.actionIconWrap}>
              {isTracking ? (
                <Pause color={Colors.orange} size={26} fill={Colors.orange} strokeWidth={0} />
              ) : (
                <Play color={Colors.orange} size={26} fill={Colors.orange} strokeWidth={0} />
              )}
            </View>
            <View style={styles.actionMid}>
              <Text style={styles.actionTitle}>{isTracking ? 'Stop Work' : 'Start Work'}</Text>
              <Text style={styles.actionDesc}>
                {isTracking
                  ? 'Stop tracking and end your foreground work session.'
                  : 'Start your work session and we will track your location every 5 minutes.'}
              </Text>
            </View>
            <ChevronRight color={Colors.orange} size={22} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionGlow]}
            activeOpacity={0.88}
            onPress={onAddWork}
          >
            <View style={styles.actionIconWrap}>
              <ClipboardList color={Colors.orange} size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.actionMid}>
              <Text style={styles.actionTitle}>Add Work</Text>
              <Text style={styles.actionDesc}>
                Add your work update using text or voice and submit.
              </Text>
            </View>
            <ChevronRight color={Colors.orange} size={22} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionGlow]}
            activeOpacity={0.88}
            onPress={onLogout}
          >
            <View style={styles.actionIconWrap}>
              <LogOut color={Colors.orange} size={24} strokeWidth={2.2} />
            </View>
            <View style={styles.actionMid}>
              <Text style={styles.actionTitle}>Log Out</Text>
              <Text style={styles.actionDesc}>End your session and log out from the app.</Text>
            </View>
            <ChevronRight color={Colors.orange} size={22} />
          </TouchableOpacity>

          <View style={{ height: 96 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  bgDim: { ...StyleSheet.absoluteFillObject, opacity: 0.55 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  hello: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  nameMask: { height: 40, justifyContent: 'center', marginTop: 2, maxWidth: '100%' },
  nameMaskInner: { flex: 1, justifyContent: 'center' },
  nameText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  role: { marginTop: 6, fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  bell: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.45)',
    backgroundColor: 'rgba(249,115,22,0.08)',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  banner: {
    color: Colors.error,
    marginBottom: 10,
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: Colors.orange,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  statusCardActive: {
    borderColor: 'rgba(249,115,22,0.55)',
    shadowColor: Colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 12,
  },
  statusLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pinGlow: {
    shadowColor: Colors.orange,
    shadowOpacity: 0.75,
    shadowRadius: 16,
    elevation: 10,
    marginRight: 14,
  },
  pinCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextCol: { flex: 1, paddingRight: 8 },
  statusTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusState: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.orange,
    marginBottom: 6,
  },
  statusStateOn: { color: Colors.gold },
  statusSub: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  timer: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gold,
  },
  statusDecor: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.06)',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  actionGlow: {
    shadowColor: Colors.orange,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  actionMid: { flex: 1, paddingRight: 8 },
  actionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
