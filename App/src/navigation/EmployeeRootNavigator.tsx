import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { EmployeeTabNavigator } from './EmployeeTabNavigator';
import { AddWorkScreen } from '../screens/employee/AddWorkScreen';
import type { EmployeeStackParamList } from './employeeTypes';

const Stack = createStackNavigator<EmployeeStackParamList>();

export function EmployeeRootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={EmployeeTabNavigator} />
      <Stack.Screen name="AddWork" component={AddWorkScreen} />
    </Stack.Navigator>
  );
}
