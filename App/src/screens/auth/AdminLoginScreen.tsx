import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, User, Lock, Eye, EyeOff, ShieldUser, Check } from 'lucide-react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { loginRequest } from '../../services/authApi';
import { Colors } from '../../theme/colors';
import { validateIdentifier, validatePassword } from '../../utils/validation';
import { MapGridBackground } from '../../components/login/MapGridBackground';
import type { AuthStackParamList } from '../../navigation/types';
import axios from 'axios';

type Nav = StackNavigationProp<AuthStackParamList, 'AdminLogin'>;

export function AdminLoginScreen() {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setApiError(null);
    const e1 = validateIdentifier(identifier);
    const e2 = validatePassword(password);
    setIdError(e1);
    setPwError(e2);
    if (e1 || e2) return;

    setLoading(true);
    try {
      const data = await loginRequest(identifier, password);
      if (!data.success || !data.token || !data.employee) {
        setApiError(data.message?.trim() || 'Invalid credentials');
        return;
      }
      if (data.employee.role !== 'admin') {
        setApiError('This account is not an administrator.');
        return;
      }
      await login(data.token, data.employee, rememberMe);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response && err.request) {
          setApiError('Network error. Check your connection and try again.');
        } else {
          const msg =
            (err.response?.data as { message?: string })?.message ??
            err.message ??
            'Invalid credentials';
          setApiError(typeof msg === 'string' ? msg : 'Invalid credentials');
        }
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [identifier, password, rememberMe, login]);

  return (
    <View style={styles.root}>
      <MapGridBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.back}
              onPress={() => navigation.goBack()}
              hitSlop={16}
            >
              <ChevronLeft color={Colors.gold} size={28} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.headerIcon}>
              <LinearGradient
                colors={[Colors.orange, Colors.gold]}
                style={styles.badge}
              >
                <ShieldUser color="#0B0B0B" size={32} strokeWidth={2} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Administrator access</Text>
            <Text style={styles.sub}>
              Sign in with your admin credentials. Employee accounts are not accepted here.
            </Text>

            {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

            <View style={[styles.field, idError ? styles.fieldError : null]}>
              <User size={20} color={Colors.orange} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email or Username"
                placeholderTextColor={Colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  if (idError) setIdError(null);
                  setApiError(null);
                }}
              />
            </View>
            {idError ? <Text style={styles.inlineErr}>{idError}</Text> : null}

            <View style={[styles.field, pwError ? styles.fieldError : null]}>
              <Lock size={20} color={Colors.orange} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textSubtle}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (pwError) setPwError(null);
                  setApiError(null);
                }}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eye}>
                {showPassword ? (
                  <EyeOff size={22} color={Colors.orange} />
                ) : (
                  <Eye size={22} color={Colors.orange} />
                )}
              </Pressable>
            </View>
            {pwError ? <Text style={styles.inlineErr}>{pwError}</Text> : null}

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe((r) => !r)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                {rememberMe ? <Check size={14} color="#0B0B0B" strokeWidth={3} /> : null}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={submit}
              disabled={loading}
              style={styles.primaryWrap}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.gold]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.primaryBtn, loading && styles.primaryDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="#0B0B0B" />
                ) : (
                  <Text style={styles.primaryLabel}>ADMIN LOGIN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert('Need help?', 'Contact your system owner for admin access.')
              }
            >
              <Text style={styles.help}>Cannot access your admin account?</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingBottom: 40 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backText: { color: Colors.gold, fontSize: 16, fontWeight: '600', marginLeft: -6 },
  headerIcon: { alignItems: 'center', marginBottom: 16 },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orange,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  apiError: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 6,
  },
  fieldError: { borderColor: Colors.error },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.text, fontSize: 16 },
  eye: { padding: 6 },
  inlineErr: { color: Colors.error, fontSize: 12, marginBottom: 10, marginLeft: 4 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.orange,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  rememberText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  primaryWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.85 },
  primaryLabel: {
    color: '#0B0B0B',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  help: {
    marginTop: 24,
    textAlign: 'center',
    color: Colors.link,
    fontSize: 14,
    fontWeight: '600',
  },
});
