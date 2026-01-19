import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '@/src/constants/model';
import type { ModelDefinition } from '@/src/constants/model';

interface ModelSelectionStepProps {
  onNext: (modelId: string) => void;
}

function formatSize(bytes: number): string {
  const gb = bytes / 1_000_000_000;
  if (gb >= 1) {
    return `~${gb.toFixed(1)}GB`;
  }
  const mb = bytes / 1_000_000;
  return `~${Math.round(mb)}MB`;
}

function ModelCard({
  model,
  isSelected,
  isRecommended,
  onSelect,
}: {
  model: ModelDefinition;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modelCard, isSelected && styles.modelCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.modelCardHeader}>
        <View style={styles.modelCardTitleRow}>
          <Text style={styles.modelName}>{model.name}</Text>
          {isRecommended && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </View>

      <Text style={styles.modelDescription}>{model.description}</Text>

      <View style={styles.modelStats}>
        <View style={styles.modelStat}>
          <Ionicons name="cube-outline" size={14} color={DarkColors.textTertiary} />
          <Text style={styles.modelStatText}>{model.parameterCount} params</Text>
        </View>
        <View style={styles.modelStat}>
          <Ionicons name="cloud-download-outline" size={14} color={DarkColors.textTertiary} />
          <Text style={styles.modelStatText}>{formatSize(model.sizeBytes)}</Text>
        </View>
        <View style={styles.modelStat}>
          <Ionicons name="flash-outline" size={14} color={DarkColors.textTertiary} />
          <Text style={styles.modelStatText}>{model.quantization}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ModelSelectionStep({ onNext }: ModelSelectionStepProps) {
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="hardware-chip" size={64} color={DarkColors.accent} />
        </View>

        <Text style={styles.title}>Choose Your AI Model</Text>

        <Text style={styles.description}>
          Select the model that best fits your device. Larger models offer better conversations
          but require more storage and memory.
        </Text>

        <View style={styles.modelList}>
          {AVAILABLE_MODELS.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={selectedModelId === model.id}
              isRecommended={model.id === DEFAULT_MODEL_ID}
              onSelect={() => setSelectedModelId(model.id)}
            />
          ))}
        </View>

        <View style={styles.wifiNote}>
          <Ionicons name="wifi" size={16} color={DarkColors.textTertiary} />
          <Text style={styles.wifiNoteText}>
            We recommend downloading over WiFi
          </Text>
        </View>
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

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => onNext(selectedModelId)}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={DarkColors.userMessageText} />
        </TouchableOpacity>
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
  },
  iconContainer: {
    alignItems: 'center',
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
  },
  modelList: {
    gap: DarkSpacing.md,
    marginBottom: DarkSpacing.lg,
  },
  modelCard: {
    backgroundColor: DarkColors.surface,
    borderRadius: DarkSpacing.radiusMd,
    padding: DarkSpacing.lg,
    borderWidth: 2,
    borderColor: DarkColors.border,
  },
  modelCardSelected: {
    borderColor: DarkColors.accent,
    backgroundColor: DarkColors.accentMuted,
  },
  modelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DarkSpacing.sm,
  },
  modelCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.sm,
  },
  modelName: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.text,
  },
  recommendedBadge: {
    backgroundColor: DarkColors.accent,
    paddingVertical: 2,
    paddingHorizontal: DarkSpacing.sm,
    borderRadius: DarkSpacing.radiusXs,
  },
  recommendedText: {
    fontSize: DarkTypography.caption2,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.userMessageText,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: DarkColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: DarkColors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DarkColors.accent,
  },
  modelDescription: {
    fontSize: DarkTypography.subheadline,
    color: DarkColors.textSecondary,
    marginBottom: DarkSpacing.md,
  },
  modelStats: {
    flexDirection: 'row',
    gap: DarkSpacing.lg,
  },
  modelStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DarkSpacing.xs,
  },
  modelStatText: {
    fontSize: DarkTypography.caption1,
    color: DarkColors.textTertiary,
  },
  wifiNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DarkSpacing.sm,
  },
  wifiNoteText: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
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
  continueButton: {
    backgroundColor: DarkColors.accent,
    paddingVertical: DarkSpacing.lg,
    paddingHorizontal: DarkSpacing.xxl,
    borderRadius: DarkSpacing.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DarkSpacing.sm,
  },
  continueText: {
    fontSize: DarkTypography.headline,
    fontWeight: DarkTypography.weightSemibold,
    color: DarkColors.userMessageText,
  },
});
