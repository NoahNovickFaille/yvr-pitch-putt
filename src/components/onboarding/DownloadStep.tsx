import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { useModelDownload } from '@/src/hooks/useModelDownload';
import { useEmbeddingModel } from '@/src/hooks/useEmbeddingModel';
import { useLLM } from '@/src/hooks/useLLM';
import { EMBEDDING_MODEL } from '@/src/constants/embedding';

// ============================================================================
// Types
// ============================================================================

interface DownloadStepProps {
  onComplete: () => void;
}

/** Visual phase for determining what UI to show */
type SetupPhase =
  | { type: 'downloading_llm' }
  | { type: 'downloading_embedding' }
  | { type: 'verifying' }
  | { type: 'initializing' }
  | { type: 'error'; errorType: 'llm_download' | 'embedding_download' | 'init'; message: string }
  | { type: 'complete' };

// ============================================================================
// Utility Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  return `${Math.round(bytes / 1_000_000)} MB`;
}

const ERROR_PATTERNS: Array<{ patterns: string[]; message: string }> = [
  { patterns: ['model file not found', 'not downloaded'], message: 'The AI model needs to be downloaded. Please try again.' },
  { patterns: ['network', 'connection', 'timeout'], message: 'Network error. Please check your connection and try again.' },
  { patterns: ['storage', 'disk', 'space'], message: 'Not enough storage space. Please free up some space and try again.' },
  { patterns: ['corrupt', 'integrity', 'verification'], message: 'The download was corrupted. Please try downloading again.' },
  { patterns: ['memory', 'ram'], message: 'Not enough memory available. Try closing other apps and try again.' },
];

function getUserFriendlyError(error: string | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';

  const lowerError = error.toLowerCase();
  const match = ERROR_PATTERNS.find(({ patterns }) =>
    patterns.some(p => lowerError.includes(p))
  );

  return match?.message ?? (error.length > 100 ? `${error.slice(0, 100)}...` : error);
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  labels: string[];
}

function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  return (
    <View style={styles.stepIndicatorContainer}>
      <View style={styles.stepsRow}>
        {labels.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isCurrent && styles.stepCircleCurrent,
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color={DarkColors.userMessageText} />
                  ) : (
                    <Text style={[styles.stepNumber, isCurrent && styles.stepNumberCurrent]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, (isCompleted || isCurrent) && styles.stepLabelActive]}>
                  {label}
                </Text>
              </View>
              {index < labels.length - 1 && (
                <View style={[styles.connector, isCompleted && styles.connectorCompleted]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

interface StatusIconProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  showSpinner?: boolean;
  withBackground?: boolean;
}

function StatusIcon({ icon, color = DarkColors.accent, showSpinner, withBackground }: StatusIconProps) {
  if (showSpinner) {
    return (
      <View style={styles.iconContainer}>
        <ActivityIndicator size="large" color={DarkColors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.iconContainer}>
      {withBackground ? (
        <View style={styles.iconWrapper}>
          <Ionicons name={icon} size={48} color={color} />
        </View>
      ) : (
        <Ionicons name={icon} size={64} color={color} />
      )}
    </View>
  );
}

interface ChecklistItemProps {
  label: string;
  isReady: boolean;
}

function ChecklistItem({ label, isReady }: ChecklistItemProps) {
  return (
    <View style={styles.checklistItem}>
      {isReady ? (
        <Ionicons name="checkmark-circle" size={24} color={DarkColors.success} />
      ) : (
        <ActivityIndicator size="small" color={DarkColors.accent} />
      )}
      <Text style={[styles.checklistText, isReady && styles.checklistTextDone]}>
        {label}
      </Text>
    </View>
  );
}

interface DownloadProgressProps {
  stepLabel: string;
  stepDescription: string;
  progress: number;
  totalBytes: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

function DownloadProgress({
  stepLabel,
  stepDescription,
  progress,
  totalBytes,
  isPaused,
  onPause,
  onResume,
  onCancel,
}: DownloadProgressProps) {
  const downloadedBytes = totalBytes * (progress / 100);

  return (
    <>
      <StatusIcon icon={isPaused ? 'pause-circle' : 'cloud-download'} />

      <Text style={styles.title}>{isPaused ? 'Download Paused' : 'Setting Up Cove'}</Text>
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
          <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={isPaused ? onResume : onPause}
          activeOpacity={0.8}
        >
          <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color={DarkColors.accent} />
          <Text style={styles.controlText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onCancel} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color={DarkColors.danger} />
          <Text style={[styles.controlText, styles.dangerText]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ============================================================================
// Custom Hook: Setup Flow State Machine
// ============================================================================

function useSetupFlow(onComplete: () => void) {
  const llmDownload = useModelDownload();
  const embeddingModel = useEmbeddingModel();
  const llm = useLLM();

  // Track which actions have been triggered to prevent duplicates
  const actionsTriggered = useRef({ llm: false, embedding: false, init: false });

  // Derived LLM download states
  const llmStatus = llmDownload.modelState.status;
  const llmNeedsDownload = llmStatus === 'not_downloaded';
  const llmDownloading = llmStatus === 'downloading';
  const llmPaused = llmStatus === 'download_paused';
  const llmVerifying = llmStatus === 'verifying';
  const llmReadyToInit = llmStatus === 'ready_to_initialize';
  const llmDownloadError = llmStatus === 'error';

  const llmProgress = useMemo(() => {
    if (llmDownloading || llmPaused) return (llmDownload.modelState.progress ?? 0) * 100;
    if (llmReadyToInit || llmVerifying) return 100;
    return 0;
  }, [llmDownloading, llmPaused, llmReadyToInit, llmVerifying, llmDownload.modelState.progress]);

  // Determine current visual phase (pure derivation, no state)
  const phase: SetupPhase = useMemo(() => {
    // Error states first
    if (llmDownloadError) {
      return { type: 'error', errorType: 'llm_download', message: llmDownload.modelState.error ?? '' };
    }
    if (embeddingModel.error && llmReadyToInit && !embeddingModel.isDownloaded) {
      return { type: 'error', errorType: 'embedding_download', message: embeddingModel.error };
    }
    if (llm.hasError && llmReadyToInit && embeddingModel.isDownloaded) {
      return { type: 'error', errorType: 'init', message: llm.errorMessage ?? '' };
    }

    // Progress states
    if (llmVerifying) return { type: 'verifying' };
    if (llm.isReady && embeddingModel.isDownloaded) return { type: 'complete' };
    if (llmReadyToInit && embeddingModel.isDownloaded) return { type: 'initializing' };
    if (llmReadyToInit && !embeddingModel.isDownloaded) return { type: 'downloading_embedding' };

    return { type: 'downloading_llm' };
  }, [
    llmDownloadError, llmVerifying, llmReadyToInit,
    llmDownload.modelState.error,
    embeddingModel.error, embeddingModel.isDownloaded,
    llm.hasError, llm.errorMessage, llm.isReady,
  ]);

  // Step indicator (0-indexed)
  const currentStep = useMemo(() => {
    if (phase.type === 'downloading_llm' || phase.type === 'verifying') return 0;
    if (phase.type === 'downloading_embedding') return 1;
    if (phase.type === 'error') {
      if (phase.errorType === 'llm_download') return 0;
      if (phase.errorType === 'embedding_download') return 1;
      return 2;
    }
    return 2; // initializing or complete
  }, [phase]);

  // State machine: trigger actions based on phase transitions
  useEffect(() => {
    const triggered = actionsTriggered.current;

    if (llmNeedsDownload && !triggered.llm) {
      triggered.llm = true;
      llmDownload.startDownload();
      return;
    }

    if (llmReadyToInit && !embeddingModel.isDownloaded && !embeddingModel.isDownloading && !triggered.embedding) {
      triggered.embedding = true;
      embeddingModel.startDownload();
      return;
    }

    if (llmReadyToInit && embeddingModel.isDownloaded && !triggered.init && !llm.isInitializing && !llm.hasError) {
      triggered.init = true;
      llm.initialize();
      return;
    }

    if (phase.type === 'complete') {
      onComplete();
    }
  }, [
    llmNeedsDownload, llmReadyToInit, phase.type,
    embeddingModel.isDownloaded, embeddingModel.isDownloading,
    llm.isInitializing, llm.hasError,
    llmDownload, embeddingModel, llm, onComplete,
  ]);

  // Retry handler
  const handleRetry = useCallback(() => {
    if (phase.type !== 'error') return;

    const triggered = actionsTriggered.current;

    switch (phase.errorType) {
      case 'llm_download':
        triggered.llm = false;
        llmDownload.retryDownload();
        break;
      case 'embedding_download':
        triggered.embedding = false;
        embeddingModel.startDownload();
        break;
      case 'init':
        triggered.init = false;
        llm.retry();
        break;
    }
  }, [phase, llmDownload, embeddingModel, llm]);

  return {
    phase,
    currentStep,
    handleRetry,
    // LLM download controls
    llmProgress,
    llmPaused,
    llmModel: llmDownload.model,
    pauseLLM: llmDownload.pauseDownload,
    resumeLLM: llmDownload.resumeDownload,
    cancelLLM: llmDownload.cancelDownload,
    // Embedding download controls
    embeddingProgress: embeddingModel.downloadProgress,
    embeddingDownloading: embeddingModel.isDownloading,
    pauseEmbedding: embeddingModel.pauseDownload,
    resumeEmbedding: embeddingModel.resumeDownload,
    cancelEmbedding: embeddingModel.cancelDownload,
    // Init state
    llmReady: llm.isReady,
    embeddingReady: embeddingModel.isReady,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function DownloadStep({ onComplete }: DownloadStepProps) {
  const {
    phase,
    currentStep,
    handleRetry,
    llmProgress,
    llmPaused,
    llmModel,
    pauseLLM,
    resumeLLM,
    cancelLLM,
    embeddingProgress,
    embeddingDownloading,
    pauseEmbedding,
    resumeEmbedding,
    cancelEmbedding,
    llmReady,
    embeddingReady,
  } = useSetupFlow(onComplete);

  const renderContent = () => {
    switch (phase.type) {
      case 'error':
        return (
          <>
            <StatusIcon icon="alert-circle" color={DarkColors.danger} />
            <Text style={styles.title}>
              {phase.errorType === 'init' ? 'Setup Failed' : 'Download Failed'}
            </Text>
            <Text style={styles.description}>{getUserFriendlyError(phase.message)}</Text>
            <View style={styles.controls}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                <Ionicons name="refresh" size={20} color={DarkColors.userMessageText} />
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 'verifying':
        return (
          <>
            <StatusIcon showSpinner />
            <Text style={styles.title}>Verifying Download</Text>
            <Text style={styles.description}>Checking file integrity...</Text>
          </>
        );

      case 'initializing':
        return (
          <>
            <StatusIcon icon="sparkles" withBackground />
            <Text style={styles.title}>Preparing AI</Text>
            <Text style={styles.description}>Loading models into memory...</Text>
            <View style={styles.checklistContainer}>
              <ChecklistItem label="Conversation model" isReady={llmReady} />
              <ChecklistItem label="Memory model" isReady={embeddingReady} />
            </View>
          </>
        );

      case 'downloading_embedding':
        return (
          <DownloadProgress
            stepLabel="Downloading memory model (2/2)"
            stepDescription="Enables smart memory and context"
            progress={embeddingProgress}
            totalBytes={EMBEDDING_MODEL.sizeBytes}
            isPaused={!embeddingDownloading && embeddingProgress > 0}
            onPause={pauseEmbedding}
            onResume={resumeEmbedding}
            onCancel={cancelEmbedding}
          />
        );

      case 'downloading_llm':
      default:
        return (
          <DownloadProgress
            stepLabel={`Downloading ${llmModel?.name ?? 'AI model'} (1/2)`}
            stepDescription="Main conversation model"
            progress={llmProgress}
            totalBytes={llmModel?.sizeBytes ?? 0}
            isPaused={llmPaused}
            onPause={pauseLLM}
            onResume={resumeLLM}
            onCancel={cancelLLM}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <StepIndicator currentStep={currentStep} labels={['AI Model', 'Memory', 'Setup']} />

      <View style={styles.content}>{renderContent()}</View>

      <View style={styles.footer}>
        <Text style={styles.crisisFooter}>
          In crisis? Call{' '}
          <Text style={styles.crisisLink} onPress={() => Linking.openURL('tel:988')}>
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
  // Layout
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
  footer: {
    gap: DarkSpacing.lg,
  },

  // Step Indicator
  stepIndicatorContainer: {
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

  // Icons
  iconContainer: {
    marginBottom: DarkSpacing.xl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DarkColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Typography
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

  // Progress
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

  // Checklist
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

  // Controls
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
  dangerText: {
    color: DarkColors.danger,
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

  // Footer
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
