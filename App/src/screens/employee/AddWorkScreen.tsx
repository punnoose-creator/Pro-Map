import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import type { StackScreenProps } from '@react-navigation/stack';
import axios from 'axios';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Paperclip,
  Mic,
  Sparkles,
  Lock,
  Send,
  Plus,
  History,
} from 'lucide-react-native';
import type { EmployeeStackParamList } from '../../navigation/employeeTypes';
import { Colors } from '../../theme/colors';
import { useLocationSnapshot } from '../../hooks/useLocationSnapshot';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { postWorkLog } from '../../services/workLogApi';
import { enqueueOfflineWork, flushOfflineWorkQueue } from '../../services/workLogOfflineQueue';
import {
  loadSuggestionChips,
  rememberSuggestion,
  clearCustomSuggestions,
} from '../../services/suggestionHistory';

type Props = StackScreenProps<EmployeeStackParamList, 'AddWork'>;

const MAX_CHARS = 1000;
const MIN_CHARS = 3;

function formatHeaderTime(d = new Date()) {
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const day = isToday
    ? 'Today'
    : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

function WaveBars() {
  const heights = [10, 18, 12, 22, 14];
  return (
    <View style={styles.waveRow}>
      {heights.map((h, i) => (
        <View key={i} style={[styles.waveBar, { height: h }]} />
      ))}
    </View>
  );
}

export function AddWorkScreen({ navigation }: Props) {
  const [now, setNow] = useState(() => new Date());
  const { coords, error: locError, loading: locLoading, refresh: refreshLocation } =
    useLocationSnapshot();
  const [text, setText] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const appendVoice = useCallback((chunk: string) => {
    setText((prev) => {
      const sep = prev.trim() ? ' ' : '';
      return (prev + sep + chunk).slice(0, MAX_CHARS);
    });
  }, []);

  const { isListening, partialText, hint, toggleListening, stopVoice, voiceView } =
    useVoiceInput(appendVoice);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void (async () => {
      const list = await loadSuggestionChips();
      setChips(list);
    })();
  }, []);

  useEffect(() => {
    void flushOfflineWorkQueue();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const charsLeft = MAX_CHARS - text.length;
  const canSubmit =
    text.trim().length > 0 && text.trim().length <= MAX_CHARS && !submitting && !isListening;

  const applyChip = useCallback((c: string) => {
    setText((prev) => (prev ? `${prev.trim()}\n${c}` : c).slice(0, MAX_CHARS));
  }, []);

  const onClearSuggestions = useCallback(async () => {
    await clearCustomSuggestions();
    const list = await loadSuggestionChips();
    setChips(list);
  }, []);

  const onAttach = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      const name = asset?.name ?? 'file';
      setText((prev) =>
        `${prev.trim()}\n[Attachment: ${name}]`.trim().slice(0, MAX_CHARS)
      );
    } catch {
      Alert.alert('Attachment', 'Could not pick a file.');
    }
  }, []);

  const onAiAssist = useCallback(() => {
    Alert.alert('AI assist', 'Smart drafting will be available in a future update.');
  }, []);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('Update required', 'Please type or speak your work update.');
      return;
    }
    if (trimmed.length < MIN_CHARS) {
      Alert.alert(
        'A bit more detail',
        `Please enter at least ${MIN_CHARS} characters so the server can process your note.`
      );
      return;
    }
    if (!coords) {
      Alert.alert('Location', locError ?? 'Location not captured yet.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => void refreshLocation() },
      ]);
      return;
    }

    await stopVoice();
    setSubmitting(true);
    const timestamp = new Date().toISOString();
    const payload = {
      text: trimmed,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp,
    };

    try {
      const data = await postWorkLog(payload);
      if (data?.success) {
        await rememberSuggestion(trimmed);
        setToast('Saved successfully');
        void flushOfflineWorkQueue();
        setTimeout(() => navigation.goBack(), 1200);
      } else {
        Alert.alert('Could not save', data?.message ?? 'Please try again.');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && (!err.response || err.code === 'ERR_NETWORK')) {
        await enqueueOfflineWork(payload);
        setToast('Saved offline — will sync when you are back online');
        await rememberSuggestion(trimmed);
        setTimeout(() => navigation.goBack(), 1600);
      } else {
        const msg =
          axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
            ? String((err.response.data as { message?: string }).message ?? 'Request failed')
            : 'Could not save your update.';
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [text, coords, locError, refreshLocation, stopVoice, navigation]);

  const locationOk = !!coords && !locError;

  const titleRight = useMemo(
    () => (
      <TouchableOpacity
        style={styles.locBtn}
        onPress={() => void refreshLocation()}
        hitSlop={10}
      >
        <MapPin color="#0B0B0B" size={20} strokeWidth={2.2} />
      </TouchableOpacity>
    ),
    [refreshLocation]
  );

  return (
    <View style={styles.root}>
      {voiceView}
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={14}>
              <ArrowLeft color={Colors.orange} size={26} strokeWidth={2.4} />
            </TouchableOpacity>
            <View style={styles.titleCenter}>
              <Text style={styles.titlePlain}>Add </Text>
              <MaskedView
                style={styles.titleMask}
                maskElement={
                  <Text style={styles.titleMaskText}>Work Update</Text>
                }
              >
                <LinearGradient
                  colors={[Colors.orange, Colors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </MaskedView>
            </View>
            {titleRight}
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoPill}>
              <View style={styles.infoHalf}>
                <Clock size={18} color={Colors.orange} style={{ marginRight: 8 }} />
                <Text style={styles.infoText} numberOfLines={2}>
                  {formatHeaderTime(now)}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={[styles.infoHalf, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <MapPin size={18} color={Colors.orange} style={{ marginRight: 8 }} />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {locLoading ? 'Capturing location…' : 'Current Location Captured'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.locDot,
                    locationOk && styles.locDotOn,
                    locError && styles.locDotErr,
                  ]}
                />
              </View>
            </View>
            {locError ? (
              <TouchableOpacity onPress={() => void refreshLocation()} style={styles.retryPill}>
                <Text style={styles.retryText}>{locError} — Tap to retry</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.headingRow}>
              <Text style={styles.heading}>
                What did you <Text style={styles.headingAccent}>work on?</Text>
              </Text>
              <Text style={styles.counter}>
                {text.length}/{MAX_CHARS}
              </Text>
            </View>

            <View style={styles.inputShell}>
              <TextInput
                style={styles.input}
                placeholder="Type your update here..."
                placeholderTextColor={Colors.textSubtle}
                multiline
                maxLength={MAX_CHARS}
                value={text}
                onChangeText={(t) => setText(t.slice(0, MAX_CHARS))}
                textAlignVertical="top"
              />
              <View style={styles.inputToolbar}>
                <Pressable hitSlop={10} onPress={onAttach}>
                  <Paperclip color={Colors.text} size={22} strokeWidth={2} />
                </Pressable>
                <Pressable hitSlop={10} onPress={toggleListening}>
                  <Mic color={Colors.orange} size={22} strokeWidth={2} />
                </Pressable>
                <Pressable hitSlop={10} onPress={onAiAssist}>
                  <Sparkles color={Colors.gold} size={22} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
            {partialText ? (
              <Text style={styles.partial}>Listening: {partialText}</Text>
            ) : null}
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}

            <View style={styles.voiceCard}>
              <TouchableOpacity
                style={[styles.micOuter, isListening && styles.micOuterOn]}
                activeOpacity={0.9}
                onPress={toggleListening}
              >
                <LinearGradient
                  colors={[Colors.orange, Colors.gold]}
                  style={styles.micInner}
                >
                  <Mic color="#0B0B0B" size={32} strokeWidth={2} />
                </LinearGradient>
              </TouchableOpacity>
              <WaveBars />
              <View style={styles.voiceCopy}>
                <Text style={styles.voiceTitle}>
                  Speak <Text style={styles.voiceTitleAccent}>your update</Text>
                </Text>
                <Text style={styles.voiceBullet}>✓ Tap to start speaking</Text>
                <Text style={styles.voiceBullet}>✓ Speech will be converted to text</Text>
                <Text style={styles.voiceBullet}>✓ You can edit before submitting</Text>
              </View>
            </View>

            <View style={styles.suggestHeader}>
              <View style={styles.suggestTitleRow}>
                <History size={16} color={Colors.orange} />
                <Text style={styles.suggestTitle}>Recent Suggestions</Text>
              </View>
              <TouchableOpacity onPress={onClearSuggestions}>
                <Text style={styles.clearLink}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chipWrap}>
              {chips.map((c) => (
                <TouchableOpacity key={c} style={styles.chip} onPress={() => applyChip(c)}>
                  <Plus size={14} color={Colors.orange} strokeWidth={3} />
                  <Text style={styles.chipText} numberOfLines={2}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              disabled={!canSubmit}
              onPress={() => void submit()}
              style={[styles.submitWrap, !canSubmit && styles.submitDisabled]}
            >
              <LinearGradient
                colors={[Colors.orange, Colors.gold]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.submitBtn}
              >
                {submitting ? (
                  <ActivityIndicator color="#0B0B0B" />
                ) : (
                  <>
                    <Send color="#0B0B0B" size={22} style={{ marginRight: 10 }} />
                    <Text style={styles.submitLabel}>SUBMIT UPDATE</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerPill}>
              <Lock size={16} color={Colors.orange} style={{ marginRight: 8 }} />
              <Text style={styles.footerText}>Saved with time & location</Text>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  titleCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titlePlain: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  titleMask: { height: 24, justifyContent: 'center' },
  titleMaskText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  locBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orange,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  infoHalf: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  infoDivider: { width: 1, backgroundColor: '#2A2A2A', marginHorizontal: 6 },
  infoText: { flex: 1, color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  locDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#444',
    marginLeft: 6,
  },
  locDotOn: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  locDotErr: { backgroundColor: Colors.error },
  retryPill: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.12)',
    marginBottom: 12,
  },
  retryText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 10,
  },
  heading: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.text, paddingRight: 12 },
  headingAccent: { color: Colors.orange },
  counter: { fontSize: 12, color: Colors.textSubtle, fontWeight: '700' },
  inputShell: {
    backgroundColor: '#111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
    padding: 14,
    minHeight: 200,
    shadowColor: Colors.orange,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 140,
  },
  inputToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  partial: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.gold,
    fontStyle: 'italic',
  },
  hint: { marginTop: 6, fontSize: 12, color: Colors.textMuted },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    padding: 16,
    marginTop: 18,
    marginBottom: 18,
    gap: 12,
  },
  micOuter: {
    padding: 3,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(249,115,22,0.5)',
  },
  micOuterOn: {
    borderColor: Colors.gold,
    shadowColor: Colors.orange,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  micInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 28,
    marginRight: 4,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(251,191,36,0.85)',
  },
  voiceCopy: { flex: 1 },
  voiceTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  voiceTitleAccent: { color: Colors.orange },
  voiceBullet: { fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginBottom: 2 },
  suggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  suggestTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  clearLink: { fontSize: 14, fontWeight: '700', color: Colors.link },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.4)',
    backgroundColor: 'rgba(249,115,22,0.08)',
    maxWidth: '100%',
  },
  chipText: { color: Colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  submitWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: Colors.orange,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  submitDisabled: { opacity: 0.45 },
  submitBtn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    color: '#0B0B0B',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#222',
  },
  footerText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 36,
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.45)',
  },
  toastText: { color: Colors.text, textAlign: 'center', fontWeight: '700' },
});
