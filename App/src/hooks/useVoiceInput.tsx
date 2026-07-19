import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import Voice, { type SpeechErrorEvent, type SpeechResultsEvent } from '@react-native-voice/voice';
import { Audio } from 'expo-av';

// Native on-device speech recognition (Android SpeechRecognizer / iOS SFSpeechRecognizer).
// Restart-on-end mimics a continuous session: each utterance ends recognition,
// so we immediately start a new one while the mic button is toggled on.
const LOCALE = 'en-US';
const RESTART_DELAY_MS = 300;

/** Android SpeechRecognizer ERROR_INSUFFICIENT_PERMISSIONS */
const PERMISSION_ERROR_CODE = '9';

export function useVoiceInput(onAppendText: (chunk: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [hint, setHint] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);

  const sessionActiveRef = useRef(false);
  /** Latest partial transcript — committed on manual stop so words aren't lost. */
  const partialRef = useRef('');
  const appendRef = useRef(onAppendText);
  appendRef.current = onAppendText;

  useEffect(() => {
    Voice.isAvailable()
      .then((result) => setAvailable(!!result))
      .catch(() => setAvailable(false));

    Voice.onSpeechStart = () => {
      setIsListening(true);
      setPartialText('');
      setHint('');
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0];
      if (text) {
        setPartialText(text);
        partialRef.current = text;
      }
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0];
      // Ignore finals that land after a manual stop — stopVoice already
      // committed the partial, so appending here would duplicate the words.
      if (text && sessionActiveRef.current) {
        appendRef.current(text);
        setPartialText('');
        partialRef.current = '';
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      const code = e.error?.code ?? '';
      const blocked = code === PERMISSION_ERROR_CODE || /permission/i.test(e.error?.message ?? '');
      setIsListening(false);
      setPartialText('');
      partialRef.current = '';
      if (blocked) {
        sessionActiveRef.current = false;
        setHint('Microphone access blocked. Check app permissions.');
        return;
      }
      // Recoverable (no speech detected, timeout, etc.) — restart if still in an active session.
      if (sessionActiveRef.current) {
        setTimeout(() => {
          if (sessionActiveRef.current) void Voice.start(LOCALE).catch(() => {});
        }, RESTART_DELAY_MS);
      }
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      if (sessionActiveRef.current) {
        setTimeout(() => {
          if (sessionActiveRef.current) void Voice.start(LOCALE).catch(() => {});
        }, RESTART_DELAY_MS);
      } else {
        setHint('');
      }
    };

    return () => {
      sessionActiveRef.current = false;
      void Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  const requestMic = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Microphone', 'Permission denied. Please type your update.', [{ text: 'OK' }]);
      return false;
    }
    return true;
  }, []);

  const stopVoice = useCallback(async () => {
    sessionActiveRef.current = false;
    setIsListening(false);
    setHint('');
    try {
      await Voice.stop();
    } catch {
      /* noop */
    }
    // Commit any in-flight partial so tapping the mic off mid-sentence
    // keeps the words that were already recognized.
    const pending = partialRef.current.trim();
    if (pending) appendRef.current(pending);
    partialRef.current = '';
    setPartialText('');
  }, []);

  const toggleListening = useCallback(async () => {
    if (available === false) {
      Alert.alert(
        'Voice not available',
        'Speech recognition is not supported on this device.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (sessionActiveRef.current) {
      await stopVoice();
      return;
    }
    const ok = await requestMic();
    if (!ok) return;
    sessionActiveRef.current = true;
    setHint('');
    try {
      await Voice.start(LOCALE);
    } catch {
      sessionActiveRef.current = false;
      setHint('Could not start voice recognition.');
    }
  }, [available, stopVoice, requestMic]);

  return { isListening, partialText, hint, toggleListening, stopVoice, voiceView: null };
}
