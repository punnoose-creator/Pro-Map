import React, { useEffect } from 'react';
import Constants from 'expo-constants';
import { pushCrashDebugLine } from './crashDebugBuffer';

/** One line on cold start so Settings diagnostics is never completely empty if JS runs. */
export function AppBootDiagnostic() {
  useEffect(() => {
    const meta = {
      dev: __DEV__,
      executionEnvironment: Constants.executionEnvironment,
      appVersion: Constants.expoConfig?.version,
      nativeAppVersion: Constants.nativeAppVersion,
      nativeBuildVersion: Constants.nativeBuildVersion,
    };
    pushCrashDebugLine('App', 'JS bundle started', JSON.stringify(meta));
  }, []);
  return null;
}
