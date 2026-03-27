import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useGamificationStore, type XPGain } from '@/stores/gamificationStore';

// ─── Particule unique ─────────────────────────────────────────────────────────

interface XPParticleProps {
  gain: XPGain;
  onDone: (id: string) => void;
}

function XPParticle({ gain, onDone }: XPParticleProps) {
  const opacity      = useSharedValue(0);
  const translateY   = useSharedValue(0);
  const scale        = useSharedValue(0.6);

  useEffect(() => {
    // Phase 1 : apparition + montée
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(600, withTiming(0, { duration: 400 })),
    );
    translateY.value = withTiming(-80, { duration: 1200 });
    scale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1,   { duration: 150 }),
    );

    // Nettoyage après fin d'animation
    const timer = setTimeout(() => runOnJS(onDone)(gain.id), 1250);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale:      scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <Animated.Text style={styles.text}>+{gain.amount} XP</Animated.Text>
      {gain.reason ? (
        <Animated.Text style={styles.reason}>{gain.reason}</Animated.Text>
      ) : null}
    </Animated.View>
  );
}

// ─── Overlay principal ────────────────────────────────────────────────────────

/**
 * Composant overlay à placer à la racine de l'écran (ex: dans le layout).
 * Il s'auto-alimente via le gamificationStore et retire chaque particule
 * une fois son animation terminée.
 */
export function XPGainAnimation() {
  const { recentXpGains, removeXPGain } = useGamificationStore();

  if (recentXpGains.length === 0) return null;

  return (
    <Animated.View style={styles.overlay} pointerEvents="none">
      {recentXpGains.map((gain) => (
        <XPParticle key={gain.id} gain={gain} onDone={removeXPGain} />
      ))}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position:       'absolute',
    bottom:         120, // au-dessus de la tab bar
    left:           0,
    right:          0,
    alignItems:     'center',
    pointerEvents:  'none',
    zIndex:         999,
  },
  particle: {
    position:        'absolute',
    alignItems:      'center',
  },
  text: {
    color:      '#FFD700',
    fontSize:   24,
    fontWeight: 'bold',
    textShadowColor:  'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reason: {
    color:    '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
});
