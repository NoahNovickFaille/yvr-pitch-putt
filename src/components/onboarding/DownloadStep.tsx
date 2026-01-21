import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { useModelDownload } from '@/src/hooks/useModelDownload';
import { useEmbeddingModel } from '@/src/hooks/useEmbeddingModel';
import { useLLM } from '@/src/hooks/useLLM';
import { EMBEDDING_MODEL } from '@/src/constants/embedding';

interface DownloadStepProps {
  onComplete: () => void;
}

type DownloadPhase = 'llm' | 'embedding' | 'initializing' | 'complete';

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
    startDownload: startLLMDownload,
    pauseDownload: pauseLLMDownload,
    resumeDownload: resumeLLMDownload,
    cancelDownload: cancelLLMDownload,
    retryDownload: retryLLMDownload,
  } = useModelDownload();

  const {
    isDownloaded: embeddingDownloaded,
    isDownloading: embeddingDownloading,
    downloadProgress: embeddingProgress,
    error: embeddingError,
    startDownload: startEmbeddingDownload,
    pauseDownload: pauseEmbeddingDownload,
    resumeDownload: resumeEmbeddingDownload,
    cancelDownload: cancelEmbeddingDownload,
  } = useEmbeddingModel();

  const { initialize, isReady: llmReady, isInitializing, hasError: llmHasError, errorMessage: llmError, retry: retryLLMInit } = useLLM();

  const [currentPhase, setCurrentPhase] = useState<DownloadPhase>('llm');
  const [initError, setInitError] = useState<string | null>(null);
  const hasStartedLLMDownload = useRef(false);
  const hasStartedEmbeddingDownload = useRef(false);
  const hasStartedInit = useRef(false);

  // Store function refs to avoid effect dependency issues
  const startLLMDownloadRef = useRef(startLLMDownload);
  const startEmbeddingDownloadRef = useRef(startEmbeddingDownload);
  const initializeRef = useRef(initialize);

  useEffect(() => {
    startLLMDownloadRef.current = startLLMDownload;
  }, [startLLMDownload]);

  useEffect(() => {
    startEmbeddingDownloadRef.current = startEmbeddingDownload;
  }, [startEmbeddingDownload]);

  useEffect(() => {
    initializeRef.current = initialize;
  }, [initialize]);

  // Determine what needs to be done on mount
  useEffect(() => {
    const llmNeedsDownload = modelState.status === 'not_downloaded';
    const llmReady = modelState.status === 'ready_to_initialize';

    // Case 1: LLM needs download - start with LLM phase
    if (llmNeedsDownload && !hasStartedLLMDownload.current) {
      hasStartedLLMDownload.current = true;
      setCurrentPhase('llm');
      startLLMDownloadRef.current();
      return;
    }

    // Case 2: LLM ready, embedding needs download - start with embedding phase
    if (llmReady && !embeddingDownloaded && !embeddingDownloading && !hasStartedEmbeddingDownload.current) {
      hasStartedEmbeddingDownload.current = true;
      setCurrentPhase('embedding');
      startEmbeddingDownloadRef.current();
      return;
    }

    // Case 3: Both downloaded, need to initialize
    if (llmReady && embeddingDownloaded && !hasStartedInit.current && !isInitializing) {
      hasStartedInit.current = true;
      setCurrentPhase('initializing');
      setInitError(null);
      initializeRef.current();
    }
  }, [modelState.status, embeddingDownloaded, embeddingDownloading, isInitializing]);

  // When LLM download completes, start embedding download if needed
  useEffect(() => {
    if (
      modelState.status === 'ready_to_initialize' &&
      !embeddingDownloaded &&
      !embeddingDownloading &&
      !hasStartedEmbeddingDownload.current
    ) {
      hasStartedEmbeddingDownload.current = true;
      setCurrentPhase('embedding');
      startEmbeddingDownloadRef.current();
    }
  }, [modelState.status, embeddingDownloaded, embeddingDownloading]);

  // When both downloads complete, initialize LLM
  useEffect(() => {
    if (
      modelState.status === 'ready_to_initialize' &&
      embeddingDownloaded &&
      !hasStartedInit.current &&
      !isInitializing &&
      !llmHasError
    ) {
      hasStartedInit.current = true;
      setCurrentPhase('initializing');
      setInitError(null);
      initializeRef.current();
    }
  }, [modelState.status, embeddingDownloaded, isInitializing, llmHasError]);

  // Handle LLM initialization error
  useEffect(() => {
    if (llmHasError && currentPhase === 'initializing') {
      setInitError(llmError || 'Failed to initialize AI model');
    }
  }, [llmHasError, llmError, currentPhase]);

  // Complete when LLM is ready (embedding auto-initializes)
  useEffect(() => {
    if (llmReady && embeddingDownloaded) {
      setCurrentPhase('complete');
      onComplete();
    }
  }, [llmReady, embeddingDownloaded, onComplete]);

  // Calculate progress based on current phase
  const llmSize = model?.sizeBytes ?? 0;
  const embeddingSize = EMBEDDING_MODEL.sizeBytes;
  const llmProgress = modelState.status === 'downloading' || modelState.status === 'download_paused'
    ? modelState.progress ?? 0
    : modelState.status === 'ready_to_initialize' || modelState.status === 'verifying' ? 1 : 0;

  const handlePause = () => {
    if (currentPhase === 'llm') {
      pauseLLMDownload();
    } else if (currentPhase === 'embedding') {
      pauseEmbeddingDownload();
    }
  };

  const handleResume = () => {
    if (currentPhase === 'llm') {
      resumeLLMDownload();
    } else if (currentPhase === 'embedding') {
      resumeEmbeddingDownload();
    }
  };

  const handleCancel = () => {
    if (currentPhase === 'llm') {
      cancelLLMDownload();
    } else if (currentPhase === 'embedding') {
      cancelEmbeddingDownload();
    }
  };

  const handleRetry = () => {
    if (currentPhase === 'llm' || modelState.status === 'error') {
      retryLLMDownload();
    } else if (currentPhase === 'embedding' && embeddingError) {
      hasStartedEmbeddingDownload.current = false;
      startEmbeddingDownload();
    } else if (currentPhase === 'initializing' && (initError || llmHasError)) {
      // Retry initialization
      hasStartedInit.current = false;
      setInitError(null);
      retryLLMInit();
    }
  };

  const renderContent = () => {
    // Error states
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
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={DarkColors.userMessageText} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (embeddingError && currentPhase === 'embedding') {
      return (
        <>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color={DarkColors.danger} />
          </View>
          <Text style={styles.title}>Download Failed</Text>
          <Text style={styles.description}>{embeddingError}</Text>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={DarkColors.userMessageText} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // Initialization error
    if ((initError || llmHasError) && currentPhase === 'initializing') {
      return (
        <>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color={DarkColors.danger} />
          </View>
          <Text style={styles.title}>Setup Failed</Text>
          <Text style={styles.description}>
            {initError || llmError || 'Failed to initialize AI model. Please try again.'}
          </Text>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={DarkColors.userMessageText} />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // Verifying LLM
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

    // Initializing
    if (currentPhase === 'initializing' || isInitializing) {
      return (
        <>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color={DarkColors.accent} />
          </View>
          <Text style={styles.title}>Setting Up AI</Text>
          <Text style={styles.description}>
            Initializing the models for first use. This may take a moment...
          </Text>
        </>
      );
    }

    // Downloading embedding model
    if (currentPhase === 'embedding' && (embeddingDownloading || !embeddingDownloaded)) {
      const isPaused = !embeddingDownloading && embeddingProgress > 0;
      const downloadedBytes = embeddingSize * (embeddingProgress / 100);

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
            Downloading memory model (2/2)
          </Text>
          <Text style={styles.subDescription}>
            Enables smart memory search
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${embeddingProgress}%` }]} />
            </View>

            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {formatBytes(downloadedBytes)} / {formatBytes(embeddingSize)}
              </Text>
              <Text style={styles.progressPercent}>
                {Math.round(embeddingProgress)}%
              </Text>
            </View>
          </View>

          <View style={styles.controls}>
            {isPaused ? (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleResume}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={20} color={DarkColors.accent} />
                <Text style={styles.controlText}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePause}
                activeOpacity={0.8}
              >
                <Ionicons name="pause" size={20} color={DarkColors.accent} />
                <Text style={styles.controlText}>Pause</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={DarkColors.danger} />
              <Text style={[styles.controlText, { color: DarkColors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // Downloading LLM (default state)
    const isPaused = modelState.status === 'download_paused';
    const downloadedBytes = llmSize * llmProgress;

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
          Downloading {model?.name ?? 'AI model'} (1/2)
        </Text>
        <Text style={styles.subDescription}>
          Main conversation model
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${llmProgress * 100}%` }]} />
          </View>

          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {formatBytes(downloadedBytes)} / {formatBytes(llmSize)}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(llmProgress * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          {isPaused ? (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleResume}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={20} color={DarkColors.accent} />
              <Text style={styles.controlText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handlePause}
              activeOpacity={0.8}
            >
              <Ionicons name="pause" size={20} color={DarkColors.accent} />
              <Text style={styles.controlText}>Pause</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleCancel}
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
    marginBottom: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.lg,
  },
  subDescription: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
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
