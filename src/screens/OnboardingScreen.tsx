import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DarkColors } from '@/constants/darkTheme';
import { PrivacyStep } from '@/src/components/onboarding/PrivacyStep';
import { NameStep } from '@/src/components/onboarding/NameStep';
import { DisclaimerStep } from '@/src/components/onboarding/DisclaimerStep';
import { useOnboardingStore } from '@/src/stores/onboardingStore';

type OnboardingStep = 'privacy' | 'name' | 'disclaimer';

export function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('privacy');
  const [userName, setUserName] = useState('');
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const insets = useSafeAreaInsets();

  const handlePrivacyNext = () => {
    setCurrentStep('name');
  };

  const handleNameNext = (name: string) => {
    setUserName(name);
    setCurrentStep('disclaimer');
  };

  const handleDisclaimerNext = () => {
    // Complete onboarding with the collected name
    completeOnboarding(userName);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'privacy':
        return <PrivacyStep onNext={handlePrivacyNext} />;
      case 'name':
        return <NameStep onNext={handleNameNext} />;
      case 'disclaimer':
        return <DisclaimerStep onNext={handleDisclaimerNext} />;
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
