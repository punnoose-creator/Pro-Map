import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../config/constants';
import { STORAGE } from '../constants/storageKeys';
import { stopBackgroundTracking } from '../services/locationLifecycle';
import { clearOfflineWorkQueue } from '../services/workLogOfflineQueue';
import type { AuthUser } from '../services/authApi';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSecureSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORAGE.TOKEN_KEY);
    await SecureStore.deleteItemAsync(STORAGE.USER_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remember = await AsyncStorage.getItem(STORAGE.REMEMBER_KEY);
        if (remember !== '1') {
          await clearSecureSession();
          if (!cancelled) setLoading(false);
          return;
        }
        const storedToken = await SecureStore.getItemAsync(STORAGE.TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(STORAGE.USER_KEY);
        if (storedToken && storedUser) {
          const parsed = JSON.parse(storedUser) as AuthUser;
          if (!cancelled) {
            setToken(storedToken);
            setUser(parsed);
            axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
          }
        }
      } catch (e) {
        console.warn('Auth restore failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSecureSession]);

  const login = useCallback(
    async (newToken: string, newUser: AuthUser, rememberMe: boolean) => {
      setToken(newToken);
      setUser(newUser);
      axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      await AsyncStorage.setItem(STORAGE.REMEMBER_KEY, rememberMe ? '1' : '0');
      if (rememberMe) {
        await SecureStore.setItemAsync(STORAGE.TOKEN_KEY, newToken);
        await SecureStore.setItemAsync(STORAGE.USER_KEY, JSON.stringify(newUser));
      } else {
        await clearSecureSession();
      }
    },
    [clearSecureSession]
  );

  const logout = useCallback(async () => {
    await stopBackgroundTracking();
    await clearOfflineWorkQueue();
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common.Authorization;
    await AsyncStorage.removeItem(STORAGE.REMEMBER_KEY);
    await AsyncStorage.removeItem(STORAGE.WORK_SESSION_START);
    await clearSecureSession();
  }, [clearSecureSession]);

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { API_BASE };
