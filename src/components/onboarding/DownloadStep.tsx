import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { useModelDownload } from '@/src/hooks/useModelDownload';
import { useLLM } from '@/src/hooks/useLLM';

interface DownloadStepProps {
  onComplete: () => void;
}

function formatBytes(bytes: number): string {
  const gb = bytes / 1_000_000_000;
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / 1_000_000;
  return `${mb.toFixed(0)} MB`;
}

export function DownloadStep({ onComplete }: DownloadStepProps) {
  const {
    modelState,
    model,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
  } = useModelDownload();

  const { initialize, isReady, isInitializing } = useLLM();
  const hasStartedDownload = useRef(false);
  const hasStartedInit = useRef(false);

  // Auto-start download on mount if not already downloading
  useEffect(() => {
    if (modelState.status === 'not_downloaded' && !hasStartedDownload.current) {
      hasStartedDownload.current = true;
      startDownload();
    }
  }, [modelState.status, startDownload]);

  // Auto-initialize when download completes
  useEffect(() => {
    if (modelState.status === 'ready_to_initialize' && !hasStartedInit.current) {
      hasStartedInit.current = true;
      initialize();
    }
  }, [modelState.status, initialize]);

  // Complete when ready
  useEffect(() => {
    if (isReady) {
      onComplete();
    }
  }, [isReady, onComplete]);

  const modelSize = model?.sizeBytes ?? 0;
  const progress = modelState.status === 'downloading' || modelState.status === 'download_paused'
    ? modelState.progress ?? 0
    : 0;
  const downloadedBytes = modelSize * progress;

  const renderContent = () => {
    if (modelState.status === 'error') {
      return (
        <>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color={DarkColors.danger} />
          </View>
          <Text style={styles.title}>Download Failed</Text>
          <Text style={styles.description}>{modelState.error}</Text>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryDownload}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={DarkColors.userMessageText} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (modelState.status === 'verifying') {
      return (
        <>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color={DarkColors.accent} />
          </View>
          <Text style={styles.title}>Verifying Download</Text>
          <Text style={styles.description}>Checking file integrity...</Text>
        </>
      );
    }

    if (modelState.status === 'ready_to_initialize' || isInitializing) {
      return (
        <>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color={DarkColors.accent} />
          </View>
          <Text style={styles.title}>Setting Up AI</Text>
          <Text style={styles.description}>
            Initializing the model for first use. This may take a moment...
          </Text>
        </>
      );
    }

    // Downloading or paused states
    const isPaused = modelState.status === 'download_paused';

    return (
      <>
        <View style={styles.iconContainer}>
          {isPaused ? (
            <Ionicons name="pause-circle" size={64} color={DarkColors.accent} />
          ) : (
            <Ionicons name="cloud-download" size={64} color={DarkColors.accent} />
          )}
        </View>

        <Text style={styles.title}>
          {isPaused ? 'Download Paused' : 'Setting Up Cove'}
        </Text>

        <Text style={styles.description}>
          Downloading {model?.name ?? 'AI model'}
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {formatBytes(downloadedBytes)} / {formatBytes(modelSize)}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          {isPaused ? (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={resumeDownload}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={20} color={DarkColors.accent} />
              <Text style={styles.controlText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={pauseDownload}
              activeOpacity={0.8}
            >
              <Ionicons name="pause" size={20} color={DarkColors.accent} />
              <Text style={styles.controlText}>Pause</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlButton}
            onPress={cancelDownload}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color={DarkColors.danger} />
            <Text style={[styles.controlText, { color: DarkColors.danger }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderContent()}
      </View>

      <View style={styles.footer}>
        <Text style={styles.crisisFooter}>
          In crisis? Call{' '}
          <Text
            style={styles.crisisLink}
            onPress={() => Linking.openURL('tel:988')}
          >
            988
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
    padding: DarkSpacing.xxl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: DarkSpacing.xl,
  },
  title: {
    fontSize: DarkTypography.title1,
    fontWeight: DarkTypography.weightBold,
    color: DarkColors.text,
    textAlign: 'center',
    marginBottom: DarkSpacing.lg,
  },
  description: {
    fontSize: DarkTypography.body,
    lineHeight: 26,
    color: DarkColors.textSecondary,
    textAlign: 'center',
    marginBottom: DarkSpacing.xxl,
    paddingHorizontal: DarkSpacing.lg,
  },
  progressContainer: {
    width: '100%',
    marginBottom: DarkSpacing.xxl,
  },
  progressBar: {
    height: 8,
    backgroundColor: DarkColors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: DarkSpacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DarkColors.accent,
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
  },
  progressPercent: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.accent,
  },
  controls: {
    flexDirection: 'row',
    gap: DarkSpacing.lg,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.sm,
    paddingVertical: DarkSpacing.md,
    paddingHorizontal: DarkSpacing.lg,
    borderRadius: DarkSpacing.radiusMd,
    backgroundColor: DarkColors.surfaceElevated,
  },
  controlText: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.accent,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.sm,
    paddingVertical: DarkSpacing.lg,
    paddingHorizontal: DarkSpacing.xxl,
    borderRadius: DarkSpacing.radiusMd,
    backgroundColor: DarkColors.accent,
  },
  retryText: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.userMessageText,
  },
  footer: {
    gap: DarkSpacing.lg,
  },
  crisisFooter: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
    textAlign: 'center',
  },
  crisisLink: {
    color: DarkColors.danger,
    fontWeight: DarkTypography.weightSemibold,
  },
});
