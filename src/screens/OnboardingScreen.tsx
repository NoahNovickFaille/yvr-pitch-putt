import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DarkColors } from '@/constants/darkTheme';
import { PrivacyStep } from '@/src/components/onboarding/PrivacyStep';
import { ProfileStep } from '@/src/components/onboarding/ProfileStep';
import { DisclaimerStep } from '@/src/components/onboarding/DisclaimerStep';
import { useOnboardingStore } from '@/src/stores/onboardingStore';

type OnboardingStep = 'privacy' | 'profile' | 'disclaimer';

export function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('privacy');
  const [userName, setUserName] = useState('');
  const [userBio, setUserBio] = useState('');
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const insets = useSafeAreaInsets();

  const handlePrivacyNext = () => {
    setCurrentStep('profile');
  };

  const handleProfileNext = (name: string, bio: string) => {
    setUserName(name);
    setUserBio(bio);
    setCurrentStep('disclaimer');
  };

  const handleDisclaimerNext = () => {
    // Complete onboarding with the collected name and bio
    completeOnboarding(userName, userBio);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'privacy':
        return <PrivacyStep onNext={handlePrivacyNext} />;
      case 'profile':
        return <ProfileStep onNext={handleProfileNext} />;
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
