import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { useModelDownload } from '../hooks/useModelDownload';
import { useLLM } from '../hooks/useLLM';
import { MODEL_CONFIG } from '../constants/model';
import { deleteModelFile } from '../services/download/ModelDownloadService';
import { WarmColors, WarmSpacing } from '../../constants/warmTheme';

interface ModelSetupScreenProps {
  onReady: () => void;
}

export function ModelSetupScreen({ onReady }: ModelSetupScreenProps) {
  const {
    modelState,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
  } = useModelDownload();

  const {
    llmState,
    initialize,
    retry: retryInit,
    isReady,
    isInitializing,
    hasError: llmHasError,
    errorMessage: llmErrorMessage,
  } = useLLM();

  // Auto-initialize when download completes
  useEffect(() => {
    if (modelState.status === 'ready_to_initialize' && llmState.status === 'idle') {
      initialize();
    }
  }, [modelState.status, llmState.status, initialize]);

  // Navigate to main screen when ready
  useEffect(() => {
    if (isReady) {
      onReady();
    }
  }, [isReady, onReady]);

  // Handle deleting corrupted model file
  const handleDeleteModel = async () => {
    await deleteModelFile();
    // State will automatically reset to 'not_downloaded' since file is gone
  };

  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1_000_000_000) {
      return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    }
    if (bytes >= 1_000_000) {
      return `${(bytes / 1_000_000).toFixed(0)} MB`;
    }
    return `${(bytes / 1_000).toFixed(0)} KB`;
  };

  // Render based on state
  const renderContent = () => {
    // Not downloaded - show download button
    if (modelState.status === 'not_downloaded') {
      return (
        <View style={styles.section}>
          <Text style={styles.title}>Download AI Model</Text>
          <Text style={styles.description}>
            Confidant needs to download the AI model ({formatBytes(MODEL_CONFIG.expectedSizeBytes)})
            to work. This only happens once.
          </Text>
          <Text style={styles.note}>
            The model runs entirely on your device. No data is sent to the cloud.
          </Text>
          <TouchableOpacity style={styles.button} onPress={startDownload}>
            <Text style={styles.buttonText}>Download Model</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Downloading - show progress
    if (modelState.status === 'downloading') {
      const progress = modelState.progress;
      const percent = Math.round(progress * 100);
      const downloadedBytes = Math.round(progress * MODEL_CONFIG.expectedSizeBytes);

      return (
        <View style={styles.section}>
          <Text style={styles.title}>Downloading...</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {formatBytes(downloadedBytes)} / {formatBytes(MODEL_CONFIG.expectedSizeBytes)} ({percent}%)
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={pauseDownload}
            >
              <Text style={styles.secondaryButtonText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={cancelDownload}
            >
              <Text style={styles.dangerButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Paused - show resume button
    if (modelState.status === 'download_paused') {
      const progress = modelState.progress;
      const percent = Math.round(progress * 100);

      return (
        <View style={styles.section}>
          <Text style={styles.title}>Download Paused</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressText}>{percent}% complete</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={resumeDownload}>
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={cancelDownload}
            >
              <Text style={styles.dangerButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Verifying checksum
    if (modelState.status === 'verifying') {
      return (
        <View style={styles.section}>
          <Text style={styles.title}>Verifying Download...</Text>
          <ActivityIndicator size="large" color={WarmColors.primary} />
          <Text style={styles.description}>
            Checking file integrity...
          </Text>
        </View>
      );
    }

    // Download error
    if (modelState.status === 'error') {
      return (
        <View style={styles.section}>
          <Text style={styles.title}>Download Failed</Text>
          <Text style={styles.errorText}>{modelState.error}</Text>
          <TouchableOpacity style={styles.button} onPress={retryDownload}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Ready to initialize or initializing
    if (modelState.status === 'ready_to_initialize' || isInitializing) {
      return (
        <View style={styles.section}>
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>Confidant</Text>
          <ActivityIndicator size="large" color={WarmColors.primary} />
        </View>
      );
    }

    // LLM initialization error
    if (llmHasError) {
      return (
        <View style={styles.section}>
          <Text style={styles.title}>Could Not Load Model</Text>
          <Text style={styles.errorText}>{llmErrorMessage}</Text>
          <TouchableOpacity style={styles.button} onPress={retryInit}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.dangerButton, { marginTop: 12 }]}
            onPress={handleDeleteModel}
          >
            <Text style={styles.dangerButtonText}>Delete Model & Re-download</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Ready - this should trigger onReady, but show something just in case
    if (isReady) {
      return (
        <View style={styles.section}>
          <Text style={styles.title}>Ready!</Text>
          <ActivityIndicator size="large" color={WarmColors.success} />
        </View>
      );
    }

    // Fallback
    return (
      <View style={styles.section}>
        <ActivityIndicator size="large" color={WarmColors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WarmColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: WarmSpacing.sectionSpacing,
  },
  section: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '600',
    color: WarmColors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: WarmColors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: WarmColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  note: {
    fontSize: 14,
    color: WarmColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: WarmColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: WarmSpacing.buttonRadius,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: WarmColors.cardBackground,
    marginRight: 12,
    borderWidth: 1,
    borderColor: WarmColors.border,
  },
  secondaryButtonText: {
    color: WarmColors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: WarmColors.dangerLight,
  },
  dangerButtonText: {
    color: WarmColors.danger,
    fontSize: 17,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: WarmColors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: WarmColors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: WarmColors.textSecondary,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: WarmColors.danger,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});
