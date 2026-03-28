import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/lib/constants';
import type { Workout, MuscleGroup } from '@/types/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Débutant',       color: '#34D399' },
  2: { label: 'Intermédiaire',  color: '#F59E0B' },
  3: { label: 'Avancé',         color: '#EF4444' },
};

const MUSCLE_LABELS: Partial<Record<MuscleGroup, string>> = {
  chest:      'Pectoraux',
  back:       'Dos',
  shoulders:  'Épaules',
  arms:       'Bras',
  legs:       'Jambes',
  core:       'Abdos',
  cardio:     'Cardio',
  full_body:  'Full Body',
};

function DifficultyStars({ level }: { level: number }) {
  const { color } = DIFFICULTY_LABELS[level] ?? DIFFICULTY_LABELS[1];
  return (
    <Text style={{ color, fontSize: 12, letterSpacing: 2 }}>
      {'★'.repeat(level)}
      <Text style={{ color: COLORS.backgroundElevated }}>
        {'★'.repeat(3 - level)}
      </Text>
    </Text>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  workout: Workout;
  onStart?: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function WorkoutCard({ workout, onStart }: WorkoutCardProps) {
  const router = useRouter();
  const diff = DIFFICULTY_LABELS[workout.difficulty] ?? DIFFICULTY_LABELS[1];
  const visibleTags = workout.target_muscle_groups.slice(0, 3);
  const hasMore = workout.target_muscle_groups.length > 3;

  const handleStart = () => {
    onStart?.();
    router.push(`/workout/${workout.id}`);
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/workout/${workout.id}`)}
      activeOpacity={0.85}
      style={{
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* En-tête : nom + difficulté */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 16 }}
            numberOfLines={2}
          >
            {workout.name}
          </Text>
          <Text style={{ color: diff.color, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
            {diff.label}
          </Text>
        </View>

        {/* Étoiles de difficulté */}
        <DifficultyStars level={workout.difficulty} />
      </View>

      {/* Métadonnées : durée + séances */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>📅</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
            {workout.duration_weeks} sem.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>⚡</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
            {workout.sessions_per_week}×/sem
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: COLORS.xp, fontSize: 12 }}>✦</Text>
          <Text style={{ color: COLORS.xp, fontSize: 12, fontWeight: '600' }}>
            +{workout.xp_reward} XP
          </Text>
        </View>
      </View>

      {/* Tags groupes musculaires */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {visibleTags.map((group) => (
          <View
            key={group}
            style={{
              backgroundColor: `${COLORS.primary}20`,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' }}>
              {MUSCLE_LABELS[group] ?? group}
            </Text>
          </View>
        ))}
        {hasMore && (
          <View
            style={{
              backgroundColor: COLORS.backgroundElevated,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
              +{workout.target_muscle_groups.length - 3}
            </Text>
          </View>
        )}
      </View>

      {/* Bouton Commencer */}
      <TouchableOpacity
        onPress={handleStart}
        activeOpacity={0.8}
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 12,
          paddingVertical: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
          Commencer
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
