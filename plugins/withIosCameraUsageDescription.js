const { withInfoPlist } = require("@expo/config-plugins");

const CAMERA_USAGE =
  "Pitch Putt YVR uses your camera to scan membership barcodes.";

/** Ensures NSCameraUsageDescription is always written on prebuild. */
function withIosCameraUsageDescription(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.NSCameraUsageDescription = CAMERA_USAGE;
    return config;
  });
}

module.exports = withIosCameraUsageDescription;
