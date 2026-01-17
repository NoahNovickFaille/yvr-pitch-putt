module.exports = {
  expo: {
    name: 'Confidant',
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
        NSMicrophoneUsageDescription: 'Confidant needs microphone access to hear your voice messages.',
        NSSpeechRecognitionUsageDescription: 'Confidant uses on-device speech recognition to transcribe your voice.',
      },
    },
    plugins: [
      'expo-router',
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
        'llama.rn',
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
          microphonePermission: 'Confidant needs microphone access to hear your voice messages.',
          speechRecognitionPermission: 'Confidant uses speech recognition to transcribe your voice.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'placeholder-update-after-eas-init',
      },
    },
    experiments: {
      typedRoutes: true,
    },
  },
};
