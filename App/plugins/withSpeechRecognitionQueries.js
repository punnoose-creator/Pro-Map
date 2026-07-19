const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Android 11+ package visibility: the app must declare that it queries the
 * speech RecognitionService intent, otherwise SpeechRecognizer cannot bind to
 * Google's recognizer — Voice.isAvailable() returns false and recognition
 * silently never starts. The @react-native-voice/voice plugin only adds the
 * RECORD_AUDIO permission, not this <queries> entry.
 */
function withSpeechRecognitionQueries(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    if (!Array.isArray(manifest.queries)) manifest.queries = [];

    const alreadyDeclared = JSON.stringify(manifest.queries).includes(
      'android.speech.RecognitionService'
    );
    if (!alreadyDeclared) {
      manifest.queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': 'android.speech.RecognitionService' } }],
          },
        ],
      });
    }
    return mod;
  });
}

module.exports = withSpeechRecognitionQueries;
