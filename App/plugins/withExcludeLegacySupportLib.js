const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Transitive deps (e.g. older speech / maps stacks) can still pull
 * com.android.support:* alongside AndroidX → :app:checkReleaseDuplicateClasses.
 * Exclude legacy Support Library modules so only AndroidX remains.
 */
function withExcludeLegacySupportLib(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    const marker = '// begin-exclude-legacy-support';
    if (mod.modResults.contents.includes(marker)) return mod;

    mod.modResults.contents += `
${marker}
configurations.configureEach {
    exclude group: 'com.android.support', module: 'support-compat'
    exclude group: 'com.android.support', module: 'support-v4'
    exclude group: 'com.android.support', module: 'support-annotations'
    exclude group: 'com.android.support', module: 'support-media-compat'
    exclude group: 'com.android.support', module: 'support-core-utils'
    exclude group: 'com.android.support', module: 'support-core-ui'
    exclude group: 'com.android.support', module: 'support-fragment'
    exclude group: 'com.android.support', module: 'versionedparcelable'
}
// end-exclude-legacy-support
`;
    return mod;
  });
}

module.exports = withExcludeLegacySupportLib;
