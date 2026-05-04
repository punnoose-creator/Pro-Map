import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { AdminLoginScreen } from '../screens/auth/AdminLoginScreen';
import type { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    </Stack.Navigator>
  );
}
