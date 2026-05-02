import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Square, Mic, Radar, LogOut, AlertCircle } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { useAuth, API_BASE } from '../../context/AuthContext';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import axios from 'axios';
import * as Location from 'expo-location';

export const DashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const { isTracking, startTracking, stopTracking } = useLocationTracker();

  const handleStartWork = async () => {
    try {
      // 1. Tell backend shift started
      const res = await axios.post(`${API_BASE}/shifts/start`);
      if (res.data.success) {
        // 2. Immediately send a foreground location ping
        //    (so admin can see the employee's starting position even in Expo Go)
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            await axios.post(`${API_BASE}/locations/ping`, {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              altitude: loc.coords.altitude,
              speed: loc.coords.speed,
              heading: loc.coords.heading,
              clientRecordedAt: new Date(loc.timestamp).toISOString(),
            });
            console.log('Initial foreground location ping sent');
          }
        } catch (locErr) {
          console.warn('Could not send initial location ping:', locErr);
        }

        // 3. Start background location tracking (only works in standalone builds)
        const started = await startTracking();
        if (started) {
          Alert.alert('Shift Started', 'Your location is now being tracked in the background.');
        } else {
          Alert.alert('Shift Started', 'Shift recorded. Background tracking is limited in Expo Go — your starting location has been recorded.');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not start shift');
    }
  };

  const handleStopWork = async () => {
    try {
      await stopTracking();
      await axios.post(`${API_BASE}/shifts/stop`);
      Alert.alert('Shift Stopped', 'Location tracking has been disabled.');
    } catch (error: any) {
      console.error('Stop Work Error:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out? Your shift will be stopped if active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // stopTracking() is harmless if not running; logout() handles shift stop
            await stopTracking();
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Hello, {user?.fullName.split(' ')[0]}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={{color: Colors.textMuted, marginRight: 8, fontWeight: '600'}}>Logout</Text>
            <LogOut size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoSubtitle}>
            Start your shift to share an accurate GPS checkpoint every five minutes.
          </Text>
        </View>

        {isTracking && (
          <View style={styles.trackingPanel}>
            <Radar size={24} color={Colors.primary} style={styles.trackingIcon} />
            <View>
              <Text style={styles.trackingTitle}>Shift Active</Text>
              <Text style={styles.trackingSubtitle}>
                High-accuracy GPS samples post every 5 minutes.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          {!isTracking ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStartWork}>
              <Text style={styles.btnLabel}>Start Work</Text>
              <Play size={20} color={Colors.black} fill={Colors.black} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStopWork}>
              <Text style={styles.btnLabel}>Stop Work</Text>
              <Square size={20} color={Colors.white} fill={Colors.white} />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('LogVisit')}
          >
            <Mic size={24} color={Colors.primary} />
            <Text style={styles.secondaryBtnLabel}>Speak / Log Visit</Text>
          </TouchableOpacity>

          {/* Prominent Logout Button */}
          <TouchableOpacity style={styles.logoutFullBtn} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.logoutFullText}>Logout</Text>
          </TouchableOpacity>
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
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  infoCard: {
    marginBottom: 32,
  },
  infoSubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 24,
  },
  trackingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    marginBottom: 32,
  },
  trackingIcon: {
    marginRight: 16,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 4,
  },
  trackingSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actions: {
    gap: 16,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stopBtn: {
    backgroundColor: '#ef4444',
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  btnLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
  },
  secondaryBtn: {
    backgroundColor: Colors.surface,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  secondaryBtnLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  logoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    marginTop: 8,
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutFullText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
