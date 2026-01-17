module.exports = {
  expo: {
    name: 'Cove',
    slug: 'confidant',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    scheme: 'confidant',
    platforms: ['ios'],
    ios: {
      bundleIdentifier: 'ca.corvustech.confidant',
      supportsTablet: false,
      infoPlist: {
        UIBackgroundModes: ['fetch'], // For background downloads
        NSMicrophoneUsageDescription: 'Cove needs microphone access to hear your voice messages.',
        NSSpeechRecognitionUsageDescription: 'Cove uses on-device speech recognition to transcribe your voice.',
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
          enableEntitlements: true,
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
        '@jamsch/expo-speech-recognition',
        {
          microphonePermission: 'Cove needs microphone access to hear your voice messages.',
          speechRecognitionPermission: 'Cove uses speech recognition to transcribe your voice.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'aa8233cc-b398-4638-8f72-2e006ae7c512',
      },
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
