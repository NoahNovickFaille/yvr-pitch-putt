// App variant configuration for side-by-side dev/production builds
const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = {
  expo: {
    name: IS_DEV ? "Pitch Putt YVR (Dev)" : "Pitch Putt YVR",
    slug: "yvr-pitchputt",
    version: "1.0.0",
    orientation: "portrait",
    icon: IS_DEV ? "./assets/images/icon-dev.png" : "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0F0F0F",
    },
    scheme: IS_DEV ? "pitchputt-dev" : "pitchputt",
    platforms: ["ios", "android", "web"],
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/54516f78-7096-4162-a515-a16e36323795",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      bundleIdentifier: IS_DEV
        ? "ca.noahnovick.pitchputt.dev"
        : "ca.noahnovick.pitchputt",
      buildNumber: "13",
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription:
          "Pitch Putt YVR uses your camera to scan membership barcodes.",
        NSPhotoLibraryUsageDescription:
          "Pitch Putt YVR does not access your photos.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: IS_DEV
        ? "ca.noahnovick.pitchputt.dev"
        : "ca.noahnovick.pitchputt",
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission:
            "Pitch Putt YVR uses your camera to scan membership barcodes.",
        },
      ],
      "./plugins/withExpoCameraBarcodeEnabled",
      "./plugins/withIosCameraUsageDescription",
      "./plugins/withBundleIdentifier",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#0F0F0F",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            newArchEnabled: true,
          },
        },
      ],
      "expo-apple-authentication",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
            ? `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split(".apps.googleusercontent.com")[0]}`
            : undefined,
        },
      ],
    ],
    owner: "noahnovick",
    extra: {
      eas: {
        projectId: "54516f78-7096-4162-a515-a16e36323795",
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
