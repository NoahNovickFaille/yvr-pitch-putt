const { withXcodeProject } = require("@expo/config-plugins");

const BUNDLE_PROD = "ca.noahnovick.pitchputt";
const BUNDLE_DEV = "ca.noahnovick.pitchputt.dev";

// EAS development profile sets APP_VARIANT=development → .dev bundle (side-by-side with prod).
// Local `expo run:ios` uses the prod bundle so Xcode can reuse your existing dev profile.
function withBundleIdentifier(config) {
  const useDevBundle = process.env.APP_VARIANT === "development";
  const debugBundleId = useDevBundle ? BUNDLE_DEV : BUNDLE_PROD;

  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (typeof buildConfig !== "object" || !buildConfig.buildSettings)
        continue;

      // Leave DEVELOPMENT_TEAM unset so `expo run:ios --device` can register
      // profiles with -allowProvisioningUpdates on a new Mac.
      buildConfig.buildSettings.CODE_SIGN_STYLE = "Automatic";

      if (buildConfig.name === "Debug") {
        buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = debugBundleId;
      } else if (buildConfig.name === "Release") {
        buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = BUNDLE_PROD;
      }
    }

    return config;
  });
}

module.exports = withBundleIdentifier;
