const { withXcodeProject } = require('@expo/config-plugins');

// Sets different bundle IDs for Debug vs Release configurations
// Debug: ca.corvustech.pitchputt.dev (local development)
// Release: ca.corvustech.pitchputt (TestFlight/production)
function withBundleIdentifier(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (typeof buildConfig !== 'object' || !buildConfig.buildSettings) continue;

      if (buildConfig.name === 'Debug') {
        buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = 'ca.corvustech.pitchputt.dev';
      } else if (buildConfig.name === 'Release') {
        buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = 'ca.corvustech.pitchputt';
      }
    }

    return config;
  });
}

module.exports = withBundleIdentifier;
