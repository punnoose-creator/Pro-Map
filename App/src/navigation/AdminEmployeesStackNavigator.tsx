import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AdminEmployeeDirectoryScreen } from '../screens/admin/AdminEmployeeDirectoryScreen';
import { AdminEmployeeActivityScreen } from '../screens/admin/AdminEmployeeActivityScreen';
import type { AdminEmployeesStackParamList } from './adminTypes';

const Stack = createStackNavigator<AdminEmployeesStackParamList>();

export function AdminEmployeesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeList" component={AdminEmployeeDirectoryScreen} />
      <Stack.Screen name="EmployeeActivity" component={AdminEmployeeActivityScreen} />
    </Stack.Navigator>
  );
}
