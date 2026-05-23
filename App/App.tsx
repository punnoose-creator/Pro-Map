import 'react-native-gesture-handler';
import './src/tasks/locationTask';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { AppBootDiagnostic } from './src/debug/AppBootDiagnostic';
import { AppErrorBoundary } from './src/debug/AppErrorBoundary';
import { CrashDebugOverlay } from './src/debug/CrashDebugOverlay';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <AppBootDiagnostic />
            <RootNavigator />
            <CrashDebugOverlay />
          </AuthProvider>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
