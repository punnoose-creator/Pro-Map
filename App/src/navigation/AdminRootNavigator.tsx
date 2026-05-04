import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AdminDashboardProvider } from '../context/AdminDashboardContext';
import { AdminTabNavigator } from './AdminTabNavigator';
import type { AdminStackParamList } from './adminTypes';

const Stack = createStackNavigator<AdminStackParamList>();

export function AdminRootNavigator() {
  return (
    <AdminDashboardProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
      </Stack.Navigator>
    </AdminDashboardProvider>
  );
}
