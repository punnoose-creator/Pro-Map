import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { MapPin, User, Lock, Eye, EyeOff, Check, ShieldUser } from 'lucide-react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { loginRequest } from '../../services/authApi';
import { APP_VERSION, FORGOT_PASSWORD_URL } from '../../config/constants';
import { Colors } from '../../theme/colors';
import { validateIdentifier, validatePassword } from '../../utils/validation';
import { MapGridBackground } from '../../components/login/MapGridBackground';
import { GradientTitle } from '../../components/login/GradientTitle';
import { FooterWaves } from '../../components/login/FooterWaves';
import type { AuthStackParamList } from '../../navigation/types';
import axios from 'axios';

type LoginNav = StackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const onForgotPassword = useCallback(() => {
    if (FORGOT_PASSWORD_URL) {
      Linking.openURL(FORGOT_PASSWORD_URL).catch(() =>
        Alert.alert('Unable to open link', 'Please try again later.')
      );
    } else {
      Alert.alert(
        'Forgot password?',
        'Contact your administrator to reset your credentials.'
      );
    }
  }, []);

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
            <View style={styles.hero}>
              <View style={styles.pinGlow}>
                <LinearGradient
                  colors={[Colors.orange, Colors.gold]}
                  style={styles.pinCircle}
                >
                  <MapPin color="#0B0B0B" size={44} strokeWidth={2.2} />
                </LinearGradient>
              </View>
              <GradientTitle />
            </View>

            <View style={styles.card}>
              <Text style={styles.welcome}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Login to continue to your account</Text>

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
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={12}
                  style={styles.eye}
                >
                  {showPassword ? (
                    <EyeOff size={22} color={Colors.orange} />
                  ) : (
                    <Eye size={22} color={Colors.orange} />
                  )}
                </Pressable>
              </View>
              {pwError ? <Text style={styles.inlineErr}>{pwError}</Text> : null}

              <View style={styles.row}>
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
                <TouchableOpacity onPress={onForgotPassword}>
                  <Text style={styles.forgot}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

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
                    <Text style={styles.primaryLabel}>LOGIN</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity
                style={styles.adminBtn}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('AdminLogin')}
              >
                <ShieldUser size={20} color={Colors.gold} style={{ marginRight: 10 }} />
                <Text style={styles.adminLabel}>Login as Admin</Text>
              </TouchableOpacity>

              <Text style={styles.version}>v{APP_VERSION}</Text>
            </View>
          </ScrollView>
          <FooterWaves />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  pinGlow: {
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 24,
    elevation: 18,
  },
  pinCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginTop: 8,
    borderRadius: 20,
    paddingVertical: 8,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  apiError: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
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
  fieldError: {
    borderColor: Colors.error,
  },
  fieldIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  eye: { padding: 6 },
  inlineErr: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 22,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.orange,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxOn: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  rememberText: { color: Colors.text, fontSize: 14, fontWeight: '500' },
  forgot: { color: Colors.link, fontSize: 14, fontWeight: '600' },
  primaryWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#2F2F2F' },
  orText: { color: Colors.textSubtle, fontSize: 12, fontWeight: '700' },
  adminBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
  },
  adminLabel: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 12,
    color: Colors.textSubtle,
  },
});
