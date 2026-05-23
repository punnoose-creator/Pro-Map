import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Audio } from 'expo-av';

// Web Speech API in a hidden WebView — no native module needed.
// Restart is handled INSIDE the WebView to avoid overlapping sessions
// that cause duplicate words.
const SPEECH_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
var recognition = null;
var sessionActive = false;

function send(obj) {
  try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
}

function initRecognition() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { send({ type: 'unavailable' }); return; }

  recognition = new SR();
  recognition.continuous = false;   // one utterance at a time — avoids duplicates
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = function() {
    send({ type: 'started' });
  };

  recognition.onresult = function(e) {
    var partial = '', final = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else partial += e.results[i][0].transcript;
    }
    if (partial) send({ type: 'partial', text: partial });
    if (final)   send({ type: 'result',  text: final });
  };

  recognition.onerror = function(e) {
    var blocked = (e.error === 'not-allowed' || e.error === 'service-not-allowed');
    send({ type: 'error', code: e.error, blocked: blocked });
    // Retry recoverable errors (no-speech / timeout) if session still active
    if (sessionActive && !blocked) {
      setTimeout(function() {
        if (sessionActive) try { recognition.start(); } catch(ex) {}
      }, 400);
    } else {
      sessionActive = false;
    }
  };

  // onend fires after each utterance — restart internally if session is still active
  recognition.onend = function() {
    if (sessionActive) {
      setTimeout(function() {
        if (sessionActive) try { recognition.start(); } catch(ex) {}
      }, 150);
    } else {
      send({ type: 'ended' });
    }
  };

  send({ type: 'ready' });
}

function handleMsg(raw) {
  try {
    var d = JSON.parse(raw);
    if (!recognition) return;
    if (d.type === 'start') {
      sessionActive = true;
      try { recognition.start(); } catch(ex) {}
    }
    if (d.type === 'stop') {
      sessionActive = false;
      try { recognition.stop(); } catch(ex) {}
      send({ type: 'ended' });
    }
  } catch(e) {}
}

window.addEventListener('message',   function(e) { handleMsg(e.data); });
document.addEventListener('message', function(e) { handleMsg(e.data); });
window.onload = initRecognition;
</script>
</body>
</html>`;

export function useVoiceInput(onAppendText: (chunk: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [hint, setHint]               = useState('');
  const [available, setAvailable]     = useState<boolean | null>(null);

  const webviewRef       = useRef<WebView>(null);
  const sessionActiveRef = useRef(false);
  const appendRef        = useRef(onAppendText);
  appendRef.current      = onAppendText;

  const post = useCallback((obj: object) => {
    webviewRef.current?.injectJavaScript(
      `(function(){window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(obj))}}));})()`
    );
  }, []);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as {
          type: string; text?: string; code?: string; blocked?: boolean;
        };
        switch (msg.type) {
          case 'ready':
            setAvailable(true);
            break;
          case 'unavailable':
            setAvailable(false);
            break;
          case 'started':
            setIsListening(true);
            setPartialText('');
            setHint('');
            break;
          case 'partial':
            if (msg.text) setPartialText(msg.text);
            break;
          case 'result':
            if (msg.text) {
              appendRef.current(msg.text);
              setPartialText('');
            }
            break;
          case 'error':
            setIsListening(false);
            setPartialText('');
            if (msg.blocked) {
              sessionActiveRef.current = false;
              setHint('Microphone access blocked. Check app permissions.');
            }
            // Non-blocked errors: WebView handles retry internally
            break;
          case 'ended':
            setIsListening(false);
            setPartialText('');
            if (!sessionActiveRef.current) setHint('');
            break;
        }
      } catch {
        /* noop */
      }
    },
    []
  );

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
    setPartialText('');
    setHint('');
    post({ type: 'stop' });
  }, [post]);

  const toggleListening = useCallback(async () => {
    if (available === false) {
      Alert.alert('Voice not available', 'Speech recognition is not supported on this device.', [{ text: 'OK' }]);
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
    post({ type: 'start' });
  }, [available, stopVoice, requestMic, post]);

  // Wrapped in a 0×0 View so it takes no space in the layout (fixes black gap on Android)
  const voiceView = (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html: SPEECH_HTML }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={onMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );

  return { isListening, partialText, hint, toggleListening, stopVoice, voiceView };
}

const styles = StyleSheet.create({
  // 0×0 absolute container — WebView loads and runs but occupies zero layout space
  container: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  webview: { width: 1, height: 1 },
});
