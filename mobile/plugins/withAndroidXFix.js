const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix "Duplicate Class" errors in Android builds.
 * Specifically handles conflicts between modern AndroidX and legacy com.android.support libraries.
 */
const withAndroidXFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = fixDuplicateClasses(config.modResults.contents);
    }
    return config;
  });
};

function fixDuplicateClasses(buildGradle) {
  // If the fix is already applied, don't apply it again
  if (buildGradle.includes('com.android.support')) {
    if (buildGradle.includes('exclude group: \'com.android.support\'')) {
        return buildGradle;
    }
  }

  // Add a resolution strategy to allprojects to exclude legacy support libraries
  return buildGradle.replace(
    /allprojects\s*{/g,
    `allprojects {
    configurations.all {
        resolutionStrategy {
            // Exclude legacy support libraries that cause duplicate class errors with AndroidX
            exclude group: 'com.android.support', module: 'support-compat'
            exclude group: 'com.android.support', module: 'support-v4'
            exclude group: 'com.android.support', module: 'support-core-utils'
            exclude group: 'com.android.support', module: 'support-core-ui'
            exclude group: 'com.android.support', module: 'support-media-compat'
            exclude group: 'com.android.support', module: 'support-fragment'
            exclude group: 'com.android.support', module: 'support-annotations'
            exclude group: 'com.android.support', module: 'support-vector-drawable'
            exclude group: 'com.android.support', module: 'animated-vector-drawable'
            exclude group: 'com.android.support', module: 'versionedparcelable'
            exclude group: 'com.android.support', module: 'appcompat-v7'
        }
    }`
  );
}

module.exports = withAndroidXFix;
