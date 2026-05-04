const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Drop all com.android.support artifacts so only AndroidX is packaged.
 * Prevents duplicate classes and mergeReleaseJavaResource META-INF clashes
 * (e.g. androidx.appcompat vs com.android.support:appcompat-v7).
 */
function withExcludeLegacySupportLib(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    const marker = '// begin-exclude-legacy-support';
    if (mod.modResults.contents.includes(marker)) return mod;

    mod.modResults.contents += `
${marker}
configurations.configureEach {
    exclude group: 'com.android.support'
}
// end-exclude-legacy-support
`;
    return mod;
  });
}

module.exports = withExcludeLegacySupportLib;
