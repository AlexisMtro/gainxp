import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { getLevelName } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLevelColor(level: number): string {
  if (level >= 50) return '#FFD700';
  if (level >= 30) return '#F97316';
  if (level >= 20) return '#A855F7';
  if (level >= 10) return '#60A5FA';
  if (level >= 5)  return '#34D399';
  return '#6C63FF';
}

function getLevelIcon(level: number): string {
  if (level >= 50) return '⭐';
  if (level >= 30) return '🔥';
  if (level >= 20) return '👑';
  if (level >= 10) return '⚔️';
  if (level >= 5)  return '🛡️';
  return '🌱';
}

// ─── Props ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'small' | 'medium' | 'large';

interface LevelBadgeProps {
  level: number;
  variant?: BadgeVariant;
  /** Pulse animé — utile pour mettre en avant un nouveau niveau */
  animated?: boolean;
  showLabel?: boolean;
}

const SIZES: Record<BadgeVariant, { container: number; icon: number; number: number; fontSize: number }> = {
  small:  { container: 36, icon: 14, number: 10, fontSize: 10 },
  medium: { container: 56, icon: 22, number: 14, fontSize: 14 },
  large:  { container: 80, icon: 32, number: 18, fontSize: 18 },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function LevelBadge({
  level,
  variant = 'medium',
  animated = false,
  showLabel = false,
}: LevelBadgeProps) {
  const color = getLevelColor(level);
  const icon  = getLevelIcon(level);
  const size  = SIZES[variant];

  // Animation de pulse pour signaler un nouveau niveau
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animated) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 600 }),
        withTiming(1,    { duration: 600 }),
      ),
      -1, // infini
      true,
    );
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = {
    width:  size.container,
    height: size.container,
    borderRadius: size.container / 2,
    backgroundColor: `${color}20`, // couleur à 12% d'opacité
    borderWidth: 2,
    borderColor: color,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View className="items-center">
      <Animated.View style={[containerStyle, animatedStyle]}>
        <Text style={{ fontSize: size.icon, lineHeight: size.icon + 4 }}>{icon}</Text>
        {/* Numéro de niveau en surimpression */}
        <View
          style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            backgroundColor: color,
            borderRadius: 10,
            minWidth: 18,
            paddingHorizontal: 3,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: size.number,
              fontWeight: 'bold',
              lineHeight: size.number + 6,
            }}
          >
            {level}
          </Text>
        </View>
      </Animated.View>

      {showLabel && (
        <Text
          className="text-gray-400 mt-2 text-xs text-center"
          numberOfLines={1}
        >
          {getLevelName(level)}
        </Text>
      )}
    </View>
  );
}
