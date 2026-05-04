import React, { type ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutGrid, MapPin, Users, Settings } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminMapScreen } from '../screens/admin/AdminMapScreen';
import { AdminEmployeesStackNavigator } from './AdminEmployeesStackNavigator';
import { AdminSettingsScreen } from '../screens/admin/AdminSettingsScreen';
import type { AdminTabParamList } from './adminTypes';

const Tab = createBottomTabNavigator<AdminTabParamList>();

type IconComp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

function TabIcon({
  focused,
  color,
  Icon,
}: {
  focused: boolean;
  color: string;
  Icon: IconComp;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused ? <View style={styles.activeBar} /> : <View style={styles.activeSpacer} />}
      <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

export function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#070707',
          borderTopColor: '#1F1F1F',
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.orange,
        tabBarInactiveTintColor: Colors.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={LayoutGrid} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminMap"
        component={AdminMapScreen}
        options={{
          title: 'Map View',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={MapPin} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminEmployees"
        component={AdminEmployeesStackNavigator}
        options={{
          title: 'Employees',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Users} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Settings} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'flex-start' },
  activeBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.orange,
    marginBottom: 6,
    shadowColor: Colors.orange,
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 4,
  },
  activeSpacer: { height: 9 },
});
