import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Switch, Image, Modal, Pressable,
  Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker  from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as SecureStore   from 'expo-secure-store';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase }      from '@/lib/supabase';
import { useAuthStore }  from '@/stores/authStore';
import { COLORS, LEVELS } from '@/lib/constants';
import { getLevelFromXP } from '@/lib/utils';

const db = supabase as unknown as SupabaseClient;

// ─── Types ────────────────────────────────────────────────────────────────────

type UnitSystem = 'kg' | 'lbs';

interface Goals {
  dailySteps:     number;
  sessionsPerWeek: number;
  targetWeightKg: number | null;
}

interface Settings {
  units:         UnitSystem;
  notifications: boolean;
}

interface HealthToday {
  steps:           number | null;
  calories_active: number | null;
}

interface UserProgram {
  id:               string;
  name:             string;
  difficulty:       number;
  sessions_per_week: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_GOALS: Goals = { dailySteps: 10000, sessionsPerWeek: 3, targetWeightKg: null };
const DEFAULT_SETTINGS: Settings = { units: 'kg', notifications: false };

const DIFF_LABELS: Record<number, string> = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' };
const DIFF_COLORS: Record<number, string> = { 1: '#34D399', 2: '#F59E0B', 3: '#EF4444' };

// ─── Helpers SecureStore ─────────────────────────────────────────────────────

async function loadGoals(userId: string): Promise<Goals> {
  try {
    const raw = await SecureStore.getItemAsync(`goals_${userId}`);
    return raw ? (JSON.parse(raw) as Goals) : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

async function saveGoals(userId: string, goals: Goals): Promise<void> {
  await SecureStore.setItemAsync(`goals_${userId}`, JSON.stringify(goals));
}

async function loadSettings(userId: string): Promise<Settings> {
  try {
    const raw = await SecureStore.getItemAsync(`settings_${userId}`);
    return raw ? (JSON.parse(raw) as Settings) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(userId: string, settings: Settings): Promise<void> {
  await SecureStore.setItemAsync(`settings_${userId}`, JSON.stringify(settings));
}

// ─── Sub-component: Section card ──────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function SettingRow({
  icon, label, right, onPress, danger = false,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.settingRow}
      disabled={!onPress && !right}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={[styles.settingLabel, danger && { color: COLORS.error }]}>{label}</Text>
      {right ?? <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>›</Text>}
    </TouchableOpacity>
  );
}

// ─── Edit username modal ──────────────────────────────────────────────────────

function UsernameModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: string;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [value,   setValue]   = useState(initial);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) { onClose(); return; }
    setLoading(true);
    await onSave(trimmed);
    setLoading(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>Modifier le pseudo</Text>
          <TextInput
            style={styles.modalInput}
            value={value}
            onChangeText={setValue}
            autoFocus
            maxLength={30}
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: COLORS.backgroundElevated }]}>
              <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.primary }]}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '700' }}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const user          = useAuthStore((s) => s.user);
  const profile       = useAuthStore((s) => s.profile);
  const { updateProfile, fetchProfile, signOut } = useAuthStore();

  // ── UI state ────────────────────────────────────────────────────────────
  const [avatarUploading,  setAvatarUploading]  = useState(false);
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [sessionCount,     setSessionCount]     = useState<number>(0);

  // ── Goals state ─────────────────────────────────────────────────────────
  const [goals,        setGoals]        = useState<Goals>(DEFAULT_GOALS);
  const [goalsEditing, setGoalsEditing] = useState(false);
  const [draftGoals,   setDraftGoals]   = useState<Goals>(DEFAULT_GOALS);

  // ── Settings state ──────────────────────────────────────────────────────
  const [settings,    setSettings]    = useState<Settings>(DEFAULT_SETTINGS);
  const [notifLoading,setNotifLoading]= useState(false);

  // ── Health state ─────────────────────────────────────────────────────────
  const [healthToday,  setHealthToday]  = useState<HealthToday | null>(null);
  const [myPrograms,   setMyPrograms]   = useState<UserProgram[]>([]);

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const uid = user.id;

    (async () => {
      const [g, s] = await Promise.all([loadGoals(uid), loadSettings(uid)]);
      setGoals(g);
      setDraftGoals(g);
      setSettings(s);
    })();

    // Session count
    db.from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('status', 'completed')
      .then(({ count }) => setSessionCount(count ?? 0));

    // Today's health data
    const today = new Date().toISOString().split('T')[0];
    db.from('health_data')
      .select('steps, calories_active')
      .eq('user_id', uid)
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHealthToday({ steps: data.steps, calories_active: data.calories_active });
      });

    // My programs
    db.from('workouts')
      .select('id, name, difficulty, sessions_per_week')
      .eq('creator', uid)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setMyPrograms(data as UserProgram[]);
      });
  }, [user?.id]);

  // ── Avatar upload ────────────────────────────────────────────────────────
  const pickAndUploadAvatar = useCallback(async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Accès refusé',
        "Autorise l'accès à ta galerie dans Réglages → Confidentialité.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const response = await fetch(asset.uri);
      const blob     = await response.blob();
      const path     = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: asset.mimeType ?? 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust cache with timestamp
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile({ avatar_url: avatarUrl } as Parameters<typeof updateProfile>[0]);
      await fetchProfile(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'upload';
      Alert.alert('Erreur', msg);
    } finally {
      setAvatarUploading(false);
    }
  }, [user?.id, updateProfile, fetchProfile]);

  // ── Save goals ───────────────────────────────────────────────────────────
  const handleSaveGoals = useCallback(async () => {
    if (!user) return;
    setGoals(draftGoals);
    await saveGoals(user.id, draftGoals);
    setGoalsEditing(false);
  }, [user?.id, draftGoals]);

  // ── Notification toggle ──────────────────────────────────────────────────
  const toggleNotifications = useCallback(async () => {
    if (!user || notifLoading) return;
    setNotifLoading(true);
    try {
      if (!settings.notifications) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const next = { ...settings, notifications: true };
          setSettings(next);
          await saveSettings(user.id, next);
        } else {
          Alert.alert(
            'Notifications désactivées',
            "Autorise les notifications dans les Réglages de l'appareil.",
          );
        }
      } else {
        const next = { ...settings, notifications: false };
        setSettings(next);
        await saveSettings(user.id, next);
      }
    } finally {
      setNotifLoading(false);
    }
  }, [user?.id, settings, notifLoading]);

  // ── Unit toggle ──────────────────────────────────────────────────────────
  const toggleUnits = useCallback(async () => {
    if (!user) return;
    const next: Settings = { ...settings, units: settings.units === 'kg' ? 'lbs' : 'kg' };
    setSettings(next);
    await saveSettings(user.id, next);
  }, [user?.id, settings]);

  // ── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Se déconnecter ?',
      'Tu devras te reconnecter pour accéder à ton compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }, [signOut, router]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const level    = getLevelFromXP(profile?.total_xp ?? 0);
  const username = profile?.username ?? user?.email?.split('@')[0] ?? '—';
  const initials = username.slice(0, 2).toUpperCase();
  const avatarUrl = profile?.avatar_url ?? null;

  const displayWeight = (kg: number | null): string => {
    if (kg === null) return '—';
    if (settings.units === 'lbs') return `${Math.round(kg * 2.205)} lbs`;
    return `${kg} kg`;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* ── 1. Header hero ────────────────────────────────────────────── */}
      <View style={styles.hero}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, styles.avatarInitials]}>
                <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBtn}>
              {avatarUploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ fontSize: 14 }}>📷</Text>}
            </View>
          </TouchableOpacity>

          {/* Username */}
          <TouchableOpacity onPress={() => setShowUsernameEdit(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Text style={styles.username}>{username}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>✎</Text>
          </TouchableOpacity>

          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: `${level.badge_color}22`, borderColor: `${level.badge_color}55` }]}>
            <Text style={{ color: level.badge_color, fontWeight: '700', fontSize: 13 }}>
              Niv. {level.level} — {level.name}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: COLORS.xp }]}>
              {(profile?.total_xp ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>XP total</Text>
          </View>
          <View style={[styles.statCell, styles.statBorder]}>
            <Text style={[styles.statValue, { color: '#F97316' }]}>
              {profile?.streak_days ?? 0}🔥
            </Text>
            <Text style={styles.statLabel}>Jours de suite</Text>
          </View>
          <View style={[styles.statCell, styles.statBorder]}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{sessionCount}</Text>
            <Text style={styles.statLabel}>Séances</Text>
          </View>
        </View>
      </View>

      {/* ── 2. Objectifs ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionTitle label="Objectifs" />
        <Card>
          {/* Steps */}
          <View style={styles.goalRow}>
            <Text style={styles.goalIcon}>🚶</Text>
            <Text style={styles.goalLabel}>Pas quotidiens</Text>
            {goalsEditing ? (
              <TextInput
                style={styles.goalInput}
                value={draftGoals.dailySteps.toString()}
                onChangeText={(v) => setDraftGoals((g) => ({ ...g, dailySteps: parseInt(v) || 0 }))}
                keyboardType="number-pad"
                maxLength={6}
              />
            ) : (
              <Text style={styles.goalValue}>{draftGoals.dailySteps.toLocaleString()}</Text>
            )}
          </View>

          <View style={[styles.goalRow, styles.goalDivider]}>
            <Text style={styles.goalIcon}>🏋️</Text>
            <Text style={styles.goalLabel}>Séances / semaine</Text>
            {goalsEditing ? (
              <TextInput
                style={styles.goalInput}
                value={draftGoals.sessionsPerWeek.toString()}
                onChangeText={(v) => setDraftGoals((g) => ({ ...g, sessionsPerWeek: parseInt(v) || 1 }))}
                keyboardType="number-pad"
                maxLength={1}
              />
            ) : (
              <Text style={styles.goalValue}>{draftGoals.sessionsPerWeek}×</Text>
            )}
          </View>

          <View style={[styles.goalRow, styles.goalDivider]}>
            <Text style={styles.goalIcon}>⚖️</Text>
            <Text style={styles.goalLabel}>Poids cible</Text>
            {goalsEditing ? (
              <TextInput
                style={styles.goalInput}
                value={draftGoals.targetWeightKg?.toString() ?? ''}
                onChangeText={(v) => setDraftGoals((g) => ({ ...g, targetWeightKg: parseFloat(v) || null }))}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="—"
                placeholderTextColor={COLORS.textMuted}
              />
            ) : (
              <Text style={styles.goalValue}>{displayWeight(draftGoals.targetWeightKg)}</Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
            {goalsEditing ? (
              <>
                <TouchableOpacity onPress={() => { setDraftGoals(goals); setGoalsEditing(false); }} style={styles.btnSecondary}>
                  <Text style={{ color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveGoals} style={styles.btnPrimary}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Enregistrer</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setGoalsEditing(true)} style={styles.btnSecondary}>
                <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </View>

      {/* ── 3. Santé ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionTitle label="Santé" />
        <Card>
          {/* Today's health data */}
          {healthToday ? (
            <View style={{ flexDirection: 'row', marginBottom: 14 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.statValue, { color: '#34D399', fontSize: 22 }]}>
                  {healthToday.steps?.toLocaleString() ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Pas aujourd'hui</Text>
              </View>
              <View style={{ width: 1, backgroundColor: COLORS.backgroundElevated }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.statValue, { color: '#F97316', fontSize: 22 }]}>
                  {healthToday.calories_active ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Kcal actives</Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
              Aucune donnée de santé pour aujourd'hui.
            </Text>
          )}

          <TouchableOpacity
            onPress={() => Alert.alert('HealthKit / Google Fit', 'L\'intégration santé sera disponible prochainement.')}
            style={styles.healthBtn}
          >
            <Text style={{ fontSize: 16 }}>❤️</Text>
            <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 14 }}>
              Configurer la santé
            </Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* ── 4. Mes programmes ─────────────────────────────────────────── */}
      {myPrograms.length > 0 && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle label="Mes programmes" />
            <TouchableOpacity onPress={() => router.push('/(tabs)/workout')}>
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {myPrograms.map((prog, i) => (
              <View
                key={prog.id}
                style={[styles.programRow, i < myPrograms.length - 1 && styles.programDivider]}
              >
                <View style={[styles.diffDot, { backgroundColor: DIFF_COLORS[prog.difficulty] ?? COLORS.primary }]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                    {prog.name}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {DIFF_LABELS[prog.difficulty]} · {prog.sessions_per_week}×/sem
                  </Text>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>›</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* ── 5. Paramètres ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionTitle label="Paramètres" />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Notifications */}
          <SettingRow
            icon="🔔"
            label="Notifications"
            right={
              notifLoading
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : (
                  <Switch
                    value={settings.notifications}
                    onValueChange={toggleNotifications}
                    trackColor={{ false: COLORS.backgroundElevated, true: `${COLORS.primary}70` }}
                    thumbColor={settings.notifications ? COLORS.primary : COLORS.textMuted}
                    ios_backgroundColor={COLORS.backgroundElevated}
                  />
                )
            }
          />

          <View style={styles.rowDivider} />

          {/* Unités */}
          <SettingRow
            icon="⚖️"
            label="Unités"
            onPress={toggleUnits}
            right={
              <View style={styles.unitsToggle}>
                <Text style={[styles.unitOption, settings.units === 'kg' && styles.unitOptionActive]}>kg</Text>
                <Text style={[styles.unitOption, settings.units === 'lbs' && styles.unitOptionActive]}>lbs</Text>
              </View>
            }
          />

          <View style={styles.rowDivider} />

          {/* À propos */}
          <SettingRow
            icon="ℹ️"
            label="À propos"
            onPress={() => Alert.alert('GainXP', 'Version 1.0.0\nConçu pour te pousser à te dépasser chaque jour.')}
          />
        </Card>
      </View>

      {/* ── 6. Déconnexion ────────────────────────────────────────────── */}
      <View style={[styles.section, { marginTop: 4 }]}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn} activeOpacity={0.8}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            Se déconnecter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Username edit modal */}
      {showUsernameEdit && (
        <UsernameModal
          visible
          initial={username}
          onSave={async (name) => {
            await updateProfile({ username: name });
            if (user) await fetchProfile(user.id);
          }}
          onClose={() => setShowUsernameEdit(false)}
        />
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hero: {
    paddingTop:  Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.backgroundCard,
    marginBottom: 8,
  },

  avatarWrap: { position: 'relative', width: 96, height: 96 },
  avatarImg:  { width: 96, height: 96, borderRadius: 48 },
  avatarInitials: {
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 2, borderColor: COLORS.backgroundCard,
    alignItems: 'center', justifyContent: 'center',
  },

  username: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  levelBadge: {
    marginTop: 6, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },

  statsRow: { flexDirection: 'row', marginTop: 4 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: COLORS.backgroundElevated },
  statValue: { fontWeight: '800', fontSize: 20, color: COLORS.textPrimary },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },

  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 20, padding: 16,
  },

  goalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  goalDivider: { borderTopWidth: 1, borderTopColor: COLORS.backgroundElevated },
  goalIcon:  { fontSize: 18, width: 28 },
  goalLabel: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  goalValue: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  goalInput: {
    color: COLORS.textPrimary, fontSize: 14, fontWeight: '700',
    textAlign: 'right', minWidth: 60,
    borderBottomWidth: 1, borderBottomColor: COLORS.primary,
    paddingBottom: 2,
  },

  btnPrimary: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  btnSecondary: {
    backgroundColor: COLORS.backgroundElevated, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },

  healthBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 12, padding: 12, justifyContent: 'center',
  },

  programRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  programDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.backgroundElevated },
  diffDot: { width: 8, height: 8, borderRadius: 4 },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingIcon:  { fontSize: 18, width: 28, marginRight: 12 },
  settingLabel: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  rowDivider:   { height: 1, backgroundColor: COLORS.backgroundElevated, marginLeft: 56 },

  unitsToggle: { flexDirection: 'row', backgroundColor: COLORS.backgroundElevated, borderRadius: 8, padding: 2 },
  unitOption: {
    paddingHorizontal: 10, paddingVertical: 4,
    color: COLORS.textMuted, fontSize: 13, fontWeight: '600', borderRadius: 6,
  },
  unitOptionActive: { backgroundColor: COLORS.primary, color: '#fff' },

  signOutBtn: {
    backgroundColor: COLORS.error, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: COLORS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  modalCard: {
    width: '100%', backgroundColor: COLORS.backgroundCard,
    borderRadius: 20, padding: 24, gap: 16,
  },
  modalTitle: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 18 },
  modalInput: {
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.textPrimary, fontSize: 16,
  },
  modalBtn: {
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    paddingHorizontal: 16,
  },
});
