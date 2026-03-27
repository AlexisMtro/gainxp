import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useEffect, useMemo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useGamificationStore } from '@/stores/gamificationStore';
import { getLevelName } from '@/lib/utils';
import { LevelBadge } from './LevelBadge';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLE_COUNT = 30;

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#6C63FF', '#FFD700', '#FF6584', '#43E97B', '#60A5FA', '#F97316'];

interface Particle {
  x: number;
  color: string;
  delay: number;
  size: number;
}

function ConfettiParticle({ x, color, delay, size }: Particle) {
  const translateY = useSharedValue(-20);
  const opacity    = useSharedValue(0);
  const rotate     = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(SCREEN_H + 20, { duration: 2000, easing: Easing.in(Easing.quad) }));
    opacity.value    = withDelay(delay, withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(1400, withTiming(0, { duration: 500 })),
    ));
    rotate.value     = withDelay(delay, withTiming(720, { duration: 2000 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        style,
        { left: x, backgroundColor: color, width: size, height: size, borderRadius: size / 4 },
      ]}
    />
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function LevelUpModal() {
  const { pendingLevelUp, dismissLevelUp } = useGamificationStore();

  const backdropOpacity = useSharedValue(0);
  const cardScale       = useSharedValue(0.7);
  const cardOpacity     = useSharedValue(0);

  // Génération stable des confettis
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x:     Math.random() * SCREEN_W,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 600,
      size:  6 + Math.random() * 8,
    })),
  [pendingLevelUp?.to]);

  useEffect(() => {
    if (!pendingLevelUp) return;

    // Entrée
    backdropOpacity.value = withTiming(1, { duration: 300 });
    cardScale.value       = withSpring(1, { damping: 14, stiffness: 180 });
    cardOpacity.value     = withTiming(1, { duration: 250 });
  }, [pendingLevelUp]);

  if (!pendingLevelUp) return null;

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const cardStyle     = useAnimatedStyle(() => ({
    opacity:   cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const handleDismiss = () => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    cardOpacity.value     = withTiming(0, { duration: 200 });
    cardScale.value       = withTiming(0.8, { duration: 200 });
    setTimeout(dismissLevelUp, 220);
  };

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Confettis */}
      {particles.map((p, i) => (
        <ConfettiParticle key={i} {...p} />
      ))}

      {/* Fond semi-transparent */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        {/* Carte */}
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={['#1A1040', '#1A1A2E']}
            style={styles.gradient}
          >
            {/* Titre */}
            <Text style={styles.title}>Niveau supérieur !</Text>
            <Text style={styles.subtitle}>Tu as progressé</Text>

            {/* Badges avant → après */}
            <View style={styles.badgesRow}>
              <View style={styles.badgeWrap}>
                <LevelBadge level={pendingLevelUp.from} variant="medium" showLabel />
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.badgeWrap}>
                <LevelBadge level={pendingLevelUp.to} variant="large" animated showLabel />
              </View>
            </View>

            {/* Nom du nouveau niveau */}
            <View style={styles.levelNameWrap}>
              <Text style={styles.levelName}>{pendingLevelUp.newName}</Text>
              <Text style={styles.levelSub}>Niveau {pendingLevelUp.to} atteint</Text>
            </View>

            {/* Bouton fermer */}
            <TouchableOpacity onPress={handleDismiss} activeOpacity={0.85}>
              <LinearGradient
                colors={['#6C63FF', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Continuer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:         { ...StyleSheet.absoluteFillObject, zIndex: 1000, pointerEvents: 'box-none' },
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:         { width: '100%', maxWidth: 340, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#6C63FF44' },
  gradient:     { padding: 32, alignItems: 'center' },
  confetti:     { position: 'absolute', top: 0 },
  title:        { color: '#FFD700', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle:     { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  badgesRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  badgeWrap:    { alignItems: 'center', minWidth: 80 },
  arrow:        { color: '#6C63FF', fontSize: 24, marginHorizontal: 16 },
  levelNameWrap: { alignItems: 'center', marginBottom: 32 },
  levelName:    { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  levelSub:     { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  button:       { paddingVertical: 14, paddingHorizontal: 48, borderRadius: 16 },
  buttonText:   { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});
