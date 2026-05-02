import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import axios from 'axios';
import { LOCATION_TASK_NAME } from '../tasks/locationTask';
const API_BASE = 'https://backend-three-sepia-51.vercel.app/api';
type User = {
  _id: string;
  fullName: string;
  email: string;
  role: 'employee' | 'admin' | 'manager';
  department: string;
  employeeId: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('userToken');
      const storedUser = await SecureStore.getItemAsync('userData');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (e) {
      console.error('Failed to load auth state', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    await SecureStore.setItemAsync('userToken', newToken);
    await SecureStore.setItemAsync('userData', JSON.stringify(newUser));

    // Auto-start a shift on login (working hours = login to logout)
    if (newUser.role === 'employee') {
      try {
        await axios.post(`${API_BASE}/shifts/start`);
        console.log('Shift auto-started on login');
      } catch (err: any) {
        // 400 = shift already active for today, which is fine
        if (err.response?.status !== 400) {
          console.warn('Could not auto-start shift on login:', err.message);
        }
      }
    }
  };

  const logout = async () => {
    // Stop background location tracking first (harmless if not running)
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (_) {}

    // Stop the active shift (employees only)
    if (user?.role === 'employee') {
      try {
        await axios.post(`${API_BASE}/shifts/stop`);
      } catch (err: any) {
        if (err.response?.status !== 400) {
          console.warn('Could not auto-stop shift on logout:', err.message);
        }
      }
    }

    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { API_BASE };
