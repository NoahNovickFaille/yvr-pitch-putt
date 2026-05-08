const { withAndroidManifest } = require("@expo/config-plugins");

const CAMERA = "android.permission.CAMERA";

function ensureUsesPermissionArray(manifest) {
  if (!manifest.manifest) return [];
  let perms = manifest.manifest["uses-permission"];
  if (!perms) {
    manifest.manifest["uses-permission"] = [];
    return manifest.manifest["uses-permission"];
  }
  if (!Array.isArray(perms)) {
    manifest.manifest["uses-permission"] = [perms];
    return manifest.manifest["uses-permission"];
  }
  return perms;
}

function hasCameraPermission(perms) {
  return perms.some(
    (p) => p?.$?.["android:name"] === CAMERA || p?.["android:name"] === CAMERA,
  );
}

/** Merges CAMERA into AndroidManifest without replacing Expo's default permission set. */
function withAndroidCameraPermission(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const perms = ensureUsesPermissionArray(manifest);
    if (!hasCameraPermission(perms)) {
      perms.push({ $: { "android:name": CAMERA } });
    }
    return config;
  });
}

module.exports = withAndroidCameraPermission;
