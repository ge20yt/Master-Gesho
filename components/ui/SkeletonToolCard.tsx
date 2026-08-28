/**
 * components/ui/SkeletonToolCard.tsx
 * Skeleton placeholder that matches FeedToolCard dimensions exactly.
 * Prevents layout shift when real cards load.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCard } from './SkeletonCard';
import { useTheme } from '../../contexts/ThemeContext';

export function SkeletonToolCard() {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Accent line */}
      <SkeletonCard height={3} borderRadius={0} />

      {/* Body row */}
      <View style={styles.body}>
        {/* Icon */}
        <SkeletonCard width={52} height={52} borderRadius={14} />

        {/* Info column */}
        <View style={styles.info}>
          {/* Name row */}
          <View style={styles.nameRow}>
            <SkeletonCard width={130} height={16} borderRadius={8} />
            <SkeletonCard width={60} height={18} borderRadius={9999} />
          </View>
          {/* Description lines */}
          <SkeletonCard width="95%" height={12} borderRadius={6} />
          <SkeletonCard width="75%" height={12} borderRadius={6} />
          {/* Chips */}
          <View style={styles.chips}>
            <SkeletonCard width={64} height={20} borderRadius={9999} />
            <SkeletonCard width={40} height={20} borderRadius={9999} />
            <SkeletonCard width={52} height={20} borderRadius={9999} />
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <SkeletonCard width={36} height={20} borderRadius={9999} />
        <View style={styles.footerActions}>
          <SkeletonCard width={58} height={28} borderRadius={9999} />
          <SkeletonCard width={32} height={28} borderRadius={9999} />
          <SkeletonCard width={32} height={28} borderRadius={9999} />
          <SkeletonCard width={72} height={28} borderRadius={9999} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  body: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  info: {
    flex: 1,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
});

export default SkeletonToolCard;
