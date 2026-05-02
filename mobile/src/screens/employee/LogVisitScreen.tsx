import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Send, ChevronLeft, MicOff, LogOut } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { useAuth, API_BASE } from '../../context/AuthContext';
import axios from 'axios';
import { Audio } from 'expo-av';

// Try to import Voice, but gracefully handle if the native module is not available (Expo Go)
let Voice: any = null;
let voiceAvailable = false;
try {
  Voice = require('@react-native-voice/voice').default;
  voiceAvailable = true;
} catch (e) {
  voiceAvailable = false;
}

export const LogVisitScreen = ({ navigation }: any) => {
  const { logout } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');

  // Ref tracks whether the user wants an active recording session.
  // Using a ref (not state) so async callbacks always see the latest value.
  const sessionActiveRef = useRef(false);

  useEffect(() => {
    if (!Voice || !voiceAvailable) return;

    try {
      Voice.onSpeechStart = () => {
        setIsListening(true);
        setVoiceStatus('');
      };

      Voice.onSpeechEnd = () => {
        setIsListening(false);
        // Auto-restart if the user's session is still active
        if (sessionActiveRef.current) {
          setTimeout(async () => {
            if (sessionActiveRef.current) {
              try { await Voice.start('en-US'); } catch (_) {}
            }
          }, 300);
        }
      };

      Voice.onSpeechError = (e: any) => {
        setIsListening(false);
        const code = String(e?.error?.code ?? '');
        // Codes 5/6/7 = client error / timeout / no match — transient, restart silently
        if (sessionActiveRef.current && ['5', '6', '7'].includes(code)) {
          setTimeout(async () => {
            if (sessionActiveRef.current) {
              try { await Voice.start('en-US'); } catch (_) {}
            }
          }, 500);
        } else {
          sessionActiveRef.current = false;
          setVoiceStatus('Microphone stopped. Tap to speak again.');
        }
      };

      Voice.onSpeechResults = (e: any) => {
        if (e.value?.[0]) {
          setText(prev => (prev ? prev + ' ' + e.value[0] : e.value[0]));
        }
      };
    } catch (err) {
      console.warn('Voice listeners could not be set up:', err);
      voiceAvailable = false;
    }

    return () => {
      sessionActiveRef.current = false;
      if (Voice) {
        try { Voice.cancel(); } catch (_) {}
        try { Voice.destroy().then(Voice.removeAllListeners); } catch (_) {}
      }
    };
  }, []);

  const requestMicPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status === 'granted') {
        setMicPermissionGranted(true);
        return true;
      }
      Alert.alert(
        'Microphone Permission Required',
        'Please grant microphone access in your device settings to use voice input.',
        [{ text: 'OK' }]
      );
      return false;
    } catch (err) {
      return false;
    }
  };

  const toggleListening = async () => {
    if (!Voice || !voiceAvailable) {
      Alert.alert(
        'Voice Not Available',
        'Speech-to-text is not available in Expo Go. Please type your notes in the text box instead, or build a standalone APK to use the microphone.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (sessionActiveRef.current) {
      // Stop the session
      sessionActiveRef.current = false;
      setIsListening(false);
      setVoiceStatus('');
      try { await Voice.stop(); } catch (_) {}
    } else {
      // Start a new session
      if (!micPermissionGranted) {
        const granted = await requestMicPermission();
        if (!granted) return;
      }
      sessionActiveRef.current = true;
      setVoiceStatus('');
      try {
        await Voice.start('en-US');
      } catch (e: any) {
        sessionActiveRef.current = false;
        if (e?.message?.includes('null') || e?.message?.includes('undefined')) {
          Alert.alert(
            'Voice Not Available',
            'Speech recognition requires a standalone build. Please type your notes instead.'
          );
        } else {
          setVoiceStatus('Could not start microphone. Try again.');
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 3) {
      Alert.alert('Error', 'Please enter a valid note.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/log-entry`, { text });
      if (res.data.success) {
        Alert.alert('Success', `Logged to "${res.data.sheet}"`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to log visit');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out? Any unsaved notes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            sessionActiveRef.current = false;
            if (Voice && voiceAvailable) {
              try { await Voice.stop(); } catch (_) {}
            }
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Field Visit</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Speak or Type your visit notes</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g., Met with Mr. John at Emaar, discussed the new ELV maintenance contract..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={10}
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.micBtn, isListening && styles.micBtnActive]}
          onPress={toggleListening}
        >
          {isListening ? (
            <>
              <MicOff size={32} color={Colors.black} />
              <Text style={[styles.micLabel, { color: Colors.black }]}>Listening... Tap to Stop</Text>
            </>
          ) : (
            <>
              <Mic size={32} color={Colors.primary} />
              <Text style={styles.micLabel}>
                {sessionActiveRef.current ? 'Waiting for speech...' : 'Tap to Speak'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!!voiceStatus && (
          <Text style={styles.voiceStatus}>{voiceStatus}</Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (loading || isListening) && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading || isListening}
        >
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <>
              <Text style={styles.submitText}>Submit Log</Text>
              <Send size={20} color={Colors.black} />
            </>
          )}
        </TouchableOpacity>

        {/* Logout Button below Submit */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
    marginBottom: 24,
  },
  input: {
    color: Colors.white,
    fontSize: 16,
    lineHeight: 24,
  },
  micBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.primaryMuted,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 192, 168, 0.2)',
  },
  micBtnActive: {
    backgroundColor: Colors.primary,
  },
  micLabel: {
    marginTop: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submitText: {
    color: Colors.black,
    fontSize: 18,
    fontWeight: '700',
  },
  voiceStatus: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    marginTop: 24,
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
