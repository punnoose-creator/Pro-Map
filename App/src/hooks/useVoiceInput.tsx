import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { pushCrashDebugLine } from '../debug/crashDebugBuffer';

// Native on-device speech recognition (Android SpeechRecognizer / iOS SFSpeechRecognizer)
// via expo-speech-recognition — the actively maintained, New-Architecture-compatible
// replacement for @react-native-voice/voice (deprecated by its own maintainers).
const LOCALE = 'en-US';
const RESTART_DELAY_MS = 300;

/** Errors that mean the OS/user blocked the mic — don't auto-restart on these. */
const BLOCKED_ERRORS = new Set(['not-allowed', 'service-not-allowed']);
/** Recoverable errors (silence/timeout) — safe to restart if the session is still active. */
const RECOVERABLE_ERRORS = new Set(['no-speech', 'speech-timeout', 'network']);

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
    try {
      const result = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      pushCrashDebugLine('Voice', `isRecognitionAvailable() -> ${JSON.stringify(result)}`);
      setAvailable(!!result);
    } catch (err) {
      pushCrashDebugLine(
        'Voice',
        'isRecognitionAvailable() threw',
        err instanceof Error ? err.message : String(err)
      );
      setAvailable(false);
    }
  }, []);

  const startNativeSession = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: LOCALE,
      interimResults: true,
      continuous: true,
    });
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setHint('');
  });

  useSpeechRecognitionEvent('result', (e: ExpoSpeechRecognitionResultEvent) => {
    const text = e.results?.[0]?.transcript;
    if (!text) return;
    if (e.isFinal) {
      appendRef.current(text);
      setPartialText('');
      partialRef.current = '';
    } else {
      setPartialText(text);
      partialRef.current = text;
    }
  });

  useSpeechRecognitionEvent('error', (e: ExpoSpeechRecognitionErrorEvent) => {
    pushCrashDebugLine('Voice', `error: ${e.error}`, e.message);
    setIsListening(false);
    if (BLOCKED_ERRORS.has(e.error)) {
      sessionActiveRef.current = false;
      setPartialText('');
      partialRef.current = '';
      setHint('Microphone access blocked. Check app permissions.');
      return;
    }
    if (sessionActiveRef.current && RECOVERABLE_ERRORS.has(e.error)) {
      setTimeout(() => {
        if (sessionActiveRef.current) {
          try {
            startNativeSession();
          } catch {
            /* noop */
          }
        }
      }, RESTART_DELAY_MS);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    // Continuous mode can still be ended by the OS (e.g. long silence on some
    // OEMs) — restart transparently if the user hasn't manually stopped.
    if (sessionActiveRef.current) {
      setTimeout(() => {
        if (sessionActiveRef.current) {
          try {
            startNativeSession();
          } catch {
            /* noop */
          }
        }
      }, RESTART_DELAY_MS);
    } else {
      setHint('');
    }
  });

  const requestMic = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
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
      ExpoSpeechRecognitionModule.stop();
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
      startNativeSession();
    } catch {
      sessionActiveRef.current = false;
      setHint('Could not start voice recognition.');
    }
  }, [available, stopVoice, requestMic, startNativeSession]);

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  return { isListening, partialText, hint, toggleListening, stopVoice, voiceView: null };
}
