import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, NativeModules, Platform } from 'react-native';
import { Audio } from 'expo-av';

/**
 * @react-native-voice/voice always loads JS, but calls NativeModules.Voice at runtime.
 * In Expo Go (and any build without the native module), Voice is null →
 * "Cannot read property 'startSpeech' of null". Only enable when native is linked.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let VoiceMod: any = null;
try {
  const pkg = require('@react-native-voice/voice').default;
  const native = (NativeModules as { Voice?: unknown }).Voice;
  if (pkg && Platform.OS !== 'web' && native != null) {
    VoiceMod = pkg;
  }
} catch {
  VoiceMod = null;
}

export function useVoiceInput(onAppendText: (chunk: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [hint, setHint] = useState('');
  const sessionActiveRef = useRef(false);
  const appendRef = useRef(onAppendText);
  appendRef.current = onAppendText;

  useEffect(() => {
    const V = VoiceMod;
    if (!V) return;

    V.onSpeechStart = () => {
      setIsListening(true);
      setPartialText('');
      setHint('');
    };
    V.onSpeechEnd = () => {
      setIsListening(false);
      setPartialText('');
      if (sessionActiveRef.current) {
        setTimeout(() => {
          if (sessionActiveRef.current) {
            void V.start('en-US', {
              RECOGNIZER: 'com.google.android.googlequicksearchbox',
            }).catch(() => {});
          }
        }, 300);
      }
    };
    V.onSpeechError = (e: { error?: { code?: string } }) => {
      setIsListening(false);
      setPartialText('');
      const code = String(e?.error?.code ?? '');
      if (sessionActiveRef.current && ['5', '6', '7'].includes(code)) {
        setTimeout(() => {
          if (sessionActiveRef.current) {
            void V.start('en-US', {
              RECOGNIZER: 'com.google.android.googlequicksearchbox',
            }).catch(() => {});
          }
        }, 500);
      } else {
        sessionActiveRef.current = false;
        setHint('Microphone stopped. Tap to speak again or type your update.');
      }
    };
    V.onSpeechPartialResults = (e: { value?: string[] }) => {
      if (e.value?.[0]) setPartialText(e.value[0]);
    };
    V.onSpeechResults = (e: { value?: string[] }) => {
      if (e.value?.[0]) {
        appendRef.current(e.value[0]);
        setPartialText('');
      }
    };

    return () => {
      sessionActiveRef.current = false;
      try {
        void V.cancel();
        void V.destroy().then(() => V.removeAllListeners());
      } catch {
        /* noop */
      }
    };
  }, []);

  const requestMic = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Microphone',
        'Permission denied. You can still type your update below.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }, []);

  const stopVoice = useCallback(async () => {
    const V = VoiceMod;
    if (!V) return;
    sessionActiveRef.current = false;
    setIsListening(false);
    setPartialText('');
    setHint('');
    try {
      await V.stop();
    } catch {
      /* noop */
    }
  }, []);

  const toggleListening = useCallback(async () => {
    const V = VoiceMod;
    if (!V) {
      Alert.alert(
        'Voice input unavailable',
        Platform.OS === 'web'
          ? 'Speech-to-text is not supported in the browser. Please type your update.'
          : 'This build does not include the native speech module (common in Expo Go). Install a development build: npx expo run:android or eas build, then try again—or type your update.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (sessionActiveRef.current) {
      sessionActiveRef.current = false;
      setIsListening(false);
      setPartialText('');
      setHint('');
      try {
        await V.stop();
      } catch {
        /* noop */
      }
      return;
    }

    const ok = await requestMic();
    if (!ok) return;

    sessionActiveRef.current = true;
    setHint('');
    try {
      await V.start('en-US', {
        RECOGNIZER: 'com.google.android.googlequicksearchbox',
      });
    } catch (e: unknown) {
      sessionActiveRef.current = false;
      const msg = e instanceof Error ? e.message : String(e);
      setHint(`Could not start: ${msg}`);
    }
  }, [requestMic]);

  return { isListening, partialText, hint, toggleListening, stopVoice };
}
