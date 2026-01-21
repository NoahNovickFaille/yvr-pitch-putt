import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

// ============================================================================
// Utility Functions
// ============================================================================

function formatBytes(bytes: number): string {
  const gb = bytes / 1_000_000_000;
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / 1_000_000;
  return `${mb.toFixed(0)} MB`;
}

/**
 * Transform technical error messages into user-friendly ones.
 */
function getUserFriendlyError(error: string | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';

  const lowerError = error.toLowerCase();

  if (lowerError.includes('model file not found') || lowerError.includes('not downloaded')) {
    return 'The AI model needs to be downloaded. Please try again.';
  }
  if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (lowerError.includes('storage') || lowerError.includes('disk') || lowerError.includes('space')) {
    return 'Not enough storage space. Please free up some space and try again.';
  }
  if (lowerError.includes('corrupt') || lowerError.includes('integrity') || lowerError.includes('verification')) {
    return 'The download was corrupted. Please try downloading again.';
  }
  if (lowerError.includes('memory') || lowerError.includes('ram')) {
    return 'Not enough memory available. Try closing other apps and try again.';
  }

  // Keep original if no match, but cap length
  return error.length > 100 ? error.slice(0, 100) + '...' : error;
}

// ============================================================================
// Sub-Components (DRY extraction)
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <View style={stepStyles.container}>
      <View style={stepStyles.stepsRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={index}>
              <View style={stepStyles.stepItem}>
                <View style={[
                  stepStyles.stepCircle,
                  isCompleted && stepStyles.stepCircleCompleted,
                  isCurrent && stepStyles.stepCircleCurrent,
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color={DarkColors.userMessageText} />
                  ) : (
                    <Text style={[
                      stepStyles.stepNumber,
                      isCurrent && stepStyles.stepNumberCurrent,
                    ]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text style={[
                  stepStyles.stepLabel,
                  (isCompleted || isCurrent) && stepStyles.stepLabelActive,
                ]}>
                  {labels[index]}
                </Text>
              </View>
              {index < totalSteps - 1 && (
                <View style={[
                  stepStyles.connector,
                  isCompleted && stepStyles.connectorCompleted,
                ]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    marginBottom: DarkSpacing.xxl,
    paddingHorizontal: DarkSpacing.md,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 70,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DarkColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DarkSpacing.xs,
  },
  stepCircleCompleted: {
    backgroundColor: DarkColors.accent,
  },
  stepCircleCurrent: {
    backgroundColor: DarkColors.accent,
    borderWidth: 2,
    borderColor: DarkColors.accentMuted,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.textTertiary,
  },
  stepNumberCurrent: {
    color: DarkColors.userMessageText,
  },
  stepLabel: {
    fontSize: 10,
    color: DarkColors.textTertiary,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: DarkColors.textSecondary,
  },
  connector: {
    height: 2,
    width: 30,
    backgroundColor: DarkColors.surfaceElevated,
    marginTop: 11,
  },
  connectorCompleted: {
    backgroundColor: DarkColors.accent,
  },
});

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
}

function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={64} color={DarkColors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color={DarkColors.userMessageText} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

interface LoadingStateProps {
  title: string;
  description: string;
}

function LoadingState({ title, description }: LoadingStateProps) {
  return (
    <>
      <View style={styles.iconContainer}>
        <ActivityIndicator size="large" color={DarkColors.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </>
  );
}

interface InitializationStateProps {
  embeddingReady: boolean;
  llmReady: boolean;
}

function InitializationState({ embeddingReady, llmReady }: InitializationStateProps) {
  return (
    <>
      <View style={styles.iconContainer}>
        <View style={initStyles.iconWrapper}>
          <Ionicons name="sparkles" size={48} color={DarkColors.accent} />
        </View>
      </View>

      <Text style={styles.title}>Preparing AI</Text>
      <Text style={styles.description}>
        Loading models into memory...
      </Text>

      <View style={initStyles.checklistContainer}>
        <View style={initStyles.checklistItem}>
          {llmReady ? (
            <Ionicons name="checkmark-circle" size={24} color={DarkColors.success} />
          ) : (
            <ActivityIndicator size="small" color={DarkColors.accent} />
          )}
          <Text style={[initStyles.checklistText, llmReady && initStyles.checklistTextDone]}>
            Conversation model
          </Text>
        </View>

        <View style={initStyles.checklistItem}>
          {embeddingReady ? (
            <Ionicons name="checkmark-circle" size={24} color={DarkColors.success} />
          ) : (
            <ActivityIndicator size="small" color={DarkColors.accent} />
          )}
          <Text style={[initStyles.checklistText, embeddingReady && initStyles.checklistTextDone]}>
            Memory model
          </Text>
        </View>
      </View>
    </>
  );
}

const initStyles = StyleSheet.create({
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DarkColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistContainer: {
    marginTop: DarkSpacing.xl,
    gap: DarkSpacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.md,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.lg,
    backgroundColor: DarkColors.surfaceElevated,
    borderRadius: DarkSpacing.radiusMd,
    minWidth: 220,
  },
  checklistText: {
    fontSize: DarkTypography.body,
    color: DarkColors.textSecondary,
  },
  checklistTextDone: {
    color: DarkColors.text,
  },
});

interface DownloadProgressProps {
  title: string;
  stepLabel: string;
  stepDescription: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function DownloadProgress({
  title,
  stepLabel,
  stepDescription,
  progress,
  downloadedBytes,
  totalBytes,
  isPaused,
  onPause,
  onResume,
  onCancel,
}: DownloadProgressProps) {
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
        {isPaused ? 'Download Paused' : title}
      </Text>

      <Text style={styles.description}>{stepLabel}</Text>
      <Text style={styles.subDescription}>{stepDescription}</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
          </Text>
          <Text style={styles.progressPercent}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        {isPaused ? (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onResume}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={20} color={DarkColors.accent} />
            <Text style={styles.controlText}>Resume</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onPause}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={20} color={DarkColors.accent} />
            <Text style={styles.controlText}>Pause</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.controlButton}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color={DarkColors.danger} />
          <Text style={[styles.controlText, { color: DarkColors.danger }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DownloadStep({ onComplete }: DownloadStepProps) {
  // Hooks
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
    isReady: embeddingReady,
    startDownload: startEmbeddingDownload,
    pauseDownload: pauseEmbeddingDownload,
    resumeDownload: resumeEmbeddingDownload,
    cancelDownload: cancelEmbeddingDownload,
  } = useEmbeddingModel();

  const {
    initialize,
    isReady: llmReady,
    isInitializing,
    hasError: llmHasError,
    errorMessage: llmError,
    retry: retryLLMInit
  } = useLLM();

  // State
  const [currentPhase, setCurrentPhase] = useState<DownloadPhase>('llm');
  const phaseActionsStarted = useRef({ llm: false, embedding: false, init: false });

  // Stable function references (consolidated)
  const actionsRef = useRef({ startLLMDownload, startEmbeddingDownload, initialize });
  useEffect(() => {
    actionsRef.current = { startLLMDownload, startEmbeddingDownload, initialize };
  }, [startLLMDownload, startEmbeddingDownload, initialize]);

  // Derived state
  const llmNeedsDownload = modelState.status === 'not_downloaded';
  const llmDownloading = modelState.status === 'downloading';
  const llmPaused = modelState.status === 'download_paused';
  const llmVerifying = modelState.status === 'verifying';
  const llmReadyToInit = modelState.status === 'ready_to_initialize';
  const llmDownloadError = modelState.status === 'error';

  const llmProgress = useMemo(() => {
    if (llmDownloading || llmPaused) return (modelState.progress ?? 0) * 100;
    if (llmReadyToInit || llmVerifying) return 100;
    return 0;
  }, [llmDownloading, llmPaused, llmReadyToInit, llmVerifying, modelState.progress]);

  const hasInitError = (llmHasError && currentPhase === 'initializing') || false;

  // Calculate current step for indicator (0-indexed)
  // Use derived states to ensure step indicator updates immediately
  const currentStep = useMemo(() => {
    // Step 0: Downloading LLM
    if (!llmReadyToInit && !llmReady) return 0;
    // Step 1: Downloading embedding
    if (llmReadyToInit && !embeddingDownloaded) return 1;
    // Step 2: Initializing or complete
    return 2;
  }, [llmReadyToInit, llmReady, embeddingDownloaded]);

  // ============================================================================
  // Unified State Machine Effect
  // ============================================================================
  useEffect(() => {
    const actions = actionsRef.current;
    const started = phaseActionsStarted.current;

    // State machine: determine and execute next action

    // Phase: LLM Download
    if (llmNeedsDownload && !started.llm) {
      started.llm = true;
      setCurrentPhase('llm');
      actions.startLLMDownload();
      return;
    }

    // Phase: Embedding Download (after LLM ready)
    if (llmReadyToInit && !embeddingDownloaded && !embeddingDownloading && !started.embedding) {
      started.embedding = true;
      setCurrentPhase('embedding');
      actions.startEmbeddingDownload();
      return;
    }

    // Phase: Initialize (after both downloaded)
    if (llmReadyToInit && embeddingDownloaded && !started.init && !isInitializing && !llmHasError) {
      started.init = true;
      setCurrentPhase('initializing');
      actions.initialize();
      return;
    }

    // Phase: Complete
    if (llmReady && embeddingDownloaded) {
      setCurrentPhase('complete');
      onComplete();
    }
  }, [
    llmNeedsDownload, llmReadyToInit, llmReady, llmHasError,
    embeddingDownloaded, embeddingDownloading, isInitializing,
    onComplete
  ]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleRetry = useCallback(() => {
    if (currentPhase === 'llm' || llmDownloadError) {
      phaseActionsStarted.current.llm = false;
      retryLLMDownload();
    } else if (currentPhase === 'embedding' && embeddingError) {
      phaseActionsStarted.current.embedding = false;
      startEmbeddingDownload();
    } else if (currentPhase === 'initializing' && hasInitError) {
      phaseActionsStarted.current.init = false;
      retryLLMInit();
    }
  }, [currentPhase, llmDownloadError, embeddingError, hasInitError, retryLLMDownload, startEmbeddingDownload, retryLLMInit]);

  // Derived: are we in initialization phase?
  // This is true when both downloads are complete but LLM isn't ready yet
  const isInInitPhase = llmReadyToInit && embeddingDownloaded && !llmReady;

  // ============================================================================
  // Render
  // ============================================================================
  const renderContent = () => {
    // Error states (check first)
    if (llmDownloadError) {
      return (
        <ErrorState
          title="Download Failed"
          description={getUserFriendlyError(modelState.error)}
          onRetry={handleRetry}
        />
      );
    }

    if (embeddingError && currentPhase === 'embedding') {
      return (
        <ErrorState
          title="Download Failed"
          description={getUserFriendlyError(embeddingError)}
          onRetry={handleRetry}
        />
      );
    }

    if (hasInitError) {
      return (
        <ErrorState
          title="Setup Failed"
          description={getUserFriendlyError(llmError)}
          onRetry={handleRetry}
        />
      );
    }

    // Verifying LLM download
    if (llmVerifying) {
      return (
        <LoadingState
          title="Verifying Download"
          description="Checking file integrity..."
        />
      );
    }

    // Initializing - show when both downloads complete but models not ready
    // Use derived state (isInInitPhase) to catch the transition immediately
    if (isInInitPhase || currentPhase === 'initializing' || isInitializing) {
      return (
        <InitializationState
          embeddingReady={embeddingReady}
          llmReady={llmReady}
        />
      );
    }

    // Downloading embedding model
    if (currentPhase === 'embedding' && (embeddingDownloading || !embeddingDownloaded)) {
      const isPaused = !embeddingDownloading && embeddingProgress > 0;

      return (
        <DownloadProgress
          title="Setting Up Cove"
          stepLabel="Downloading memory model (2/2)"
          stepDescription="Enables smart memory and context"
          progress={embeddingProgress}
          downloadedBytes={EMBEDDING_MODEL.sizeBytes * (embeddingProgress / 100)}
          totalBytes={EMBEDDING_MODEL.sizeBytes}
          isPaused={isPaused}
          onPause={pauseEmbeddingDownload}
          onResume={resumeEmbeddingDownload}
          onCancel={cancelEmbeddingDownload}
        />
      );
    }

    // Downloading LLM (default)
    const llmSize = model?.sizeBytes ?? 0;

    return (
      <DownloadProgress
        title="Setting Up Cove"
        stepLabel={`Downloading ${model?.name ?? 'AI model'} (1/2)`}
        stepDescription="Main conversation model"
        progress={llmProgress}
        downloadedBytes={llmSize * (llmProgress / 100)}
        totalBytes={llmSize}
        isPaused={llmPaused}
        onPause={pauseLLMDownload}
        onResume={resumeLLMDownload}
        onCancel={cancelLLMDownload}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StepIndicator
        currentStep={currentStep}
        totalSteps={3}
        labels={['AI Model', 'Memory', 'Setup']}
      />

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

// ============================================================================
// Styles
// ============================================================================

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
