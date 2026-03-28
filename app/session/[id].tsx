import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/lib/constants';
import type { WorkoutSet, CompletedSet } from '@/types/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function targetLabel(set: WorkoutSet): string {
  if (set.target_duration_sec) return `${set.target_duration_sec}s`;
  if (set.target_reps && set.target_weight_kg) return `${set.target_reps} reps · ${set.target_weight_kg} kg`;
  if (set.target_reps) return `${set.target_reps} reps`;
  return '—';
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules',
  arms: 'Bras', legs: 'Jambes', core: 'Abdos',
  cardio: 'Cardio', full_body: 'Full Body',
};

// ─── Sous-composant : dot de timer circulaire ─────────────────────────────────

interface TimerDotProps {
  index: number;
  totalDots: number;
  x: number;
  y: number;
  progressSV: ReturnType<typeof useSharedValue<number>>;
}

const TimerDot = React.memo(function TimerDot({ index, totalDots, x, y, progressSV }: TimerDotProps) {
  const style = useAnimatedStyle(() => {
    const isActive = index < progressSV.value * totalDots;
    const pct = progressSV.value;
    const activeColor = pct <= 0.1 ? '#EF4444' : pct <= 0.3 ? '#F59E0B' : '#10B981';
    return {
      backgroundColor: isActive ? activeColor : '#1E1E35',
      opacity: isActive ? 1 : 0.5,
    };
  });
  return (
    <Animated.View
      style={[{
        position: 'absolute',
        width: 5,
        height: 5,
        borderRadius: 2.5,
        left: x - 2.5,
        top: y - 2.5,
      }, style]}
    />
  );
});

// ─── Sous-composant : timer circulaire ────────────────────────────────────────

const DOTS = 48;
const TIMER_SIZE = 192;
const TIMER_RADIUS = TIMER_SIZE / 2 - 12;
const TIMER_CENTER = TIMER_SIZE / 2;

// Positions pré-calculées (invariantes)
const DOT_POSITIONS = Array.from({ length: DOTS }, (_, i) => {
  const angle = (i / DOTS) * 2 * Math.PI - Math.PI / 2;
  return {
    x: TIMER_CENTER + Math.cos(angle) * TIMER_RADIUS,
    y: TIMER_CENTER + Math.sin(angle) * TIMER_RADIUS,
  };
});

interface CircularTimerProps {
  remaining: number;
  total: number;
}

function CircularTimer({ remaining, total }: CircularTimerProps) {
  const progressSV = useSharedValue(total > 0 ? remaining / total : 0);
  const pulseSV    = useSharedValue(1);

  useEffect(() => {
    progressSV.value = withTiming(total > 0 ? remaining / total : 0, { duration: 600 });
  }, [remaining, total]);

  useEffect(() => {
    if (remaining > 0 && remaining <= 5) {
      pulseSV.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 300 }), withTiming(1, { duration: 300 })),
        -1, true
      );
    } else {
      cancelAnimation(pulseSV);
      pulseSV.value = withTiming(1, { duration: 150 });
    }
  }, [remaining <= 5]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseSV.value }],
  }));

  const timerColor =
    remaining <= 5 ? COLORS.error : remaining <= 15 ? COLORS.warning : COLORS.success;

  return (
    <Animated.View style={[{ width: TIMER_SIZE, height: TIMER_SIZE }, pulseStyle]}>
      {/* Anneau de dots */}
      {DOT_POSITIONS.map((pos, i) => (
        <TimerDot
          key={i}
          index={i}
          totalDots={DOTS}
          x={pos.x}
          y={pos.y}
          progressSV={progressSV}
        />
      ))}

      {/* Centre : compte à rebours */}
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: timerColor, fontSize: 52, fontWeight: '800', lineHeight: 56 }}>
          {remaining}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
          secondes
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Sous-composant : ligne d'une série ───────────────────────────────────────

interface SetRowProps {
  setIndex: number;
  target: WorkoutSet;
  isActive: boolean;
  isDone: boolean;
  completedData?: CompletedSet;
  repsValue: string;
  weightValue: string;
  onRepsChange: (v: string) => void;
  onWeightChange: (v: string) => void;
}

function SetRow({
  setIndex, target, isActive, isDone, completedData,
  repsValue, weightValue, onRepsChange, onWeightChange,
}: SetRowProps) {
  const bgColor = isDone
    ? `${COLORS.success}18`
    : isActive
      ? `${COLORS.primary}22`
      : COLORS.backgroundElevated;

  const borderColor = isDone
    ? `${COLORS.success}60`
    : isActive
      ? `${COLORS.primary}80`
      : 'transparent';

  return (
    <View style={[styles.setRow, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}>
      {/* Numéro */}
      <View style={[styles.setNumber, {
        backgroundColor: isDone ? COLORS.success : isActive ? COLORS.primary : COLORS.backgroundCard,
      }]}>
        {isDone ? (
          <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
        ) : (
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
            {setIndex + 1}
          </Text>
        )}
      </View>

      {/* Contenu */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        {isDone && completedData ? (
          // Série complétée : affichage des valeurs réelles
          <Text style={{ color: COLORS.success, fontWeight: '600', fontSize: 14 }}>
            {completedData.actual_reps ?? '—'} reps
            {completedData.actual_weight_kg != null
              ? ` · ${completedData.actual_weight_kg} kg`
              : ''}
          </Text>
        ) : isActive ? (
          // Série active : champs de saisie
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={repsValue}
                onChangeText={onRepsChange}
                keyboardType="numeric"
                placeholder={target.target_reps?.toString() ?? '—'}
                placeholderTextColor={COLORS.textMuted}
                maxLength={3}
              />
              <Text style={styles.inputLabel}>reps</Text>
            </View>
            {target.target_weight_kg !== null && (
              <>
                <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>×</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    value={weightValue}
                    onChangeText={onWeightChange}
                    keyboardType="decimal-pad"
                    placeholder={target.target_weight_kg?.toString() ?? '0'}
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={5}
                  />
                  <Text style={styles.inputLabel}>kg</Text>
                </View>
              </>
            )}
          </View>
        ) : (
          // Série à venir : objectif cible
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
            {targetLabel(target)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function SessionScreen() {
  // Empêche la mise en veille pendant la séance
  useKeepAwake();

  const { id: workoutId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  const {
    workout, currentSession, currentExerciseIndex, currentSetIndex,
    completedSets, restTimer, isResting, sessionTimer, isPaused, isLoading, error,
    startSession, completeSet, skipRest, adjustRestTimer,
    nextExercise, prevExercise, pauseSession, completeSession, abandonSession,
  } = useSessionStore();

  // ── Inputs locaux pour la série en cours ─────────────────────────────────
  const [repsInput,   setRepsInput]   = useState('');
  const [weightInput, setWeightInput] = useState('');

  // ── Animations d'exercice (entrée/sortie) ─────────────────────────────────
  const exOpacity    = useSharedValue(1);
  const exTranslateX = useSharedValue(0);
  const restOpacity  = useSharedValue(0);

  const prevExerciseRef = useRef(currentExerciseIndex);

  // Anime la transition entre exercices
  useEffect(() => {
    const dir = currentExerciseIndex > prevExerciseRef.current ? 1 : -1;
    prevExerciseRef.current = currentExerciseIndex;

    if (currentSession) { // skip initial render
      const enterX = dir * 40;
      exOpacity.value = withTiming(0, { duration: 140 }, () => {
        'worklet';
        exTranslateX.value = enterX;
        exOpacity.value    = withTiming(1, { duration: 220 });
        exTranslateX.value = withTiming(0, { duration: 220 });
      });
    }
    setRepsInput('');
    setWeightInput('');
  }, [currentExerciseIndex]);

  // Anime l'apparition/disparition du timer de repos
  useEffect(() => {
    restOpacity.value = withTiming(isResting ? 1 : 0, { duration: 250 });
  }, [isResting]);

  // Lance la séance au montage
  useEffect(() => {
    if (workoutId && user) {
      startSession(workoutId, user.id);
    }
    return () => {
      // Ne reset pas automatiquement : l'utilisateur peut reprendre
    };
  }, [workoutId, user?.id]);

  // ── Styles animés ─────────────────────────────────────────────────────────
  const exStyle   = useAnimatedStyle(() => ({
    opacity:   exOpacity.value,
    transform: [{ translateX: exTranslateX.value }],
  }));
  const restStyle = useAnimatedStyle(() => ({
    opacity:        restOpacity.value,
    pointerEvents:  restOpacity.value > 0.5 ? 'auto' : 'none',
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCompleteSet = useCallback(() => {
    const reps   = parseInt(repsInput, 10) || 0;
    const weight = weightInput ? parseFloat(weightInput) : null;
    completeSet(reps, weight);
    setRepsInput('');
    setWeightInput('');
  }, [repsInput, weightInput, completeSet]);

  const handleNextExercise = useCallback(() => {
    exOpacity.value = withTiming(0, { duration: 120 }, () => {
      'worklet';
      exTranslateX.value = 40;
      runOnJS(nextExercise)();
      exOpacity.value    = withTiming(1, { duration: 200 });
      exTranslateX.value = withTiming(0, { duration: 200 });
    });
  }, [nextExercise]);

  const handlePrevExercise = useCallback(() => {
    exOpacity.value = withTiming(0, { duration: 120 }, () => {
      'worklet';
      exTranslateX.value = -40;
      runOnJS(prevExercise)();
      exOpacity.value    = withTiming(1, { duration: 200 });
      exTranslateX.value = withTiming(0, { duration: 200 });
    });
  }, [prevExercise]);

  const handleCompleteSession = useCallback(async () => {
    try {
      await completeSession();
      router.replace('/session/summary');
    } catch {
      Alert.alert('Erreur', 'Impossible de terminer la séance.');
    }
  }, [completeSession, router]);

  const handleAbandon = useCallback(() => {
    Alert.alert(
      'Abandonner ?',
      'Ta progression actuelle sera sauvegardée, mais la séance ne comptera pas.',
      [
        { text: 'Continuer', style: 'cancel' },
        {
          text: 'Abandonner',
          style: 'destructive',
          onPress: async () => {
            await abandonSession();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  }, [abandonSession, router]);

  // ── États de chargement / erreur ──────────────────────────────────────────
  if (isLoading || !workout || !currentSession) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>
          {isLoading ? 'Démarrage de la séance...' : (error ?? 'Programme introuvable')}
        </Text>
        {error && (
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: COLORS.primary }}>← Retour</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Données de l'exercice courant ──────────────────────────────────────────
  const exercise    = workout.exercises[currentExerciseIndex];
  const totalExs    = workout.exercises.length;
  const progressPct = (currentExerciseIndex / Math.max(totalExs - 1, 1)) * 100;

  const currentExSets = exercise.sets;
  const totalSets     = currentExSets.length;

  // Détermine si tous les sets de l'exercice sont complétés
  const setsCompletedForEx = completedSets.filter(
    (cs) => cs.exercise_id === exercise.exercise.id
  ).length;
  const exerciseDone = setsCompletedForEx >= totalSets;

  // Dernier exercice et exercice terminé = peut compléter la séance
  const isLastExercise = currentExerciseIndex === totalExs - 1;
  const canFinish      = isLastExercise && exerciseDone;

  const primaryMuscle = exercise.exercise.muscle_groups[0];
  const muscleLabel   = primaryMuscle ? (MUSCLE_LABELS[primaryMuscle] ?? primaryMuscle) : '';

  const currentSetTarget = currentExSets[currentSetIndex] ?? currentExSets[totalSets - 1];

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Header : chrono + pause ──────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleAbandon} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>✕</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
              {workout.name}
            </Text>
            <Text style={{ color: COLORS.xp, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              {formatTime(sessionTimer)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={pauseSession}
            style={[styles.pauseBtn, { backgroundColor: isPaused ? COLORS.primary : COLORS.backgroundElevated }]}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              {isPaused ? '▶' : '⏸'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Progression ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
              Exercice
              <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>
                {' '}{currentExerciseIndex + 1}
              </Text>
              <Text> / {totalExs}</Text>
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
              Série
              <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>
                {' '}{Math.min(currentSetIndex + 1, totalSets)}
              </Text>
              <Text> / {totalSets}</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* ── Zone exercice animée ──────────────────────────────────────── */}
        <Animated.View style={[{ paddingHorizontal: 24 }, exStyle]}>
          {/* Muscle ciblé */}
          {muscleLabel ? (
            <View style={styles.muscleChip}>
              <Text style={{ color: COLORS.primaryLight, fontSize: 12, fontWeight: '600' }}>
                {muscleLabel}
              </Text>
            </View>
          ) : null}

          {/* Nom de l'exercice — grande typo */}
          <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>

          {/* Description courte si disponible */}
          {exercise.notes ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4, marginBottom: 8 }}>
              {exercise.notes}
            </Text>
          ) : null}
        </Animated.View>

        {/* ── Liste des séries ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
          {currentExSets.map((set, idx) => {
            const isDone = idx < setsCompletedForEx;
            const isActive = !isDone && idx === currentSetIndex && !exerciseDone;
            const doneData = isDone
              ? completedSets.filter((cs) => cs.exercise_id === exercise.exercise.id)[idx]
              : undefined;

            return (
              <SetRow
                key={idx}
                setIndex={idx}
                target={set}
                isActive={isActive}
                isDone={isDone}
                completedData={doneData}
                repsValue={isActive ? repsInput : ''}
                weightValue={isActive ? weightInput : ''}
                onRepsChange={setRepsInput}
                onWeightChange={setWeightInput}
              />
            );
          })}
        </View>

        {/* ── Navigation prev / next exercice ──────────────────────────── */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={handlePrevExercise}
            disabled={currentExerciseIndex === 0}
            style={[styles.navBtn, currentExerciseIndex === 0 && { opacity: 0.3 }]}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 22 }}>‹</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Préc.</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            {exerciseDone && !isLastExercise && (
              <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: '600' }}>
                Exercice terminé ✓
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleNextExercise}
            disabled={isLastExercise}
            style={[styles.navBtn, { alignItems: 'flex-end' }, isLastExercise && { opacity: 0.3 }]}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 22 }}>›</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Suiv.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Timer de repos (overlay absolu) ──────────────────────────────── */}
      <Animated.View style={[styles.restOverlay, restStyle]}>
        <View style={styles.restCard}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginBottom: 20 }}>
            Temps de repos
          </Text>

          <CircularTimer remaining={restTimer} total={exercise?.rest_sec ?? 60} />

          {/* Contrôles +15 / -15 / Passer */}
          <View style={styles.restControls}>
            <TouchableOpacity
              onPress={() => adjustRestTimer(-15)}
              style={styles.restAdjust}
            >
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>−15s</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={skipRest} style={styles.restSkip}>
              <Text style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' }}>
                Passer le repos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => adjustRestTimer(15)}
              style={styles.restAdjust}
            >
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>+15s</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ── Bouton sticky bas ────────────────────────────────────────────── */}
      <View style={styles.stickyBottom}>
        {canFinish ? (
          <TouchableOpacity onPress={handleCompleteSession} style={styles.finishBtn}>
            <Text style={styles.finishBtnText}>Terminer la séance 🎉</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleCompleteSet}
            disabled={isResting || exerciseDone}
            style={[
              styles.setDoneBtn,
              (isResting || exerciseDone) && { opacity: 0.45 },
            ]}
          >
            <Text style={styles.setDoneBtnText}>
              {exerciseDone ? 'Exercice terminé ✓' : 'Série terminée ✓'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 20,
  },
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  muscleChip: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}22`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  exerciseName: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  input: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
    padding: 0,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  navBtn: {
    alignItems: 'center',
    width: 60,
    paddingVertical: 8,
  },
  // Overlay repos
  restOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: `${COLORS.background}F2`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restCard: {
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 36,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  restControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    gap: 12,
  },
  restAdjust: {
    backgroundColor: COLORS.backgroundElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  restSkip: {
    flex: 1,
    backgroundColor: COLORS.backgroundElevated,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Bouton sticky bas
  stickyBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    backgroundColor: `${COLORS.background}EE`,
  },
  setDoneBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  setDoneBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  finishBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  finishBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
});
