import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Modal, RefreshControl, Platform, StyleSheet, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase }      from '@/lib/supabase';
import { useAuthStore }  from '@/stores/authStore';
import { COLORS, LEVELS } from '@/lib/constants';
import { getLevelFromXP, getXPProgressPercent, formatDuration } from '@/lib/utils';
import type { MuscleGroup } from '@/types/index';

const db = supabase as unknown as SupabaseClient;

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey     = 'stats' | 'badges' | 'history';
type PeriodKey  = '7d' | '30d' | '3m' | '1y';
type RarityKey  = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

interface SessionData {
  id:           string;
  completed_at: string;
  duration_sec: number;
  xp_earned:    number;
  workout_name: string;
  muscle_groups: MuscleGroup[];
}

interface PersonalRecord {
  exercise_id:   string;
  exercise_name: string;
  max_weight_kg: number;
  best_reps:     number;
}

interface BadgeData {
  id:              string;
  name:            string;
  description:     string;
  icon:            string;
  xp_reward:       number;
  condition_type:  string;
  condition_value: number;
  rarity:          Exclude<RarityKey, 'all'>;
  earned:          boolean;
  earned_at:       string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_CONFIG: Record<PeriodKey, { label: string; days: number }> = {
  '7d':  { label: '7j',   days: 7   },
  '30d': { label: '30j',  days: 30  },
  '3m':  { label: '3 m',  days: 90  },
  '1y':  { label: '1 an', days: 365 },
};

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const DAY_LABELS   = ['Di','Lu','Ma','Me','Je','Ve','Sa'];

const MUSCLE_LABELS: Partial<Record<MuscleGroup, string>> = {
  chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules',
  arms: 'Bras', legs: 'Jambes', core: 'Abdos',
  cardio: 'Cardio', full_body: 'Full Body',
};

const RARITY_CONFIG: Record<Exclude<RarityKey, 'all'>, { label: string; color: string }> = {
  common:    { label: 'Commun',     color: '#9CA3AF' },
  rare:      { label: 'Rare',       color: '#60A5FA' },
  epic:      { label: 'Épique',     color: '#A855F7' },
  legendary: { label: 'Légendaire', color: '#FFD700' },
};

const HISTORY_PAGE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRarity(xpReward: number): Exclude<RarityKey, 'all'> {
  if (xpReward >= 500) return 'legendary';
  if (xpReward >= 200) return 'epic';
  if (xpReward >= 100) return 'rare';
  return 'common';
}

function periodStart(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Agrège les sessions en buckets pour le graphique */
function bucketize(
  sessions: SessionData[],
  period: PeriodKey,
  getValue: (s: SessionData) => number,
): { label: string; value: number }[] {
  const now = new Date();

  if (period === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const value = sessions
        .filter((s) => s.completed_at.startsWith(dateStr))
        .reduce((sum, s) => sum + getValue(s), 0);
      return { label: DAY_LABELS[d.getDay()], value };
    });
  }

  if (period === '30d') {
    return Array.from({ length: 4 }, (_, i) => {
      const end = new Date(now); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const value = sessions
        .filter((s) => { const d = new Date(s.completed_at); return d >= start && d <= end; })
        .reduce((sum, s) => sum + getValue(s), 0);
      return { label: `S${4 - i}`, value };
    }).reverse();
  }

  if (period === '3m') {
    return Array.from({ length: 3 }, (_, i) => {
      const m = new Date(now); m.setMonth(m.getMonth() - (2 - i));
      const value = sessions
        .filter((s) => { const d = new Date(s.completed_at); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); })
        .reduce((sum, s) => sum + getValue(s), 0);
      return { label: MONTH_LABELS[m.getMonth()], value };
    });
  }

  // 1y — 12 monthly buckets
  return Array.from({ length: 12 }, (_, i) => {
    const m = new Date(now); m.setMonth(m.getMonth() - (11 - i));
    const value = sessions
      .filter((s) => { const d = new Date(s.completed_at); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); })
      .reduce((sum, s) => sum + getValue(s), 0);
    return { label: MONTH_LABELS[m.getMonth()], value };
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h, r = 10, style }: { h: number; r?: number; style?: ViewStyle }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
  }, []);
  const style2 = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[{ height: h, borderRadius: r, backgroundColor: COLORS.backgroundElevated }, style2, style]} />
  );
}

// ─── Bar Chart (animated, custom) ────────────────────────────────────────────

const CHART_H = 110;

function AnimatedBar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(height, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [height]);
  const s = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ width: '100%', borderRadius: 4, backgroundColor: color }, s]} />;
}

function BarChartView({
  data, color, formatValue,
}: {
  data: { label: string; value: number }[];
  color: string;
  formatValue?: (v: number) => string;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 4 }}>
        {data.map((b, i) => {
          const ratio   = b.value > 0 ? Math.max(b.value / maxVal, 0.06) : 0.02;
          const barH    = ratio * CHART_H;
          return (
            <View key={i} style={{ flex: 1, height: CHART_H, justifyContent: 'flex-end', alignItems: 'center' }}>
              {b.value > 0 && (
                <Text style={{ color: COLORS.textMuted, fontSize: 8, marginBottom: 2 }}>
                  {formatValue ? formatValue(b.value) : b.value}
                </Text>
              )}
              <AnimatedBar height={barH} color={b.value > 0 ? color : COLORS.backgroundElevated} delay={i * 35} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {data.map((b, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: 9 }}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Muscle Breakdown ─────────────────────────────────────────────────────────

function MuscleBreakdown({ sessions }: { sessions: SessionData[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      for (const mg of s.muscle_groups) {
        map[mg] = (map[mg] ?? 0) + 1;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [sessions]);

  if (counts.length === 0) {
    return <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>Aucune donnée musculaire.</Text>;
  }

  const maxCount = counts[0][1];

  return (
    <View style={{ gap: 8 }}>
      {counts.map(([mg, count]) => {
        const pct = count / maxCount;
        return (
          <View key={mg} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                {MUSCLE_LABELS[mg as MuscleGroup] ?? mg}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{count} séance{count > 1 ? 's' : ''}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: COLORS.backgroundElevated, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: COLORS.primary, borderRadius: 3 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Period Comparison ────────────────────────────────────────────────────────

function ComparisonCard({ current, previous }: { current: SessionData[]; previous: SessionData[] }) {
  const cSessions = current.length;
  const pSessions = previous.length;
  const cXP       = current.reduce((s, x) => s + x.xp_earned, 0);
  const pXP       = previous.reduce((s, x) => s + x.xp_earned, 0);
  const cMins     = Math.round(current.reduce((s, x) => s + x.duration_sec, 0) / 60);
  const pMins     = Math.round(previous.reduce((s, x) => s + x.duration_sec, 0) / 60);

  function Stat({ label, curr, prev }: { label: string; curr: number; prev: number }) {
    const delta  = curr - prev;
    const sign   = delta > 0 ? '+' : '';
    const color  = delta > 0 ? COLORS.success : delta < 0 ? COLORS.error : COLORS.textMuted;
    return (
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 18 }}>{curr}</Text>
        <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
          {delta !== 0 ? `${sign}${delta}` : '—'}
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 2 }}>{label}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 10 }}>
        vs période précédente
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Stat label="Séances" curr={cSessions} prev={pSessions} />
        <View style={{ width: 1, backgroundColor: COLORS.backgroundElevated }} />
        <Stat label="XP"      curr={cXP}       prev={pXP}       />
        <View style={{ width: 1, backgroundColor: COLORS.backgroundElevated }} />
        <Stat label="Minutes" curr={cMins}      prev={pMins}     />
      </View>
    </View>
  );
}

// ─── Personal Record Row ──────────────────────────────────────────────────────

function PRRow({ record, index }: { record: PersonalRecord; index: number }) {
  return (
    <View style={styles.prRow}>
      <View style={[styles.prRank, { backgroundColor: index < 3 ? `${COLORS.xp}22` : COLORS.backgroundElevated }]}>
        <Text style={{ color: index < 3 ? COLORS.xp : COLORS.textMuted, fontSize: 13, fontWeight: '700' }}>
          {index + 1}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
          {record.exercise_name}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
          {record.best_reps} reps
        </Text>
      </View>
      <Text style={{ color: COLORS.xp, fontWeight: '800', fontSize: 16 }}>
        {record.max_weight_kg} kg
      </Text>
    </View>
  );
}

// ─── Badge Item ───────────────────────────────────────────────────────────────

function BadgeItem({ badge, onPress }: { badge: BadgeData; onPress: () => void }) {
  const { color } = RARITY_CONFIG[badge.rarity];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.badgeItem,
        { borderColor: badge.earned ? color : COLORS.backgroundElevated },
      ]}
    >
      <Text style={{ fontSize: 30, textAlign: 'center', opacity: badge.earned ? 1 : 0.3 }}>
        {badge.icon || '🏅'}
      </Text>
      {!badge.earned && (
        <View style={styles.lockOverlay}>
          <Text style={{ fontSize: 14 }}>🔒</Text>
        </View>
      )}
      <Text
        style={{ color: badge.earned ? COLORS.textPrimary : COLORS.textMuted, fontSize: 10, textAlign: 'center', marginTop: 4 }}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      <View style={[styles.rarityPill, { backgroundColor: `${color}22` }]}>
        <Text style={{ color, fontSize: 8, fontWeight: '700' }}>{RARITY_CONFIG[badge.rarity].label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Badge Modal ──────────────────────────────────────────────────────────────

function BadgeModal({ badge, onClose }: { badge: BadgeData | null; onClose: () => void }) {
  if (!badge) return null;
  const { color } = RARITY_CONFIG[badge.rarity];

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { borderColor: `${color}55` }]} onPress={() => {}}>
          <Text style={{ fontSize: 56, textAlign: 'center' }}>{badge.icon || '🏅'}</Text>

          <View style={[styles.rarityPill, { backgroundColor: `${color}25`, alignSelf: 'center', marginVertical: 8 }]}>
            <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{RARITY_CONFIG[badge.rarity].label}</Text>
          </View>

          <Text style={{ color: COLORS.textPrimary, fontWeight: '800', fontSize: 20, textAlign: 'center', marginBottom: 6 }}>
            {badge.name}
          </Text>

          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
            {badge.description}
          </Text>

          <View style={styles.modalMeta}>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              Condition : {badge.condition_type.replace(/_/g, ' ')} ≥ {badge.condition_value}
            </Text>
            <Text style={{ color: COLORS.xp, fontWeight: '700', fontSize: 13 }}>
              +{badge.xp_reward} XP
            </Text>
          </View>

          {badge.earned && badge.earned_at && (
            <Text style={{ color: COLORS.success, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
              ✓ Obtenu le {new Date(badge.earned_at).toLocaleDateString('fr-FR')}
            </Text>
          )}

          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Fermer</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Session History Item ─────────────────────────────────────────────────────

function SessionHistoryItem({ item }: { item: SessionData }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <Text style={{ fontSize: 18 }}>💪</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
          {item.workout_name}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
          {formatShortDate(item.completed_at)} · {formatDuration(item.duration_sec)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
          {item.muscle_groups.slice(0, 3).map((mg) => (
            <View key={mg} style={styles.muscleTag}>
              <Text style={{ color: COLORS.primaryLight, fontSize: 10 }}>
                {MUSCLE_LABELS[mg] ?? mg}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={{ color: COLORS.xp, fontWeight: '700', fontSize: 13 }}>
        +{item.xp_earned}
      </Text>
    </View>
  );
}

// ─── Tab: Stats ───────────────────────────────────────────────────────────────

function StatsTab({
  allSessions, prs, period, onPeriodChange, isLoading,
}: {
  allSessions: SessionData[];
  prs: PersonalRecord[];
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  isLoading: boolean;
}) {
  const profile = useAuthStore((s) => s.profile);
  const days    = PERIOD_CONFIG[period].days;

  const currentSessions = useMemo(
    () => allSessions.filter((s) => new Date(s.completed_at) >= periodStart(days)),
    [allSessions, days],
  );
  const previousSessions = useMemo(
    () => allSessions.filter((s) => {
      const d = new Date(s.completed_at);
      return d >= periodStart(days * 2) && d < periodStart(days);
    }),
    [allSessions, days],
  );

  const sessionBuckets = useMemo(
    () => bucketize(currentSessions, period, () => 1),
    [currentSessions, period],
  );
  const xpBuckets = useMemo(
    () => bucketize(currentSessions, period, (s) => s.xp_earned),
    [currentSessions, period],
  );

  const level    = getLevelFromXP(profile?.total_xp ?? 0);
  const xpPct    = getXPProgressPercent(profile?.total_xp ?? 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ── Carte profil athlète ─────────────────────────────────────── */}
      <View style={[styles.card, { margin: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[styles.avatarCircle, { borderColor: level.badge_color }]}>
            <Text style={{ fontSize: 28 }}>⚡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.textPrimary, fontWeight: '800', fontSize: 18 }}>
              {profile?.username ?? '—'}
            </Text>
            <Text style={{ color: level.badge_color, fontWeight: '600', fontSize: 13 }}>
              Niv. {level.level} — {level.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                🔥 {profile?.streak_days ?? 0} jours
              </Text>
              <Text style={{ color: COLORS.xp, fontSize: 12, fontWeight: '600' }}>
                {(profile?.total_xp ?? 0).toLocaleString()} XP
              </Text>
            </View>
          </View>
        </View>
        {/* XP progress bar */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Progression niveau</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{xpPct}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: COLORS.backgroundElevated, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${xpPct}%`, backgroundColor: level.badge_color, borderRadius: 3 }} />
          </View>
        </View>
      </View>

      {/* ── Sélecteur de période ─────────────────────────────────────── */}
      <View style={styles.periodRow}>
        {(Object.keys(PERIOD_CONFIG) as PeriodKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => onPeriodChange(key)}
            style={[styles.periodBtn, period === key && styles.periodBtnActive]}
          >
            <Text style={[styles.periodBtnText, period === key && { color: '#fff' }]}>
              {PERIOD_CONFIG[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Skeleton h={150} r={20} />
          <Skeleton h={150} r={20} />
        </View>
      ) : (
        <>
          {/* ── Graphique séances ───────────────────────────────────── */}
          <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
            <Text style={styles.cardLabel}>Séances</Text>
            <Text style={{ color: COLORS.textPrimary, fontWeight: '800', fontSize: 26, marginBottom: 12 }}>
              {currentSessions.length}
            </Text>
            <BarChartView data={sessionBuckets} color={COLORS.primary} />
          </View>

          {/* ── Graphique XP ────────────────────────────────────────── */}
          <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
            <Text style={styles.cardLabel}>XP gagnés</Text>
            <Text style={{ color: COLORS.xp, fontWeight: '800', fontSize: 26, marginBottom: 12 }}>
              {currentSessions.reduce((s, x) => s + x.xp_earned, 0).toLocaleString()}
            </Text>
            <BarChartView
              data={xpBuckets}
              color={COLORS.xp}
              formatValue={(v) => v > 999 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
          </View>

          {/* ── Répartition musculaire ──────────────────────────────── */}
          <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
            <Text style={[styles.cardLabel, { marginBottom: 14 }]}>Groupes musculaires</Text>
            <MuscleBreakdown sessions={currentSessions} />
          </View>

          {/* ── Comparaison période ─────────────────────────────────── */}
          <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
            <Text style={[styles.cardLabel, { marginBottom: 12 }]}>Comparaison</Text>
            <ComparisonCard current={currentSessions} previous={previousSessions} />
          </View>

          {/* ── Records personnels ──────────────────────────────────── */}
          <View style={[styles.card, { marginHorizontal: 16, marginBottom: 12 }]}>
            <Text style={[styles.cardLabel, { marginBottom: 14 }]}>
              Records personnels
              <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: 12 }}>
                {' '}({prs.length})
              </Text>
            </Text>
            {prs.length === 0 ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center' }}>
                Complète des séances pour voir tes PRs.
              </Text>
            ) : (
              prs.slice(0, 8).map((pr, i) => <PRRow key={pr.exercise_id} record={pr} index={i} />)
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Tab: Badges ──────────────────────────────────────────────────────────────

function BadgesTab({ badges, isLoading }: { badges: BadgeData[]; isLoading: boolean }) {
  const [rarityFilter, setRarityFilter] = useState<RarityKey>('all');
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);

  const filtered = useMemo(
    () => rarityFilter === 'all' ? badges : badges.filter((b) => b.rarity === rarityFilter),
    [badges, rarityFilter],
  );
  const earned  = filtered.filter((b) => b.earned).length;

  const RARITY_FILTERS: { key: RarityKey; label: string }[] = [
    { key: 'all',       label: 'Tous' },
    { key: 'common',    label: 'Commun' },
    { key: 'rare',      label: 'Rare' },
    { key: 'epic',      label: 'Épique' },
    { key: 'legendary', label: 'Légendaire' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Filtre rareté */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {RARITY_FILTERS.map(({ key, label }) => {
            const isActive = rarityFilter === key;
            const color = key !== 'all' ? RARITY_CONFIG[key as Exclude<RarityKey, 'all'>].color : COLORS.primary;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setRarityFilter(key)}
                style={[styles.rarityFilterBtn, isActive && { backgroundColor: `${color}25`, borderColor: color }]}
              >
                <Text style={[styles.rarityFilterText, isActive && { color }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Compteur */}
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 14 }}>
        {earned} / {filtered.length} obtenu{earned > 1 ? 's' : ''}
      </Text>

      {isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} h={110} r={16} style={{ width: '30%' }} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Aucun badge dans cette catégorie.</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {filtered.map((b) => (
            <BadgeItem key={b.id} badge={b} onPress={() => setSelectedBadge(b)} />
          ))}
        </View>
      )}

      {selectedBadge && (
        <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </ScrollView>
  );
}

// ─── Tab: Historique ──────────────────────────────────────────────────────────

function HistoryTab({
  userId, isRefreshing,
}: {
  userId: string;
  isRefreshing: boolean;
}) {
  const [sessions,  setSessions]  = useState<SessionData[]>([]);
  const [page,      setPage]      = useState(0);
  const [hasMore,   setHasMore]   = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const loadPage = useCallback(async (pageIndex: number, reset = false) => {
    setIsLoading(true);
    const { data } = await db
      .from('sessions')
      .select('id, completed_at, duration_sec, xp_earned, workout:workouts(name, target_muscle_groups)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .range(pageIndex * HISTORY_PAGE, (pageIndex + 1) * HISTORY_PAGE - 1);

    setIsLoading(false);
    if (!data) return;

    type RawHistSess = {
      id: string; completed_at: string; duration_sec: number; xp_earned: number;
      workout: { name: string; target_muscle_groups: MuscleGroup[] }
             | { name: string; target_muscle_groups: MuscleGroup[] }[]
             | null;
    };
    const mapped = (data as unknown as RawHistSess[]).map((s) => ({
      id:           s.id,
      completed_at: s.completed_at,
      duration_sec: s.duration_sec,
      xp_earned:    s.xp_earned,
      workout_name: (Array.isArray(s.workout) ? s.workout[0]?.name : s.workout?.name) ?? 'Programme',
      muscle_groups: (Array.isArray(s.workout) ? s.workout[0]?.target_muscle_groups : s.workout?.target_muscle_groups) ?? [],
    }));

    setSessions((prev) => reset ? mapped : [...prev, ...mapped]);
    setHasMore(mapped.length === HISTORY_PAGE);
  }, [userId]);

  useEffect(() => { loadPage(0, true); }, [loadPage]);
  useEffect(() => { if (isRefreshing) { setPage(0); loadPage(0, true); } }, [isRefreshing]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage);
  }, [hasMore, isLoading, page, loadPage]);

  const renderItem = useCallback(
    ({ item }: { item: SessionData }) => <SessionHistoryItem item={item} />,
    [],
  );
  const keyExtractor = useCallback((item: SessionData) => item.id, []);

  const ListEmpty = useCallback(() => (
    isLoading ? null : (
      <View style={[styles.emptyBlock, { marginTop: 40 }]}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🏋️</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Aucune séance complétée.</Text>
      </View>
    )
  ), [isLoading]);

  const ListFooter = useCallback(() => (
    isLoading && sessions.length > 0
      ? <Skeleton h={62} r={14} style={{ margin: 16 }} />
      : null
  ), [isLoading, sessions.length]);

  return (
    <FlatList
      data={sessions}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={ListEmpty}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        isLoading && sessions.length === 0
          ? <View style={{ gap: 10 }}>
              <Skeleton h={80} r={14} />
              <Skeleton h={80} r={14} />
              <Skeleton h={80} r={14} />
            </View>
          : null
      }
    />
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const user    = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [activeTab,   setActiveTab]   = useState<TabKey>('stats');
  const [period,      setPeriod]      = useState<PeriodKey>('30d');
  const [isLoading,   setIsLoading]   = useState(true);
  const [isRefreshing,setIsRefreshing]= useState(false);

  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [prs,         setPrs]         = useState<PersonalRecord[]>([]);
  const [badges,      setBadges]      = useState<BadgeData[]>([]);

  // ── Chargement stats + badges (une seule fois) ─────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;

    // Sessions pour stats (toutes — filtrage côté client par période)
    const sessionsPromise = db
      .from('sessions')
      .select('id, completed_at, duration_sec, xp_earned, workout:workouts(name, target_muscle_groups)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(500);

    // Badges : tous disponibles + ceux obtenus
    const allBadgesPromise = db.from('badges').select('*').order('xp_reward', { ascending: true });
    const userBadgesPromise = db
      .from('user_badges')
      .select('badge_id, earned_at')
      .eq('user_id', user.id);

    const [sessRes, allBRes, userBRes] = await Promise.all([
      sessionsPromise, allBadgesPromise, userBadgesPromise,
    ]);

    // Traitement sessions
    if (sessRes.data) {
      type RawSess = {
        id: string; completed_at: string; duration_sec: number; xp_earned: number;
        workout: { name: string; target_muscle_groups: MuscleGroup[] } | { name: string; target_muscle_groups: MuscleGroup[] }[] | null;
      };
      const mapped = (sessRes.data as unknown as RawSess[]).map((s) => {
        const w = Array.isArray(s.workout) ? s.workout[0] : s.workout;
        return {
          id: s.id, completed_at: s.completed_at,
          duration_sec: s.duration_sec, xp_earned: s.xp_earned,
          workout_name: w?.name ?? 'Programme',
          muscle_groups: w?.target_muscle_groups ?? [],
        };
      });
      setAllSessions(mapped);

      // PRs depuis les sessions + completed_sets
      if (mapped.length > 0) {
        const sessionIds = mapped.slice(0, 100).map((s) => s.id);
        const { data: setsRaw } = await db
          .from('completed_sets')
          .select('exercise_id, actual_weight_kg, actual_reps, exercise:exercises(name)')
          .in('session_id', sessionIds)
          .not('actual_weight_kg', 'is', null);

        if (setsRaw) {
          type RawSet = {
            exercise_id: string; actual_weight_kg: number; actual_reps: number | null;
            exercise: { name: string } | { name: string }[] | null;
          };
          const prMap = new Map<string, PersonalRecord>();
          for (const row of setsRaw as unknown as RawSet[]) {
            const eName = Array.isArray(row.exercise)
              ? row.exercise[0]?.name
              : row.exercise?.name;
            const existing = prMap.get(row.exercise_id);
            if (!existing || row.actual_weight_kg > existing.max_weight_kg) {
              prMap.set(row.exercise_id, {
                exercise_id:   row.exercise_id,
                exercise_name: eName ?? row.exercise_id,
                max_weight_kg: row.actual_weight_kg,
                best_reps:     row.actual_reps ?? 0,
              });
            }
          }
          setPrs([...prMap.values()].sort((a, b) => b.max_weight_kg - a.max_weight_kg));
        }
      }
    }

    // Traitement badges
    if (allBRes.data) {
      type RawBadge = {
        id: string; name: string; description: string; icon: string;
        xp_reward: number; condition_type: string; condition_value: number;
      };
      const earnedMap = new Map<string, string>(
        ((userBRes.data ?? []) as Array<{ badge_id: string; earned_at: string }>)
          .map((ub) => [ub.badge_id, ub.earned_at]),
      );
      const merged: BadgeData[] = (allBRes.data as unknown as RawBadge[]).map((b) => ({
        id: b.id, name: b.name, description: b.description, icon: b.icon,
        xp_reward: b.xp_reward, condition_type: b.condition_type,
        condition_value: b.condition_value, rarity: getRarity(b.xp_reward),
        earned: earnedMap.has(b.id),
        earned_at: earnedMap.get(b.id) ?? null,
      }));
      // Earned first, then locked
      merged.sort((a, b) => Number(b.earned) - Number(a.earned));
      setBadges(merged);
    }
  }, [user?.id]);

  useEffect(() => {
    (async () => {
      await loadData();
      setIsLoading(false);
    })();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // ── Render ──────────────────────────────────────────────────────────────

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'stats',   label: 'Stats'      },
    { key: 'badges',  label: 'Badges'     },
    { key: 'history', label: 'Historique' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Progression</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={[styles.tabBtn, activeTab === key && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === key && { color: '#fff' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'stats' && (
        <StatsTab
          allSessions={allSessions}
          prs={prs}
          period={period}
          onPeriodChange={setPeriod}
          isLoading={isLoading}
        />
      )}
      {activeTab === 'badges' && (
        <BadgesTab badges={badges} isLoading={isLoading} />
      )}
      {activeTab === 'history' && user && (
        <HistoryTab userId={user.id} isRefreshing={isRefreshing} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS_PL = `${COLORS.primary}22` as const;

const styles = StyleSheet.create({
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  screenTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '800' },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText:   { color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 },

  periodRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  periodBtn:       { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodBtnText:   { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 20,
    padding: 16,
  },
  cardLabel: {
    color: COLORS.textSecondary, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4,
  },

  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },

  prRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.backgroundElevated,
  },
  prRank: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },

  badgeItem: {
    width: '30%',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 4,
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: COLORS.background,
    borderRadius: 10, padding: 2,
  },
  rarityPill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 2,
  },

  rarityFilterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.backgroundElevated,
    backgroundColor: COLORS.backgroundCard,
  },
  rarityFilterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 340,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 24, padding: 28,
    borderWidth: 1.5,
  },
  modalMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 10, padding: 12, marginTop: 4,
  },
  modalClose: {
    marginTop: 20, backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },

  historyRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  historyIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS_PL,
    alignItems: 'center', justifyContent: 'center',
  },
  muscleTag: {
    backgroundColor: COLORS_PL,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },

  emptyBlock: {
    alignItems: 'center', paddingVertical: 32,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16, padding: 20,
  },
});
