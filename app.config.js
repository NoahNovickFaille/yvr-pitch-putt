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
    scheme: IS_DEV ? 'pitchputt-dev' : 'pitchputt',
    platforms: ['ios', 'android', 'web'],
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
        NSPhotoLibraryUsageDescription: 'Pitch Putt YVR does not access your photos.',
        ITSAppUsesNonExemptEncryption: false,
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
        'expo-build-properties',
        {
          ios: {
            newArchEnabled: true,
          },
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
