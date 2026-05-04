import type { NavigatorScreenParams } from '@react-navigation/native';

export type AdminEmployeesStackParamList = {
  EmployeeList: undefined;
  EmployeeActivity: { employeeId: string; fullName?: string };
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminMap: undefined;
  AdminEmployees: NavigatorScreenParams<AdminEmployeesStackParamList>;
  AdminSettings: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
};
