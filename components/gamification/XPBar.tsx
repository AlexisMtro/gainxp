import { View, Text } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { getLevelFromXP, getLevelProgress, getLevelName } from '@/lib/utils';
import { XP_PER_LEVEL } from '@/lib/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Couleur de la barre selon le niveau — du gris novice à l'or légende */
function getLevelColor(level: number): string {
  if (level >= 50) return '#FFD700'; // Légende
  if (level >= 30) return '#F97316'; // Élite
  if (level >= 20) return '#A855F7'; // Champion
  if (level >= 10) return '#60A5FA'; // Guerrier
  if (level >= 5)  return '#34D399'; // Apprenti
  return '#6C63FF';                  // Novice
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface XPBarProps {
  totalXP: number;
  /** Affiche le nom du niveau et les valeurs XP */
  showLabels?: boolean;
  /** Hauteur de la barre en px */
  height?: number;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function XPBar({ totalXP, showLabels = true, height = 10 }: XPBarProps) {
  const level    = getLevelFromXP(totalXP);
  const progress = getLevelProgress(totalXP);  // 0 → 1
  const color    = getLevelColor(level);

  // XP dans le niveau actuel et XP requis pour le suivant
  let xpIntoLevel = totalXP;
  for (let l = 1; l < level; l++) xpIntoLevel -= XP_PER_LEVEL(l);
  const xpNeeded = XP_PER_LEVEL(level);

  // Valeur animée (0 → 1)
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  return (
    <View className="w-full">
      {showLabels && (
        <View className="flex-row justify-between items-baseline mb-1">
          {/* Niveau + nom */}
          <Text className="text-white text-sm font-bold">
            Niv.{' '}
            <Text style={{ color }}>{level}</Text>
            {'  '}
            <Text className="text-gray-400 font-normal text-xs">
              {getLevelName(level)}
            </Text>
          </Text>
          {/* XP restants */}
          <Text className="text-gray-400 text-xs">
            {xpIntoLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
          </Text>
        </View>
      )}

      {/* Piste */}
      <View
        className="w-full rounded-full bg-background-elevated overflow-hidden"
        style={{ height }}
      >
        {/* Remplissage animé */}
        <Animated.View
          className="h-full rounded-full"
          style={[animatedStyle, { backgroundColor: color }]}
        />
      </View>
    </View>
  );
}
