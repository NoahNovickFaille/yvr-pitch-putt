module.exports = {
  expo: {
    name: 'Cove',
    slug: 'cove',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    scheme: 'cove',
    platforms: ['ios'],
    ios: {
      bundleIdentifier: 'ca.corvustech.cove',
      supportsTablet: false,
      infoPlist: {
        UIBackgroundModes: ['fetch'], // For background downloads
        NSMicrophoneUsageDescription: 'Cove needs microphone access to hear your voice messages.',
        NSSpeechRecognitionUsageDescription: 'Cove uses on-device speech recognition to transcribe your voice.',
        NSPhotoLibraryUsageDescription: 'Cove does not access your photos.',
        ITSAppUsesNonExemptEncryption: false, // App does not use custom encryption
      },
    },
    plugins: [
      'expo-router',
      './plugins/withMMKV',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
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
    ],
    owner: 'rahulr8',
    extra: {
      eas: {
        projectId: '62bf0486-0aac-4f47-a4b4-378e9a26895d',
      },
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
