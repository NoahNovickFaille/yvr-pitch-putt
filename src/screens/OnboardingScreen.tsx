import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DarkColors } from '@/constants/darkTheme';
import { WelcomeStep } from '@/src/components/onboarding/WelcomeStep';
import { PrivacyStep } from '@/src/components/onboarding/PrivacyStep';
import { ProfileStep } from '@/src/components/onboarding/ProfileStep';
import { ModelSelectionStep } from '@/src/components/onboarding/ModelSelectionStep';
import { DisclaimerStep } from '@/src/components/onboarding/DisclaimerStep';
import { DownloadStep } from '@/src/components/onboarding/DownloadStep';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useModelStore } from '@/src/stores/modelStore';

type OnboardingStep = 'welcome' | 'privacy' | 'profile' | 'modelSelection' | 'disclaimer' | 'download';

export function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [userName, setUserName] = useState('');
  const [userBio, setUserBio] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const selectModel = useModelStore((state) => state.selectModel);
  const markModelDownloaded = useModelStore((state) => state.markModelDownloaded);
  const insets = useSafeAreaInsets();

  const handleWelcomeNext = () => {
    setCurrentStep('privacy');
  };

  const handlePrivacyNext = () => {
    setCurrentStep('profile');
  };

  const handleProfileNext = (name: string, bio: string) => {
    setUserName(name);
    setUserBio(bio);
    setCurrentStep('modelSelection');
  };

  const handleModelSelectionNext = (modelId: string) => {
    setSelectedModelId(modelId);
    // Persist to store immediately so useModelDownload uses correct model
    selectModel(modelId);
    setCurrentStep('disclaimer');
  };

  const handleDisclaimerNext = () => {
    setCurrentStep('download');
  };

  const handleDownloadComplete = () => {
    // Mark model as downloaded and complete onboarding
    markModelDownloaded(selectedModelId);
    completeOnboarding(userName, userBio);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={handleWelcomeNext} />;
      case 'privacy':
        return <PrivacyStep onNext={handlePrivacyNext} />;
      case 'profile':
        return <ProfileStep onNext={handleProfileNext} />;
      case 'modelSelection':
        return <ModelSelectionStep onNext={handleModelSelectionNext} />;
      case 'disclaimer':
        return <DisclaimerStep onNext={handleDisclaimerNext} />;
      case 'download':
        return <DownloadStep onComplete={handleDownloadComplete} />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.background,
  },
});
