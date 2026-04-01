import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Platform, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence,
  Easing,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase }             from '@/lib/supabase';
import { useAuthStore }         from '@/stores/authStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useWorkoutStore }      from '@/stores/workoutStore';
import { useDailyTasks }        from '@/hooks/useDailyTasks';
import { DailyTaskCard }        from '@/components/ui/DailyTaskCard';
import { StreakDisplay }        from '@/components/gamification/StreakDisplay';
import { XPBar }                from '@/components/gamification/XPBar';
import { COLORS }               from '@/lib/constants';
import { getLevelFromXP, formatDuration, calculateCalories } from '@/lib/utils';

// Requêtes avec jointures → client non-typé
const db = supabase as unknown as SupabaseClient;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentSession {
  id:           string;
  workout_name: string;
  completed_at: string;
  duration_sec: number;
  xp_earned:    number;
}

interface WeeklyStats {
  totalSessions: number;
  totalMinutes:  number;
  totalCalories: number;
  dailyMinutes:  number[]; // index 0 = J-6, index 6 = aujourd'hui
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Libellé court du jour J-n en français */
function getDayLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'][d.getDay()];
}

function getTodayLabel(): string {
  const label = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h, r = 10, style }: { h: number; r?: number; style?: ViewStyle }) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7,  { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ height: h, borderRadius: r, backgroundColor: COLORS.backgroundElevated }, animStyle, style]}
    />
  );
}

// ─── Mini graphique en barres (7 jours) ──────────────────────────────────────

const BAR_MAX_H = 48;

function MiniBarChart({ dailyMinutes }: { dailyMinutes: number[] }) {
  const maxVal = Math.max(...dailyMinutes, 1);

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_MAX_H, gap: 4 }}>
        {dailyMinutes.map((val, i) => {
          const barH  = Math.max((val / maxVal) * BAR_MAX_H, val > 0 ? 6 : 3);
          const isToday = i === 6;
          return (
            <View key={i} style={{ flex: 1, height: BAR_MAX_H, justifyContent: 'flex-end' }}>
              <View
                style={{
                  height: barH,
                  borderRadius: 3,
                  backgroundColor: isToday
                    ? COLORS.primary
                    : val > 0
                      ? `${COLORS.primary}55`
                      : COLORS.backgroundElevated,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* Labels des jours */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {dailyMinutes.map((_, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: COLORS.textMuted, fontSize: 9 }}>
            {getDayLabel(6 - i)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── MetricCell ───────────────────────────────────────────────────────────────

function MetricCell({
  value, label, color,
  bordered = false,
}: { value: string; label: string; color: string; bordered?: boolean }) {
  return (
    <View
      style={[
        { flex: 1, alignItems: 'center', paddingVertical: 4 },
        bordered && { borderLeftWidth: 1, borderLeftColor: COLORS.backgroundElevated },
      ]}
    >
      <Text style={{ color, fontWeight: '800', fontSize: 20 }}>{value}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 10, marginTop: 2, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

// ─── SessionRow ───────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: RecentSession }) {
  const dateStr = new Date(session.completed_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short',
  });

  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionIcon}>
        <Text style={{ fontSize: 18 }}>💪</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
          {session.workout_name}
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
          {dateStr} · {formatDuration(session.duration_sec)}
        </Text>
      </View>
      <Text style={{ color: COLORS.xp, fontWeight: '700', fontSize: 13 }}>
        +{session.xp_earned} XP
      </Text>
    </View>
  );
}

// ─── Couleurs de difficulté ───────────────────────────────────────────────────

const DIFF_COLORS: Record<number, string> = {
  1: '#34D399',
  2: '#F59E0B',
  3: '#EF4444',
};

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();

  const user    = useAuthStore((s) => s.user);
  const profile = useGamificationStore((s) => s.profile);
  const earnedBadges = useGamificationStore((s) => s.earnedBadges);
  const { loadProfile, loadBadges }         = useGamificationStore();
  const { publicWorkouts, loadPublicWorkouts } = useWorkoutStore();
  const { tasks, loadTodaysTasks }            = useDailyTasks();

  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalSessions: 0,
    totalMinutes:  0,
    totalCalories: 0,
    dailyMinutes:  Array(7).fill(0) as number[],
  });

  // ── Requêtes Supabase directes ──────────────────────────────────────────

  const fetchRecentSessions = useCallback(async (userId: string) => {
    const { data } = await db
      .from('sessions')
      .select('id, completed_at, duration_sec, xp_earned, workout:workouts(name)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(3);

    if (!data) return;

    type RawSession = {
      id: string;
      completed_at: string;
      duration_sec: number;
      xp_earned: number;
      workout: { name: string } | { name: string }[] | null;
    };

    setRecentSessions(
      (data as unknown as RawSession[]).map((s) => ({
        id:           s.id,
        workout_name: Array.isArray(s.workout)
          ? (s.workout[0]?.name ?? 'Programme')
          : (s.workout?.name ?? 'Programme'),
        completed_at: s.completed_at,
        duration_sec: s.duration_sec,
        xp_earned:    s.xp_earned,
      }))
    );
  }, []);

  const fetchWeeklyStats = useCallback(async (userId: string) => {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const { data } = await db
      .from('sessions')
      .select('completed_at, duration_sec')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', since.toISOString());

    if (!data) return;

    const dailyMinutes: number[] = Array(7).fill(0);
    let totalDurationSec = 0;

    for (const s of data as Array<{ completed_at: string; duration_sec: number }>) {
      const msSince = Date.now() - new Date(s.completed_at).getTime();
      const daysAgo = Math.floor(msSince / 86_400_000);
      const idx = 6 - Math.min(daysAgo, 6);
      dailyMinutes[idx] += Math.round(s.duration_sec / 60);
      totalDurationSec  += s.duration_sec;
    }

    setWeeklyStats({
      totalSessions: data.length,
      totalMinutes:  Math.round(totalDurationSec / 60),
      totalCalories: calculateCalories(totalDurationSec, 'medium'),
      dailyMinutes,
    });
  }, []);

  // ── Chargement en parallèle ─────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      loadProfile(user.id),
      loadBadges(user.id),
      loadTodaysTasks(user.id),
      loadPublicWorkouts(),
      fetchRecentSessions(user.id),
      fetchWeeklyStats(user.id),
    ]);
  }, [
    user?.id,
    loadProfile, loadBadges, loadTodaysTasks,
    loadPublicWorkouts, fetchRecentSessions, fetchWeeklyStats,
  ]);

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

  // ── Animation d'entrée du contenu ───────────────────────────────────────

  const fadeAnim  = useSharedValue(0);
  const slideAnim = useSharedValue(16);

  useEffect(() => {
    if (!isLoading) {
      fadeAnim.value  = withTiming(1, { duration: 380 });
      slideAnim.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    }
  }, [isLoading]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity:   fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  // ── Données dérivées ────────────────────────────────────────────────────

  const level            = getLevelFromXP(profile?.total_xp ?? 0);
  const username         = profile?.username ?? user?.email?.split('@')[0] ?? 'Joueur';
  const displayedTasks   = tasks.slice(0, 4);
  const completedCount   = tasks.filter((t) => t.is_completed).length;
  const suggestedWorkout = publicWorkouts[0] ?? null;
  const recentBadges     = earnedBadges.slice(0, 6);

  // ── Rendu ───────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* ── 1. Header ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <>
              <Skeleton h={11} r={5} style={{ width: 90, marginBottom: 7 }} />
              <Skeleton h={22} r={6} style={{ width: 170 }} />
            </>
          ) : (
            <>
              <Text style={styles.dateLabel}>{getTodayLabel()}</Text>
              <Text style={styles.greeting}>Bonjour, {username} 👋</Text>
            </>
          )}
        </View>

        {/* Avatar + pip de niveau */}
        {isLoading ? (
          <Skeleton h={48} r={24} style={{ width: 48 }} />
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarBadge, { borderColor: level.badge_color }]}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
              <View style={[styles.levelPip, { backgroundColor: level.badge_color }]}>
                <Text style={styles.levelPipText}>{level.level}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <Animated.View style={contentStyle}>
        {/* ── 2. Streak + XP Bar ─────────────────────────────────────────── */}
        <View style={styles.section}>
          {isLoading ? (
            <Skeleton h={104} r={20} />
          ) : (
            <View style={styles.card}>
              <StreakDisplay streakDays={profile?.streak_days ?? 0} />
              <View style={{ marginTop: 16 }}>
                <XPBar totalXP={profile?.total_xp ?? 0} height={8} />
              </View>
            </View>
          )}
        </View>

        {/* ── 3. Tâches du jour ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tâches du jour</Text>
            {!isLoading && (
              <Text style={styles.sectionSub}>
                {completedCount}/{tasks.length} complétées
              </Text>
            )}
          </View>

          {isLoading ? (
            <>
              <Skeleton h={76} r={16} style={{ marginBottom: 8 }} />
              <Skeleton h={76} r={16} />
            </>
          ) : displayedTasks.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>Aucune tâche pour aujourd'hui.</Text>
            </View>
          ) : (
            displayedTasks.map((task) => (
              <DailyTaskCard key={task.id} task={task} />
            ))
          )}
        </View>

        {/* ── 4. Programme suggéré ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Programme suggéré</Text>
          </View>

          {isLoading ? (
            <Skeleton h={108} r={20} />
          ) : suggestedWorkout ? (
            <TouchableOpacity
              onPress={() => router.push(`/workout/${suggestedWorkout.id}`)}
              activeOpacity={0.85}
              style={styles.card}
            >
              {/* Badge difficulté */}
              <View
                style={[
                  styles.diffBadge,
                  { backgroundColor: `${DIFF_COLORS[suggestedWorkout.difficulty]}25` },
                ]}
              >
                <Text style={{ color: DIFF_COLORS[suggestedWorkout.difficulty], fontSize: 11, fontWeight: '700' }}>
                  {'★'.repeat(suggestedWorkout.difficulty)}
                  {'☆'.repeat(3 - suggestedWorkout.difficulty)}
                </Text>
              </View>

              <Text style={styles.suggestedName} numberOfLines={2}>
                {suggestedWorkout.name}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Text style={styles.suggestedMeta}>
                    📅 {suggestedWorkout.duration_weeks} sem.
                  </Text>
                  <Text style={styles.suggestedMeta}>
                    ⚡ {suggestedWorkout.sessions_per_week}×/sem
                  </Text>
                  <Text style={[styles.suggestedMeta, { color: COLORS.xp }]}>
                    +{suggestedWorkout.xp_reward} XP
                  </Text>
                </View>

                <View style={styles.startBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                    Commencer
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>Aucun programme disponible.</Text>
            </View>
          )}
        </View>

        {/* ── 5. Stats rapides + mini graphique ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Cette semaine</Text>

          {isLoading ? (
            <Skeleton h={136} r={20} />
          ) : (
            <View style={styles.card}>
              {/* 4 métriques */}
              <View style={{ flexDirection: 'row', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.backgroundElevated }}>
                <MetricCell
                  value={weeklyStats.totalSessions.toString()}
                  label="Séances"
                  color={COLORS.primary}
                />
                <MetricCell
                  value={weeklyStats.totalMinutes.toString()}
                  label="Minutes"
                  color={COLORS.accent}
                  bordered
                />
                <MetricCell
                  value={weeklyStats.totalCalories.toString()}
                  label="Kcal est."
                  color={COLORS.secondary}
                  bordered
                />
                <MetricCell
                  value={(profile?.streak_days ?? 0).toString()}
                  label="Streak 🔥"
                  color={COLORS.xp}
                  bordered
                />
              </View>

              {/* Mini graphique */}
              <View style={{ marginTop: 14 }}>
                <MiniBarChart dailyMinutes={weeklyStats.dailyMinutes} />
              </View>
            </View>
          )}
        </View>

        {/* ── 6. Badges récents (scroll horizontal) ─────────────────────── */}
        {(isLoading || recentBadges.length > 0) && (
          <View style={{ marginBottom: 12 }}>
            <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
              <Text style={styles.sectionTitle}>Badges récents</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                scrollEnabled={false}
              >
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} h={90} r={16} style={{ width: 80 }} />
                ))}
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {recentBadges.map((ub) => (
                  <View key={ub.id} style={styles.badgeChip}>
                    <Text style={{ fontSize: 28, textAlign: 'center' }}>{ub.badge.icon || '🏅'}</Text>
                    <Text style={styles.badgeChipName} numberOfLines={2}>
                      {ub.badge.name}
                    </Text>
                    <Text style={styles.badgeChipXP}>+{ub.badge.xp_reward} XP</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── 7. Activité récente ────────────────────────────────────────── */}
        <View style={[styles.section, { marginBottom: 36 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activité récente</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <>
              <Skeleton h={62} r={14} style={{ marginBottom: 8 }} />
              <Skeleton h={62} r={14} style={{ marginBottom: 8 }} />
              <Skeleton h={62} r={14} />
            </>
          ) : recentSessions.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🏋️</Text>
              <Text style={styles.emptyText}>Aucune séance pour le moment.</Text>
            </View>
          ) : (
            recentSessions.map((s) => <SessionRow key={s.id} session={s} />)
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 20,
    paddingTop:        Platform.OS === 'ios' ? 60 : 44,
    paddingBottom:     20,
  },
  dateLabel: { color: COLORS.textMuted, fontSize: 12 },
  greeting:  { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },

  avatarBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  levelPip: {
    position: 'absolute', bottom: -3, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.background,
  },
  levelPipText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Layout
  section: { paddingHorizontal: 20, marginBottom: 12 },
  card:    { backgroundColor: COLORS.backgroundCard, borderRadius: 20, padding: 16 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 16 },
  sectionSub:   { color: COLORS.textSecondary, fontSize: 12 },
  seeAll:       { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  emptyBlock: {
    backgroundColor: COLORS.backgroundCard, borderRadius: 16,
    padding: 20, alignItems: 'center',
  },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },

  // Suggested workout
  diffBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, marginBottom: 8,
  },
  suggestedName: {
    color: COLORS.textPrimary, fontWeight: '700', fontSize: 17, lineHeight: 22,
  },
  suggestedMeta: { color: COLORS.textSecondary, fontSize: 12 },
  startBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },

  // Badges
  badgeChip: {
    width: 80,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  badgeChipName: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center', lineHeight: 13 },
  badgeChipXP:   { color: COLORS.xp, fontSize: 10, fontWeight: '700' },

  // Sessions
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  sessionIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center', justifyContent: 'center',
  },
});
