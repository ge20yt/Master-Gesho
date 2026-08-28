/**
 * components/ui/SkeletonPostCard.tsx
 * Skeleton placeholder that matches FeedPostCard dimensions exactly.
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SkeletonCard } from './SkeletonCard';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SW } = Dimensions.get('window');
const IMG_H = SW * 0.56; // matches FeedPostCard imgWrap height ~218px

export function SkeletonPostCard() {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Cover image placeholder */}
      <SkeletonCard width="100%" height={IMG_H} borderRadius={0} />

      {/* Content area */}
      <View style={styles.content}>
        {/* Title */}
        <SkeletonCard width="92%" height={18} borderRadius={8} />
        <SkeletonCard width="72%" height={18} borderRadius={8} />
        {/* Summary */}
        <SkeletonCard width="85%" height={13} borderRadius={6} />
        {/* Footer row */}
        <View style={styles.footer}>
          <View style={styles.meta}>
            <SkeletonCard width={36} height={16} borderRadius={4} />
            <SkeletonCard width={4} height={4} borderRadius={2} />
            <SkeletonCard width={30} height={16} borderRadius={4} />
            <SkeletonCard width={4} height={4} borderRadius={2} />
            <SkeletonCard width={30} height={16} borderRadius={4} />
          </View>
          <SkeletonCard width={58} height={28} borderRadius={9999} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 14,
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
});

export default SkeletonPostCard;
