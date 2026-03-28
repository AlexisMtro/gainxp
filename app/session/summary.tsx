import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore }      from '@/stores/sessionStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { LevelUpModal }         from '@/components/gamification/LevelUpModal';
import { LevelBadge }           from '@/components/gamification/LevelBadge';
import { COLORS }               from '@/lib/constants';
import { getLevelFromXP, getXPProgressPercent, formatDuration, calculateCalories } from '@/lib/utils';
import type { CompletedSet, WorkoutExercise } from '@/types/index';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#6C63FF', '#FFD700', '#FF6584', '#43E97B', '#60A5FA', '#F97316', '#A78BFA'];
const CONFETTI_COUNT  = 40;

interface ConfettiProps { x: number; color: string; delay: number; size: number; rotation: number }

function ConfettiPiece({ x, color, delay, size, rotation }: ConfettiProps) {
  const y       = useSharedValue(-16);
  const opacity = useSharedValue(0);
  const rot     = useSharedValue(rotation);

  useEffect(() => {
    y.value       = withDelay(delay, withTiming(SCREEN_H + 24, { duration: 2400, easing: Easing.in(Easing.quad) }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1,   { duration: 120 }),
      withDelay(1500, withTiming(0, { duration: 500 })),
    ));
    rot.value     = withDelay(delay, withTiming(rotation + 540, { duration: 2400 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[{
      position: 'absolute', top: 0, left: x,
      width: size, height: size * 0.55,
      backgroundColor: color,
      borderRadius: 2,
    }, style]} />
  );
}

// ─── XP Bar animée ────────────────────────────────────────────────────────────

interface XPBarAnimatedProps {
  xpBefore: number;
  xpAfter:  number;
  delay?:   number;
}

function XPBarAnimated({ xpBefore, xpAfter, delay = 600 }: XPBarAnimatedProps) {
  const levelBefore = getLevelFromXP(xpBefore);
  const levelAfter  = getLevelFromXP(xpAfter);
  const progBefore  = getXPProgressPercent(xpBefore) / 100;
  const progAfter   = getXPProgressPercent(xpAfter)  / 100;

  const levelChanged = levelAfter.level > levelBefore.level;

  const widthSV = useSharedValue(levelChanged ? 0 : progBefore);

  useEffect(() => {
    // Si level up : anime 0 → progAfter (montre la progression dans le nouveau niveau)
    // Sinon : anime progBefore → progAfter
    widthSV.value = withDelay(
      delay,
      withTiming(progAfter, { duration: 1400, easing: Easing.out(Easing.cubic) })
    );
  }, [progAfter]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${widthSV.value * 100}%`,
  }));

  const displayLevel = levelChanged ? levelAfter : levelBefore;

  return (
    <View>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 }}>
          Niv. <Text style={{ color: displayLevel.badge_color }}>{displayLevel.level}</Text>
          {'  '}
          <Text style={{ color: COLORS.textSecondary, fontWeight: '400', fontSize: 12 }}>
            {displayLevel.name}
          </Text>
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
          {Math.round(progAfter * 100)}%
        </Text>
      </View>

      {/* Barre */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle, { backgroundColor: displayLevel.badge_color }]} />
        {/* Marqueur "avant" (si pas de level up) */}
        {!levelChanged && progBefore > 0 && (
          <View style={[styles.barMarker, { left: `${progBefore * 100}%` as unknown as number }]} />
        )}
      </View>

      {/* Légende level up */}
      {levelChanged && (
        <Text style={{ color: COLORS.xp, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
          ⬆ Passé de Niv.{levelBefore.level} à Niv.{levelAfter.level}
        </Text>
      )}
    </View>
  );
}

// ─── Exercice collapsable ─────────────────────────────────────────────────────

interface ExerciseRowProps {
  exercise:     WorkoutExercise;
  completedSets: CompletedSet[];
}

function ExerciseDetail({ exercise, completedSets }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);

  const setsForExercise = completedSets.filter(
    (cs) => cs.exercise_id === exercise.exercise.id
  );
  const doneCount = setsForExercise.length;
  const totalSets = exercise.sets.length;

  const chevron = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value}deg` }],
  }));

  const toggle = () => {
    setExpanded((v) => !v);
    chevron.value = withTiming(expanded ? 0 : 90, { duration: 200 });
  };

  return (
    <View style={styles.exerciseCard}>
      {/* En-tête collapsable */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {/* Indicateur complété */}
        <View style={[styles.exDot, { backgroundColor: doneCount >= totalSets ? COLORS.success : COLORS.warning }]} />

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }}>
            {exercise.exercise.name}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
            {doneCount} / {totalSets} séries
          </Text>
        </View>

        <Animated.Text style={[{ color: COLORS.textMuted, fontSize: 16 }, chevronStyle]}>
          ›
        </Animated.Text>
      </TouchableOpacity>

      {/* Détail des séries */}
      {expanded && (
        <View style={{ marginTop: 12, gap: 6 }}>
          {exercise.sets.map((target, idx) => {
            const done = setsForExercise.find((cs) => cs.set_number === idx + 1);
            return (
              <View key={idx} style={styles.setDetailRow}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12, width: 24 }}>
                  S{idx + 1}
                </Text>
                {done ? (
                  <Text style={{ color: COLORS.success, fontSize: 13, flex: 1 }}>
                    {done.actual_reps ?? '—'} reps
                    {done.actual_weight_kg != null ? ` · ${done.actual_weight_kg} kg` : ''}
                  </Text>
                ) : (
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, flex: 1, fontStyle: 'italic' }}>
                    Non complétée
                  </Text>
                )}
                {/* Objectif cible */}
                {target.target_reps ? (
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>
                    obj. {target.target_reps}
                    {target.target_weight_kg ? ` × ${target.target_weight_kg}kg` : ''}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Compteur XP animé (JS thread) ───────────────────────────────────────────

function useCountUp(target: number, duration = 1800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let frame: number;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function SessionSummaryScreen() {
  const router = useRouter();
  const { lastSummary, clearSummary } = useSessionStore();
  const { profile, pendingLevelUp }   = useGamificationStore();

  // Redirige vers l'accueil si pas de résumé disponible
  useEffect(() => {
    if (!lastSummary) {
      router.replace('/(tabs)');
    }
  }, []);

  // Efface le résumé quand l'utilisateur quitte l'écran
  useEffect(() => () => { clearSummary(); }, []);

  const summary = lastSummary;

  // ── Données calculées ─────────────────────────────────────────────────────
  const xpAfter = profile?.total_xp ?? (summary ? summary.xpBefore + summary.xpEarned : 0);

  const totalVolume = useMemo(() => {
    if (!summary) return 0;
    return summary.completedSets.reduce((acc, cs) => {
      if (cs.actual_reps && cs.actual_weight_kg) {
        return acc + cs.actual_reps * cs.actual_weight_kg;
      }
      return acc;
    }, 0);
  }, [summary?.completedSets.length]);

  const estimatedCalories = summary
    ? calculateCalories(summary.duration, 'medium')
    : 0;

  const displayXP = useCountUp(summary?.xpEarned ?? 0, 1800);

  // ── Confetti (généré une seule fois au mount) ─────────────────────────────
  const confetti = useMemo<ConfettiProps[]>(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        x:        Math.random() * SCREEN_W,
        color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay:    Math.random() * 700,
        size:     8 + Math.random() * 8,
        rotation: Math.random() * 360,
      })),
    []
  );

  // ── Animations d'entrée des cartes ────────────────────────────────────────
  const headerScale  = useSharedValue(0.75);
  const headerOpacity = useSharedValue(0);
  const cardsOpacity  = useSharedValue(0);
  const cardsTranslY  = useSharedValue(30);

  useEffect(() => {
    headerScale.value   = withSpring(1, { damping: 14, stiffness: 160 });
    headerOpacity.value = withTiming(1, { duration: 500 });
    cardsOpacity.value  = withDelay(350, withTiming(1, { duration: 400 }));
    cardsTranslY.value  = withDelay(350, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity:   headerOpacity.value,
    transform: [{ scale: headerScale.value }],
  }));
  const cardsStyle = useAnimatedStyle(() => ({
    opacity:   cardsOpacity.value,
    transform: [{ translateY: cardsTranslY.value }],
  }));

  // ── Partage ───────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!summary) return;
    await Share.share({
      message:
        `💪 Séance terminée sur GainXP !\n` +
        `Programme : ${summary.workoutName}\n` +
        `Durée : ${formatDuration(summary.duration)}\n` +
        `+${summary.xpEarned} XP gagnés • ${summary.completedSets.length} séries`,
    });
  };

  if (!summary) return null;

  const levelBefore = getLevelFromXP(summary.xpBefore);
  const levelAfter  = getLevelFromXP(xpAfter);
  const levelChanged = levelAfter.level > levelBefore.level;

  // Breakdown XP
  const xpBreakdown = [
    { label: 'Séance complétée',                amount: 100 },
    { label: `${summary.completedSets.length} séries × 5 XP`, amount: summary.completedSets.length * 5 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Confetti overlay (une seule passe) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confetti.map((p, i) => <ConfettiPiece key={i} {...p} />)}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── En-tête célébration ───────────────────────────────────────── */}
        <LinearGradient
          colors={[`${COLORS.primary}30`, COLORS.background]}
          style={{ paddingTop: Platform.OS === 'ios' ? 64 : 48, paddingBottom: 32, paddingHorizontal: 24 }}
        >
          <Animated.View style={[{ alignItems: 'center' }, headerStyle]}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>🎉</Text>
            <Text style={styles.titleText}>Séance terminée !</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 15, marginTop: 4 }}>
              {summary.workoutName}
            </Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View style={cardsStyle}>
          {/* ── XP gagné ─────────────────────────────────────────────────── */}
          <View style={[styles.card, { marginTop: 4 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <Text style={styles.cardLabel}>XP gagnés</Text>
              {/* Compteur animé */}
              <Text style={styles.xpCounter}>+{displayXP} XP</Text>
            </View>

            {/* Détail par source */}
            {xpBreakdown.map((item) => (
              <View key={item.label} style={styles.xpRow}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{item.label}</Text>
                <Text style={{ color: COLORS.xp, fontWeight: '700', fontSize: 13 }}>
                  +{item.amount}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Stats récap ──────────────────────────────────────────────── */}
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{formatDuration(summary.duration)}</Text>
              <Text style={styles.statLabel}>Durée</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>{estimatedCalories}</Text>
              <Text style={styles.statLabel}>kcal est.</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>{summary.completedSets.length}</Text>
              <Text style={styles.statLabel}>Séries</Text>
            </View>
            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statValue}>
                {totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—'}
              </Text>
              <Text style={styles.statLabel}>Volume</Text>
            </View>
          </View>

          {/* ── XP Bar avant / après ─────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={[styles.cardLabel, { marginBottom: 16 }]}>Progression</Text>

            {levelChanged ? (
              // Affichage "avant → après" pour un level up
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <LevelBadge level={levelBefore.level} variant="medium" showLabel />
                <Text style={{ color: COLORS.primary, fontSize: 22, marginHorizontal: 20 }}>→</Text>
                <LevelBadge level={levelAfter.level} variant="large" animated showLabel />
              </View>
            ) : null}

            <XPBarAnimated xpBefore={summary.xpBefore} xpAfter={xpAfter} delay={500} />
          </View>

          {/* ── Exercices détaillés (collapsable) ────────────────────────── */}
          <View style={[styles.card, { paddingBottom: 8 }]}>
            <Text style={[styles.cardLabel, { marginBottom: 12 }]}>
              Exercices
              <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: 13 }}>
                {' '}({summary.exercises.length})
              </Text>
            </Text>
            {summary.exercises.map((ex) => (
              <ExerciseDetail
                key={ex.id}
                exercise={ex}
                completedSets={summary.completedSets}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Boutons sticky ───────────────────────────────────────────────── */}
      <View style={styles.stickyButtons}>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 }}>
            Partager 🔗
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={styles.homeBtn}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            Retour à l'accueil
          </Text>
        </TouchableOpacity>
      </View>

      {/* LevelUpModal apparaît automatiquement via pendingLevelUp du store */}
      <LevelUpModal />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  titleText: {
    color:      COLORS.textPrimary,
    fontSize:   30,
    fontWeight: '800',
    textAlign:  'center',
  },

  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius:    20,
    padding:         20,
    marginHorizontal: 20,
    marginBottom:    12,
  },
  cardLabel: {
    color:      COLORS.textSecondary,
    fontSize:   12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  xpCounter: {
    color:      COLORS.xp,
    fontSize:   30,
    fontWeight: '800',
  },
  xpRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth:  1,
    borderTopColor: COLORS.backgroundElevated,
    marginTop:       4,
  },

  statsGrid: {
    flexDirection:   'row',
    backgroundColor: COLORS.backgroundCard,
    borderRadius:    20,
    marginHorizontal: 20,
    marginBottom:    12,
    overflow:        'hidden',
  },
  statCell: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 18,
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.backgroundElevated,
  },
  statValue: {
    color:      COLORS.textPrimary,
    fontSize:   20,
    fontWeight: '800',
  },
  statLabel: {
    color:     COLORS.textSecondary,
    fontSize:  11,
    marginTop: 3,
  },

  barTrack: {
    height:          10,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius:    5,
    overflow:        'hidden',
    position:        'relative',
  },
  barFill: {
    height:       '100%',
    borderRadius: 5,
  },
  barMarker: {
    position:        'absolute',
    top:             0,
    width:           2,
    height:          '100%',
    backgroundColor: COLORS.textSecondary,
  },

  exerciseCard: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius:    12,
    padding:         12,
    marginBottom:    8,
  },
  exDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  setDetailRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 4,
    paddingLeft:     18,
    gap:             8,
  },

  stickyButtons: {
    position:       'absolute',
    bottom:         0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom:  Platform.OS === 'ios' ? 40 : 24,
    paddingTop:     12,
    backgroundColor: `${COLORS.background}F2`,
    flexDirection:  'row',
    gap:             10,
  },
  shareBtn: {
    flex:            1,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      'center',
  },
  homeBtn: {
    flex:            2,
    backgroundColor: COLORS.primary,
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      'center',
    shadowColor:     COLORS.primary,
    shadowOffset:    { width: 0, height: 5 },
    shadowOpacity:   0.3,
    shadowRadius:    10,
    elevation:       6,
  },
});
