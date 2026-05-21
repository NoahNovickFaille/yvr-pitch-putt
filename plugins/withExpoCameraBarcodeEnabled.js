const { withPodfileProperties } = require("@expo/config-plugins");

/** Matches upstream expo-camera plugin (SDK 55+); safe to keep on SDK 54. */
const BARCODE_SCANNER_KEY = "expo.camera.barcode-scanner-enabled";

/**
 * Installed expo-camera@17 config plugin does not write this flag.
 * EAS prebuilds can otherwise omit ZXing-backed scanning in release IPAs.
 */
function withExpoCameraBarcodeEnabled(config) {
  return withPodfileProperties(config, (config) => {
    config.modResults[BARCODE_SCANNER_KEY] = "true";
    return config;
  });
}

module.exports = withExpoCameraBarcodeEnabled;
