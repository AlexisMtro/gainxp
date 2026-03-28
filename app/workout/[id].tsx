import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkoutStore } from '@/stores/workoutStore';
import { COLORS } from '@/lib/constants';
import type { WorkoutExercise, WorkoutSet, MuscleGroup } from '@/types/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MUSCLE_LABELS: Partial<Record<MuscleGroup, string>> = {
  chest:     'Pectoraux',
  back:      'Dos',
  shoulders: 'Épaules',
  arms:      'Bras',
  legs:      'Jambes',
  core:      'Abdos',
  cardio:    'Cardio',
  full_body: 'Full Body',
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#34D399',
  2: '#F59E0B',
  3: '#EF4444',
};

/** Résumé compact d'une série : "3 × 12 rep @ 40 kg" ou "3 × 30 s" */
function summarizeSets(sets: WorkoutSet[]): string {
  if (sets.length === 0) return '';

  const count = sets.length;
  const first = sets[0];

  if (first.target_duration_sec) {
    return `${count} × ${first.target_duration_sec}s`;
  }
  if (first.target_reps && first.target_weight_kg) {
    return `${count} × ${first.target_reps} rep @ ${first.target_weight_kg} kg`;
  }
  if (first.target_reps) {
    return `${count} × ${first.target_reps} rep`;
  }
  return `${count} série${count > 1 ? 's' : ''}`;
}

// ─── Sous-composant : carte exercice ─────────────────────────────────────────

function ExerciseRow({ item, index }: { item: WorkoutExercise; index: number }) {
  const muscleLabel = item.exercise.muscle_groups[0]
    ? (MUSCLE_LABELS[item.exercise.muscle_groups[0]] ?? item.exercise.muscle_groups[0])
    : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
      }}
    >
      {/* Numéro d'ordre */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: `${COLORS.primary}25`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Text style={{ color: COLORS.primaryLight, fontWeight: '700', fontSize: 13 }}>
          {index + 1}
        </Text>
      </View>

      {/* Nom + séries */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 15 }}>
          {item.exercise.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
          {muscleLabel && (
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{muscleLabel}</Text>
          )}
          {muscleLabel && (
            <Text style={{ color: COLORS.backgroundElevated, fontSize: 12 }}>·</Text>
          )}
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
            {summarizeSets(item.sets)}
          </Text>
        </View>
      </View>

      {/* Temps de repos */}
      {item.rest_sec > 0 && (
        <View
          style={{
            backgroundColor: COLORS.backgroundElevated,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
            {item.rest_sec}s
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { selectedWorkout, isLoading, error, loadWorkoutById } = useWorkoutStore();

  useEffect(() => {
    if (id) loadWorkoutById(id);
  }, [id]);

  // ── État de chargement ────────────────────────────────────────────────────
  if (isLoading && !selectedWorkout) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // ── État d'erreur ─────────────────────────────────────────────────────────
  if (error || !selectedWorkout) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>😕</Text>
        <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>
          {error ?? 'Programme introuvable.'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24 }}>
          <Text style={{ color: COLORS.primary, fontWeight: '600' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const workout = selectedWorkout;
  const diffColor = DIFFICULTY_COLORS[workout.difficulty] ?? COLORS.primary;
  const gradientEnd = COLORS.background as `#${string}`;
  const sortedExercises = [...workout.exercises].sort(
    (a, b) => a.order_index - b.order_index
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header avec dégradé ────────────────────────────────────────── */}
        <LinearGradient
          colors={[`${diffColor}30`, gradientEnd]}
          style={{ paddingBottom: 24 }}
        >
          {/* Bouton retour */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16 }}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>← Retour</Text>
          </TouchableOpacity>

          <View style={{ paddingHorizontal: 24 }}>
            {/* Difficulté */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: `${diffColor}25`,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: diffColor, fontSize: 12, fontWeight: '700' }}>
                  {'★'.repeat(workout.difficulty)}{'☆'.repeat(3 - workout.difficulty)}
                </Text>
              </View>
            </View>

            {/* Nom du programme */}
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: 26,
                fontWeight: '800',
                lineHeight: 32,
                marginBottom: 8,
              }}
            >
              {workout.name}
            </Text>

            {/* Description */}
            {workout.description ? (
              <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                {workout.description}
              </Text>
            ) : null}

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: `${COLORS.backgroundCard}CC`,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 18 }}>
                  {workout.duration_weeks}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                  semaines
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: `${COLORS.backgroundCard}CC`,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 18 }}>
                  {workout.sessions_per_week}×
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                  par semaine
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: `${COLORS.backgroundCard}CC`,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.xp, fontWeight: '700', fontSize: 18 }}>
                  +{workout.xp_reward}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                  XP
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Tags groupes musculaires ──────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {workout.target_muscle_groups.map((g) => (
              <View
                key={g}
                style={{
                  backgroundColor: COLORS.backgroundElevated,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                  {MUSCLE_LABELS[g] ?? g}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Liste des exercices ───────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 120 }}>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontWeight: '700',
              fontSize: 18,
              marginBottom: 14,
            }}
          >
            Exercices
            <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: 14 }}>
              {' '}({sortedExercises.length})
            </Text>
          </Text>

          {sortedExercises.map((item, index) => (
            <ExerciseRow key={item.id} item={item} index={index} />
          ))}
        </View>
      </ScrollView>

      {/* ── Bouton sticky "Démarrer la séance" ───────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingBottom: 36,
          paddingTop: 12,
          backgroundColor: `${COLORS.background}F0`,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/session/${workout.id}`)}
          activeOpacity={0.85}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
            Démarrer la séance 💪
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
