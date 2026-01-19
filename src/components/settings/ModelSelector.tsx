import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Circle, CheckCircle2, Download, Trash2 } from 'lucide-react-native';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { AVAILABLE_MODELS, ModelDefinition } from '../../constants/model';
import { useModelStore } from '../../stores/modelStore';
import {
  downloadModel,
  isModelDownloaded,
  deleteModelFile,
  verifyModelChecksum,
} from '../../services/download/ModelDownloadService';
import type { DownloadControls } from '../../types/model';

type ModelDownloadState = {
  status: 'idle' | 'downloading' | 'verifying' | 'error';
  progress?: number;
  error?: string;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  }
  return `${(bytes / 1_000_000).toFixed(0)} MB`;
}

interface ModelCardProps {
  model: ModelDefinition;
  isSelected: boolean;
  isDownloaded: boolean;
  downloadState: ModelDownloadState;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function ModelCard({
  model,
  isSelected,
  isDownloaded,
  downloadState,
  onSelect,
  onDownload,
  onDelete,
}: ModelCardProps) {
  const isDownloading = downloadState.status === 'downloading';
  const isVerifying = downloadState.status === 'verifying';
  const hasError = downloadState.status === 'error';

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      {/* Selection area */}
      <TouchableOpacity onPress={onSelect} activeOpacity={0.7} disabled={!isDownloaded}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {isSelected ? (
              <CheckCircle2 size={20} color={DarkColors.accent} />
            ) : isDownloaded ? (
              <Circle size={20} color={DarkColors.textTertiary} />
            ) : (
              <Circle size={20} color={DarkColors.textTertiary} style={{ opacity: 0.5 }} />
            )}
            <Text
              style={[
                styles.cardTitle,
                isSelected && styles.cardTitleSelected,
                !isDownloaded && styles.cardTitleDisabled,
              ]}
            >
              {model.name}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>ACTIVE</Text>
            </View>
          )}
          {isDownloaded && !isSelected && (
            <View style={styles.downloadedBadge}>
              <Text style={styles.downloadedBadgeText}>DOWNLOADED</Text>
            </View>
          )}
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>
            {model.quantization} {'\u2022'} {formatBytes(model.sizeBytes)}
          </Text>
        </View>

        <Text style={styles.cardDescription}>{model.description}</Text>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.cardActions}>
        {!isDownloaded && !isDownloading && !isVerifying && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={onDownload}
            activeOpacity={0.7}
          >
            <Download size={16} color={DarkColors.accent} />
            <Text style={styles.downloadButtonText}>Download</Text>
          </TouchableOpacity>
        )}

        {isDownloading && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={DarkColors.accent} />
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${(downloadState.progress ?? 0) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((downloadState.progress ?? 0) * 100)}%
            </Text>
          </View>
        )}

        {isVerifying && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={DarkColors.accent} />
            <Text style={styles.verifyingText}>Verifying...</Text>
          </View>
        )}

        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{downloadState.error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onDownload}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {isDownloaded && !isSelected && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={DarkColors.danger} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}

        {!isDownloaded && !isDownloading && !isVerifying && !hasError && (
          <Text style={styles.notDownloadedHint}>
            Download to use this model
          </Text>
        )}
      </View>
    </View>
  );
}

export function ModelSelector() {
  const {
    selectedModelId,
    downloadedModelIds,
    selectModel,
    markModelDownloaded,
    removeModelFromDownloaded,
    loadFromStorage,
  } = useModelStore();

  // Track download state for each model
  const [downloadStates, setDownloadStates] = useState<Record<string, ModelDownloadState>>({});
  const controlsRef = useRef<Record<string, DownloadControls | null>>({});

  // Check actual download status on mount
  useEffect(() => {
    loadFromStorage();

    // Verify which models are actually downloaded on disk
    async function checkDownloadedModels() {
      for (const model of AVAILABLE_MODELS) {
        const downloaded = await isModelDownloaded(model);
        if (downloaded) {
          markModelDownloaded(model.id);
        }
      }
    }
    checkDownloadedModels();
  }, [loadFromStorage, markModelDownloaded]);

  const handleSelectModel = useCallback(
    (modelId: string) => {
      if (modelId === selectedModelId) return;
      if (!downloadedModelIds.includes(modelId)) {
        Alert.alert('Model Not Downloaded', 'Please download this model first before selecting it.');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectModel(modelId);

      Alert.alert(
        'Model Changed',
        'The new model will be used after restarting the app.',
        [{ text: 'OK' }]
      );
    },
    [selectedModelId, downloadedModelIds, selectModel]
  );

  const handleDownload = useCallback(
    (model: ModelDefinition) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setDownloadStates((prev) => ({
        ...prev,
        [model.id]: { status: 'downloading', progress: 0 },
      }));

      controlsRef.current[model.id] = downloadModel(
        // Progress callback
        (bytesWritten, totalBytes) => {
          setDownloadStates((prev) => ({
            ...prev,
            [model.id]: { status: 'downloading', progress: bytesWritten / totalBytes },
          }));
        },
        // Complete callback
        async () => {
          setDownloadStates((prev) => ({
            ...prev,
            [model.id]: { status: 'verifying' },
          }));

          const verified = await verifyModelChecksum(model);
          if (verified) {
            markModelDownloaded(model.id);
            setDownloadStates((prev) => ({
              ...prev,
              [model.id]: { status: 'idle' },
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            await deleteModelFile(model);
            setDownloadStates((prev) => ({
              ...prev,
              [model.id]: { status: 'error', error: 'Verification failed. Please try again.' },
            }));
          }
          controlsRef.current[model.id] = null;
        },
        // Error callback
        (error) => {
          setDownloadStates((prev) => ({
            ...prev,
            [model.id]: { status: 'error', error: error.message },
          }));
          controlsRef.current[model.id] = null;
        },
        model
      );
    },
    [markModelDownloaded]
  );

  const handleDelete = useCallback(
    (model: ModelDefinition) => {
      if (model.id === selectedModelId) {
        Alert.alert(
          'Cannot Delete Active Model',
          'This model is currently in use. Switch to another model first.'
        );
        return;
      }

      Alert.alert(
        'Delete Model',
        `Delete ${model.name}? This will free up ${formatBytes(model.sizeBytes)} of storage.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

              await deleteModelFile(model);

              // Update store to remove from downloaded list
              removeModelFromDownloaded(model.id);

              Alert.alert('Deleted', `${model.name} has been removed.`);
            },
          },
        ]
      );
    },
    [selectedModelId, removeModelFromDownloaded]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Model Selection</Text>
      <Text style={styles.sectionDescription}>
        Choose which AI model to use for conversations. Larger models are slower but more capable.
      </Text>

      <View style={styles.cardList}>
        {AVAILABLE_MODELS.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={selectedModelId === model.id}
            isDownloaded={downloadedModelIds.includes(model.id)}
            downloadState={downloadStates[model.id] ?? { status: 'idle' }}
            onSelect={() => handleSelectModel(model.id)}
            onDownload={() => handleDownload(model)}
            onDelete={() => handleDelete(model)}
          />
        ))}
      </View>

      <Text style={styles.footerNote}>
        Tap a downloaded model to make it active. Changes take effect after restarting the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: DarkSpacing.sm,
  },
  sectionDescription: {
    fontSize: DarkTypography.callout,
    color: DarkColors.textSecondary,
    lineHeight: 22,
    marginBottom: DarkSpacing.lg,
  },
  cardList: {
    gap: DarkSpacing.md,
  },
  card: {
    backgroundColor: DarkColors.surface,
    borderRadius: DarkSpacing.radiusMd,
    padding: DarkSpacing.cardPadding,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: DarkColors.accent,
    backgroundColor: DarkColors.accentMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DarkSpacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.sm,
  },
  cardTitle: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.text,
  },
  cardTitleSelected: {
    color: DarkColors.accent,
  },
  currentBadge: {
    backgroundColor: DarkColors.accent,
    paddingHorizontal: DarkSpacing.sm,
    paddingVertical: DarkSpacing.xs,
    borderRadius: DarkSpacing.radiusXs,
  },
  currentBadgeText: {
    fontSize: DarkTypography.caption2,
    fontWeight: DarkTypography.weightBold,
    color: DarkColors.userMessageText,
    letterSpacing: 0.5,
  },
  cardMeta: {
    marginBottom: DarkSpacing.sm,
    marginLeft: 28, // Align with title after icon
  },
  cardMetaText: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
  },
  cardDescription: {
    fontSize: DarkTypography.callout,
    color: DarkColors.textSecondary,
    lineHeight: 20,
    marginLeft: 28, // Align with title after icon
  },
  cardTitleDisabled: {
    color: DarkColors.textTertiary,
  },
  downloadedBadge: {
    backgroundColor: DarkColors.surfaceElevated,
    paddingHorizontal: DarkSpacing.sm,
    paddingVertical: DarkSpacing.xs,
    borderRadius: DarkSpacing.radiusXs,
  },
  downloadedBadgeText: {
    fontSize: DarkTypography.caption2,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.textSecondary,
    letterSpacing: 0.5,
  },
  cardActions: {
    marginTop: DarkSpacing.md,
    paddingTop: DarkSpacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DarkColors.border,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DarkSpacing.sm,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.lg,
    backgroundColor: DarkColors.accentMuted,
    borderRadius: DarkSpacing.radiusSm,
    alignSelf: 'flex-start',
  },
  downloadButtonText: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.accent,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DarkSpacing.sm,
    paddingVertical: DarkSpacing.sm,
    paddingHorizontal: DarkSpacing.lg,
    backgroundColor: DarkColors.dangerMuted,
    borderRadius: DarkSpacing.radiusSm,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    fontSize: DarkTypography.callout,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.danger,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.md,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: DarkColors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: DarkColors.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  verifyingText: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: DarkSpacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: DarkTypography.footnote,
    color: DarkColors.danger,
  },
  retryButton: {
    paddingVertical: DarkSpacing.xs,
    paddingHorizontal: DarkSpacing.md,
    backgroundColor: DarkColors.dangerMuted,
    borderRadius: DarkSpacing.radiusSm,
  },
  retryButtonText: {
    fontSize: DarkTypography.footnote,
    fontWeight: DarkTypography.weightMedium,
    color: DarkColors.danger,
  },
  notDownloadedHint: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
    fontStyle: 'italic',
  },
  footerNote: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
    marginTop: DarkSpacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
});
