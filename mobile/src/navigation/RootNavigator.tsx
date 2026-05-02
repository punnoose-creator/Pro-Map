import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/employee/DashboardScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminTrackingScreen } from '../screens/admin/AdminTrackingScreen';
import { LogVisitScreen } from '../screens/employee/LogVisitScreen';

const Stack = createStackNavigator();

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return null; // Or a splash screen

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminTracking" component={AdminTrackingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="EmployeeDashboard" component={DashboardScreen} />
            <Stack.Screen name="LogVisit" component={LogVisitScreen} />
            {/* Add Summary screen here later */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
