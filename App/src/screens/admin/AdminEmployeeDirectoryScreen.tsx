import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { ChevronLeft, Search } from 'lucide-react-native';
import type { AdminEmployeesStackParamList } from '../../navigation/adminTypes';
import { Colors } from '../../theme/colors';
import { useAdminData } from '../../context/AdminDashboardContext';
import { AdminEmployeeRow } from '../../components/admin/AdminEmployeeRow';
import type { AdminEmployeeRow as EmpRow } from '../../services/adminDashboardApi';

type Props = StackScreenProps<AdminEmployeesStackParamList, 'EmployeeList'>;

export function AdminEmployeeDirectoryScreen({ navigation }: Props) {
  const { employees, geoByEmployeeId } = useAdminData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const onRow = useCallback(
    (item: EmpRow) => {
      navigation.navigate('EmployeeActivity', {
        employeeId: item._id,
        fullName: item.fullName,
      });
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {navigation.canGoBack() ? (
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <ChevronLeft color={Colors.gold} size={28} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.title}>All employees</Text>
      <View style={styles.search}>
        <Search size={20} color={Colors.textSubtle} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.input}
          placeholder="Search by name or email..."
          placeholderTextColor={Colors.textSubtle}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <AdminEmployeeRow
            item={item}
            geo={geoByEmployeeId[item._id]}
            onPress={() => onRow(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No employees found.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: Colors.gold, fontSize: 16, fontWeight: '600', marginLeft: -6 },
  title: { fontSize: 22, fontWeight: '900', color: Colors.text, marginBottom: 14 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  input: { flex: 1, color: Colors.text, fontSize: 15 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontWeight: '600' },
});
