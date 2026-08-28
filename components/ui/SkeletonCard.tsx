/**
 * components/ui/SkeletonCard.tsx
 * Base shimmer skeleton primitive for مستر جيشو.
 * Uses react-native-reanimated withRepeat/withSequence for smooth UI-thread animation.
 */
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonCardProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  shimmerEnabled?: boolean;
}

export function SkeletonCard({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  shimmerEnabled = true,
}: SkeletonCardProps) {
  const { theme, isDark } = useTheme();

  const baseColor  = isDark ? '#1E293B' : '#E2E8F0';
  const shimmerColor = isDark ? '#334155' : '#CBD5E1';

  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!shimmerEnabled) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,   // infinite
      false // don't reverse (handled by sequence)
    );
  }, [shimmerEnabled]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        animStyle,
        style,
      ]}
    />
  );
}

export default SkeletonCard;
