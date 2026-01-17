import { ExpoSpeechRecognitionModule } from '@jamsch/expo-speech-recognition';

export const SpeechService = {
  async requestPermission(): Promise<boolean> {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  },

  async checkPermission(): Promise<boolean> {
    const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return result.granted;
  },

  start(options?: { lang?: string }): void {
    ExpoSpeechRecognitionModule.start({
      lang: options?.lang || 'en-US',
      interimResults: true,           // Show partial results as user speaks
      requiresOnDeviceRecognition: true,  // CRITICAL: No cloud
      iosTaskHint: 'dictation',       // Optimize for dictation, not command
    });
  },

  stop(): void {
    ExpoSpeechRecognitionModule.stop();
  },

  abort(): void {
    ExpoSpeechRecognitionModule.abort();
  },
};
