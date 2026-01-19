import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Circle, CheckCircle2 } from 'lucide-react-native';
import { DarkColors, DarkSpacing, DarkTypography } from '@/constants/darkTheme';
import { AVAILABLE_MODELS, ModelDefinition } from '../../constants/model';
import { useModelStore } from '../../stores/modelStore';

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
  onSelect: () => void;
}

function ModelCard({ model, isSelected, isDownloaded, onSelect }: ModelCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          {isSelected ? (
            <CheckCircle2 size={20} color={DarkColors.accent} />
          ) : (
            <Circle size={20} color={DarkColors.textTertiary} />
          )}
          <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
            {model.name}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>CURRENT</Text>
          </View>
        )}
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>
          {model.quantization} {'\u2022'} {formatBytes(model.sizeBytes)}
        </Text>
      </View>

      <Text style={styles.cardDescription}>{model.description}</Text>

      {!isDownloaded && !isSelected && (
        <Text style={styles.downloadNote}>Download required</Text>
      )}
    </TouchableOpacity>
  );
}

export function ModelSelector() {
  const { selectedModelId, downloadedModelIds, selectModel, loadFromStorage } = useModelStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleSelectModel = (modelId: string) => {
    if (modelId === selectedModelId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    selectModel(modelId);
  };

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
            onSelect={() => handleSelectModel(model.id)}
          />
        ))}
      </View>

      <Text style={styles.footerNote}>
        Model switching will take effect on next app restart. Additional models require download.
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
  downloadNote: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.warning,
    marginTop: DarkSpacing.sm,
    marginLeft: 28,
  },
  footerNote: {
    fontSize: DarkTypography.footnote,
    color: DarkColors.textTertiary,
    marginTop: DarkSpacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
});
