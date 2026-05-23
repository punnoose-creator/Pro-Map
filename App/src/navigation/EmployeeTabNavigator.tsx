import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Clock, User } from 'lucide-react-native';
import { Colors } from '../theme/colors';
import { EmployeeDashboardScreen } from '../screens/employee/EmployeeDashboardScreen';
import { EmployeeHistoryScreen } from '../screens/employee/EmployeeHistoryScreen';
import { EmployeeProfileScreen } from '../screens/employee/EmployeeProfileScreen';
import type { EmployeeTabParamList } from './employeeTypes';

const Tab = createBottomTabNavigator<EmployeeTabParamList>();

function TabIcon({
  focused,
  color,
  Icon,
}: {
  focused: boolean;
  color: string;
  Icon: typeof Home;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused ? <View style={styles.activeBar} /> : <View style={styles.activeSpacer} />}
      <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

export function EmployeeTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#070707',
          borderTopColor: '#1F1F1F',
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.orange,
        tabBarInactiveTintColor: Colors.textSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={EmployeeDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Home} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={EmployeeHistoryScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Clock} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={EmployeeProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={User} />
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
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  activeSpacer: { height: 9, marginBottom: 0 },
});
