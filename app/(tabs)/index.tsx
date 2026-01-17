import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { ModelSetupScreen } from '../../src/screens/ModelSetupScreen';
import { useDownloadStore } from '../../src/services/download/downloadStore';
import { useLLM } from '../../src/hooks/useLLM';

export default function HomeScreen() {
  const [setupComplete, setSetupComplete] = useState(false);
  const { modelState } = useDownloadStore();
  const { isReady, wasUnloaded, reinitialize } = useLLM();

  // Check if we need to show setup on mount
  useEffect(() => {
    // If model is already ready, skip setup
    if (isReady) {
      setSetupComplete(true);
    }
  }, [isReady]);

  // Handle model unloaded due to memory pressure
  useEffect(() => {
    if (wasUnloaded && setupComplete) {
      // Could auto-reinitialize, or prompt user
      // For now, auto-reinitialize
      reinitialize();
    }
  }, [wasUnloaded, setupComplete, reinitialize]);

  // Show setup screen if model not ready
  if (!setupComplete && !isReady) {
    return (
      <ModelSetupScreen
        onReady={() => setSetupComplete(true)}
      />
    );
  }

  // Main app content (placeholder for Phase 2: Chat)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Confidant</Text>
        <Text style={styles.subtitle}>
          Model loaded and ready.
        </Text>
        <Text style={styles.description}>
          Chat interface coming in Phase 2.
        </Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Model Status:</Text>
          <Text style={styles.statusValue}>
            {isReady ? 'Ready' : wasUnloaded ? 'Reloading...' : 'Unknown'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#34C759',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  statusBox: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});
