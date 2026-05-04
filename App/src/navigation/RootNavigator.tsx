import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { AuthStackNavigator } from './AuthStackNavigator';
import { EmployeeRootNavigator } from './EmployeeRootNavigator';
import { AdminRootNavigator } from './AdminRootNavigator';
import { Colors } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
  },
};

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStackNavigator} />
        ) : user.role === 'admin' || user.role === 'manager' ? (
          <Stack.Screen name="AdminRoot" component={AdminRootNavigator} />
        ) : (
          <Stack.Screen name="EmployeeRoot" component={EmployeeRootNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
