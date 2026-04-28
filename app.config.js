// App variant configuration for side-by-side dev/production builds
const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'Pitch Putt YVR (Dev)' : 'Pitch Putt YVR',
    slug: 'pitch-putt-yvr',
    version: '1.0.0',
    orientation: 'portrait',
    icon: IS_DEV ? './assets/images/icon-dev.png' : './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0F0F0F',
    },
    scheme: IS_DEV ? 'cove-dev' : 'cove',
    platforms: ['ios', 'android'],
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/62bf0486-0aac-4f47-a4b4-378e9a26895d',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    ios: {
      bundleIdentifier: IS_DEV ? 'ca.corvustech.pitchputt.dev' : 'ca.corvustech.pitchputt',
      buildNumber: '3',                                                                                      
      supportsTablet: false,
      infoPlist: {
        UIBackgroundModes: ['fetch'], // For background downloads
        NSMicrophoneUsageDescription: 'Cove needs microphone access to hear your voice messages.',
        NSSpeechRecognitionUsageDescription: 'Cove uses on-device speech recognition to transcribe your voice.',
        NSPhotoLibraryUsageDescription: 'Cove does not access your photos.',
        ITSAppUsesNonExemptEncryption: false, // App does not use custom encryption
      },
    },
    android: {
      package: IS_DEV ? 'ca.corvustech.pitchputt.dev' : 'ca.corvustech.pitchputt',
      adaptiveIcon: {
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
    },
    plugins: [
      'expo-router',
      './plugins/withMMKV',
      './plugins/withBundleIdentifier',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0F0F0F',
        },
      ],
      [
        './plugins/withLlamaRN',
        {
          enableEntitlements: false,
          entitlementsProfile: 'production',
          forceCxx20: true,
        },
      ],
      [
        '@kesha-antonov/react-native-background-downloader',
        {
          addMmkvDependency: true, // Let plugin add MMKV pod for native headers
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            newArchEnabled: true, // Required for llama.rn v0.10+
          },
        },
      ],
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'Cove needs microphone access to hear your voice messages.',
          speechRecognitionPermission: 'Cove uses speech recognition to transcribe your voice.',
        },
      ],
      'expo-apple-authentication',
    ],
    owner: 'corvus-tech-ca',
    extra: {
      eas: {
        projectId: '62bf0486-0aac-4f47-a4b4-378e9a26895d',
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
