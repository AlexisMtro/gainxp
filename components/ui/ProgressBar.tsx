import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** Valeur entre 0 et 1 */
  value: number;
  color?: string;
  /** Couleur de fond de la piste (défaut : backgroundElevated) */
  trackColor?: string;
  height?: number;
  borderRadius?: number;
  /** Durée de l'animation en ms (défaut : 500, 0 = pas d'animation) */
  animationDuration?: number;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  color = COLORS.primary,
  trackColor = COLORS.backgroundElevated,
  height = 6,
  borderRadius = 3,
  animationDuration = 500,
}: ProgressBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(1, Math.max(0, value));
    if (animationDuration === 0) {
      progress.value = clamped;
    } else {
      progress.value = withTiming(clamped, {
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [value, animationDuration]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius }]}>
      <Animated.View
        style={[
          styles.fill,
          barStyle,
          { backgroundColor: color, borderRadius },
        ]}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
