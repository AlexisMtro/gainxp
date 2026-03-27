import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface StreakDisplayProps {
  streakDays: number;
  /** Compact pour les headers, false pour les cards */
  compact?: boolean;
}

// ─── Seuils visuels ───────────────────────────────────────────────────────────

function getStreakColor(days: number): string {
  if (days >= 30) return '#EF4444'; // Rouge intense — on fire
  if (days >= 14) return '#F97316'; // Orange
  if (days >= 7)  return '#F59E0B'; // Ambre
  if (days >= 3)  return '#FFD700'; // Or
  return '#9CA3AF';                 // Gris — débutant
}

function getStreakMessage(days: number): string {
  if (days === 0)  return 'Lance-toi !';
  if (days === 1)  return 'C\'est parti !';
  if (days < 3)   return 'Continue !';
  if (days < 7)   return 'Bonne dynamique !';
  if (days < 14)  return 'Sur ta lancée !';
  if (days < 30)  return 'Inarrêtable !';
  return 'LÉGENDAIRE !';
}

// ─── Composant ─────────────────────────────────────────────────────────────────

export function StreakDisplay({ streakDays, compact = false }: StreakDisplayProps) {
  const color   = getStreakColor(streakDays);
  const message = getStreakMessage(streakDays);
  const isHot   = streakDays >= 7;

  // Animation flamme — pulse vertical uniquement si streak actif
  const flameScale   = useSharedValue(1);
  const flameOpacity = useSharedValue(1);
  // Effet "pop" d'entrée
  const entryScale   = useSharedValue(0.6);

  useEffect(() => {
    // Pop d'entrée
    entryScale.value = withSpring(1, { damping: 12, stiffness: 200 });

    if (!isHot) return;

    // Flamme qui pulse
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 500 }),
        withTiming(0.95, { duration: 500 }),
      ),
      -1,
      true,
    );
    flameOpacity.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 700 }),
        withTiming(1,    { duration: 700 }),
      ),
      -1,
      true,
    );
  }, [isHot, streakDays]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
    opacity: flameOpacity.value,
  }));
  const entryStyle = useAnimatedStyle(() => ({
    transform: [{ scale: entryScale.value }],
  }));

  // ── Mode compact (header, carte) ─────────────────────────────────────────
  if (compact) {
    return (
      <Animated.View style={[styles.compact, entryStyle]}>
        <Animated.Text style={[styles.flameCompact, flameStyle]}>
          {streakDays > 0 ? '🔥' : '💤'}
        </Animated.Text>
        <Text style={[styles.countCompact, { color }]}>{streakDays}</Text>
      </Animated.View>
    );
  }

  // ── Mode complet (card dédiée) ────────────────────────────────────────────
  return (
    <Animated.View style={[styles.card, { borderColor: `${color}40`, backgroundColor: `${color}10` }, entryStyle]}>
      {/* Flamme principale */}
      <Animated.Text style={[styles.flame, flameStyle]}>
        {streakDays > 0 ? '🔥' : '💤'}
      </Animated.Text>

      {/* Compteur */}
      <View style={styles.textBlock}>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color }]}>{streakDays}</Text>
          <Text style={[styles.unit, { color }]}>{streakDays > 1 ? ' jours' : ' jour'}</Text>
          <Text style={styles.label}> de suite</Text>
        </View>
        <Text style={[styles.message, { color }]}>{message}</Text>
      </View>

      {/* Indicateurs de jalons */}
      {streakDays > 0 && (
        <View style={styles.milestones}>
          {[3, 7, 14, 30].map((m) => (
            <View
              key={m}
              style={[
                styles.milestone,
                { backgroundColor: streakDays >= m ? color : '#252540' },
              ]}
            >
              <Text style={[styles.milestoneText, { color: streakDays >= m ? '#0F0F1A' : '#4B5563' }]}>
                {m}j
              </Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Mode compact
  compact:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flameCompact:  { fontSize: 18 },
  countCompact:  { fontSize: 16, fontWeight: 'bold' },

  // Mode full card
  card:          { borderWidth: 1.5, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  flame:         { fontSize: 48 },
  textBlock:     { flex: 1 },
  countRow:      { flexDirection: 'row', alignItems: 'baseline' },
  count:         { fontSize: 32, fontWeight: 'bold' },
  unit:          { fontSize: 18, fontWeight: '600' },
  label:         { fontSize: 18, color: '#6B7280' },
  message:       { fontSize: 13, fontWeight: '600', marginTop: 2, opacity: 0.8 },
  milestones:    { flexDirection: 'column', gap: 6, alignItems: 'center' },
  milestone:     { width: 36, paddingVertical: 4, borderRadius: 10, alignItems: 'center' },
  milestoneText: { fontSize: 10, fontWeight: 'bold' },
});
