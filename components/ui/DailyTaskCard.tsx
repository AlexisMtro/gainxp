import { View, Text, Pressable } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { UserDailyTask, DailyTaskType } from '@/types/index';
import { COLORS } from '@/lib/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Icône et couleur selon le type de tâche */
function getTaskMeta(type: DailyTaskType): { icon: string; color: string } {
  switch (type) {
    case 'steps':    return { icon: '🚶', color: '#34D399' };
    case 'session':  return { icon: '💪', color: '#6C63FF' };
    case 'calories': return { icon: '🔥', color: '#F97316' };
    case 'streak':   return { icon: '⚡', color: '#FFD700' };
    default:         return { icon: '✅', color: '#9CA3AF' };
  }
}

/** Formate la valeur de progression selon le type */
function formatProgress(value: number, type: DailyTaskType): string {
  if (type === 'steps')    return value.toLocaleString();
  if (type === 'calories') return `${value} kcal`;
  return String(value);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DailyTaskCardProps {
  task: UserDailyTask;
  onPress?: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function DailyTaskCard({ task, onPress }: DailyTaskCardProps) {
  const { task: dailyTask, current_value, is_completed } = task;
  const { icon, color } = getTaskMeta(dailyTask.task_type);

  const progress = Math.min(current_value / dailyTask.target_value, 1);

  // Barre de progression animée
  const animatedWidth = useSharedValue(0);

  // Animations de complétion
  const checkScale  = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  useEffect(() => {
    animatedWidth.value = withTiming(progress, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  useEffect(() => {
    if (is_completed) {
      // Apparition du checkmark avec rebond
      checkScale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1.0, { damping: 12, stiffness: 180 })
      );
      // Légère réduction d'opacité pour indiquer l'état complété
      cardOpacity.value = withTiming(0.75, { duration: 400 });
    } else {
      checkScale.value = withTiming(0, { duration: 150 });
      cardOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [is_completed]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: interpolate(checkScale.value, [0, 0.3, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  return (
    <Pressable onPress={onPress} disabled={is_completed}>
      <Animated.View
        style={[cardStyle, { backgroundColor: COLORS.backgroundCard, borderRadius: 16, padding: 16, marginBottom: 10 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          {/* Icône de la tâche */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: `${color}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>

          {/* Titre + progression */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 15 }}>
              {dailyTask.title}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
              {formatProgress(current_value, dailyTask.task_type)}
              {' / '}
              {formatProgress(dailyTask.target_value, dailyTask.task_type)}
            </Text>
          </View>

          {/* Badge XP */}
          <View
            style={{
              backgroundColor: `${COLORS.xp}20`,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              marginRight: 8,
            }}
          >
            <Text style={{ color: COLORS.xp, fontSize: 12, fontWeight: '700' }}>
              +{dailyTask.xp_reward} XP
            </Text>
          </View>

          {/* Checkmark animé */}
          <Animated.View style={checkmarkStyle}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: COLORS.success,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>
            </View>
          </Animated.View>
        </View>

        {/* Barre de progression */}
        <View
          style={{
            height: 6,
            backgroundColor: COLORS.backgroundElevated,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              progressBarStyle,
              { height: '100%', backgroundColor: is_completed ? COLORS.success : color, borderRadius: 3 },
            ]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}
