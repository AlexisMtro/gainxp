import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import type { Badge } from '@/types/index';

// ─── Rareté ────────────────────────────────────────────────────────────────────

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

function getRarity(xpReward: number): Rarity {
  if (xpReward >= 500) return 'legendary';
  if (xpReward >= 200) return 'epic';
  if (xpReward >= 100) return 'rare';
  return 'common';
}

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; glow: string }> = {
  common:    { label: 'Commun',    color: '#9CA3AF', glow: '#9CA3AF22' },
  rare:      { label: 'Rare',      color: '#60A5FA', glow: '#60A5FA22' },
  epic:      { label: 'Épique',    color: '#A855F7', glow: '#A855F722' },
  legendary: { label: 'Légendaire', color: '#FFD700', glow: '#FFD70022' },
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface BadgeCardProps {
  badge: Badge;
  /** Badge déjà obtenu par l'utilisateur */
  earned?: boolean;
  earnedAt?: string;
}

// ─── Composant ─────────────────────────────────────────────────────────────────

export function BadgeCard({ badge, earned = false, earnedAt }: BadgeCardProps) {
  const rarity = getRarity(badge.xp_reward);
  const cfg    = RARITY_CONFIG[rarity];

  // Apparition douce
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      {/* Fond coloré selon la rareté */}
      <View style={[styles.inner, { borderColor: earned ? cfg.color : '#252540', backgroundColor: earned ? cfg.glow : '#1A1A2E' }]}>

        {/* Icône + état verrouillé */}
        <View style={[styles.iconWrap, { borderColor: earned ? cfg.color : '#374151' }]}>
          <Text style={[styles.icon, { opacity: earned ? 1 : 0.3 }]}>
            {badge.icon || '🏅'}
          </Text>
          {!earned && (
            <View style={styles.lock}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
        </View>

        {/* Informations */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: earned ? '#ffffff' : '#6B7280' }]} numberOfLines={1}>
              {badge.name}
            </Text>
            {/* Pastille rareté */}
            <View style={[styles.rarityBadge, { backgroundColor: `${cfg.color}20` }]}>
              <Text style={[styles.rarityText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {badge.description}
          </Text>

          <View style={styles.footer}>
            {/* XP reward */}
            <Text style={styles.xp}>+{badge.xp_reward} XP</Text>

            {/* Date d'obtention ou condition */}
            {earned && earnedAt ? (
              <Text style={styles.date}>
                Obtenu le {new Date(earnedAt).toLocaleDateString('fr-FR')}
              </Text>
            ) : (
              <Text style={styles.condition} numberOfLines={1}>
                Condition : {badge.condition_value} {badge.condition_type.replace(/_/g, ' ')}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card:        { marginBottom: 12 },
  inner:       { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 14 },
  iconWrap:    { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0F1A', position: 'relative' },
  icon:        { fontSize: 28 },
  lock:        { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#1A1A2E', borderRadius: 10, padding: 2 },
  lockIcon:    { fontSize: 12 },
  info:        { flex: 1, gap: 4 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:        { fontSize: 15, fontWeight: 'bold', flex: 1 },
  rarityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  rarityText:  { fontSize: 10, fontWeight: '600' },
  description: { color: '#6B7280', fontSize: 12, lineHeight: 16 },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  xp:          { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  date:        { color: '#4B5563', fontSize: 11 },
  condition:   { color: '#4B5563', fontSize: 11, flex: 1, textAlign: 'right' },
});
