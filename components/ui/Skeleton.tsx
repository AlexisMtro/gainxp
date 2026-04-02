import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkeletonShape = 'line' | 'circle' | 'block';

interface SkeletonProps {
  shape?: SkeletonShape;
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

// ─── Composant atomique ───────────────────────────────────────────────────────

export function Skeleton({
  shape    = 'line',
  width    = '100%',
  height   = shape === 'line' ? 14 : 48,
  borderRadius,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 700, easing: Easing.ease }),
        withTiming(1,   { duration: 700, easing: Easing.ease })
      ),
      -1, // répétition infinie
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const computedRadius =
    borderRadius !== undefined ? borderRadius :
    shape === 'circle' ? 9999 :
    shape === 'line'   ? 6 :
    10;

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width,
          height: shape === 'circle' ? width : height,
          borderRadius: computedRadius,
          backgroundColor: COLORS.backgroundElevated,
        },
        style,
      ]}
    />
  );
}

// ─── Composants prédéfinis ────────────────────────────────────────────────────

/** Skeleton d'une carte workout (nom + méta + tags) */
export function WorkoutCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.row}>
        <Skeleton width="55%" height={16} />
        <Skeleton width={48} height={12} />
      </View>
      <View style={[skeletonStyles.row, { marginTop: 8 }]}>
        <Skeleton width={60} height={12} />
        <Skeleton width={60} height={12} />
        <Skeleton width={60} height={12} />
      </View>
      <View style={[skeletonStyles.row, { marginTop: 10 }]}>
        <Skeleton width={72} height={24} borderRadius={12} />
        <Skeleton width={72} height={24} borderRadius={12} />
      </View>
      <Skeleton width="100%" height={36} borderRadius={10} style={{ marginTop: 14 }} />
    </View>
  );
}

/** Skeleton d'un profil utilisateur (avatar + nom + stats) */
export function ProfileHeaderSkeleton() {
  return (
    <View style={skeletonStyles.profileRow}>
      <Skeleton shape="circle" width={64} />
      <View style={skeletonStyles.profileText}>
        <Skeleton width="50%" height={18} />
        <Skeleton width="35%" height={13} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  profileText: {
    flex: 1,
    gap: 0,
  },
});
