/**
 * app/index.tsx — Root screen
 * Checks onboarding status before routing to auth/main flow.
 */
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthRouter } from '@/template';
import { Redirect, useRouter } from 'expo-router';
import { isOnboardingComplete } from '../services/onboardingService';

export default function RootScreen() {
  const [checking, setChecking] = useState(true);
  const [done, setDone]         = useState(false);
  const router                  = useRouter();

  useEffect(() => {
    isOnboardingComplete().then(completed => {
      setDone(completed);
      setChecking(false);
      if (!completed) router.replace('/onboarding');
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090E1A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  if (!done) return null; // Will redirect to /onboarding

  return (
    <AuthRouter loginRoute="/login">
      <Redirect href="/(tabs)" />
    </AuthRouter>
  );
}
