import { useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { NotificationPreferences } from '@/types/index';

// Même contournement que useDailyTasks : cast non-typé pour les mutations
// sur user_profiles (colonne JSONB notification_preferences non encore générée).
const db = supabase as unknown as SupabaseClient;

// ─── Identifiants des notifications planifiées ────────────────────────────────
const ID_WORKOUT_PREFIX = 'workout-reminder-day-';
const ID_STREAK_DANGER  = 'streak-danger-daily';
const ID_DAILY_TASKS    = 'daily-tasks-reminder';

// ─── Préférences par défaut ───────────────────────────────────────────────────
const DEFAULT_PREFERENCES: NotificationPreferences = {
  workout_reminder_enabled:        false,
  workout_reminder_hour:           9,
  workout_reminder_minute:         0,
  workout_reminder_days:           [],
  streak_danger_enabled:           true,
  daily_tasks_reminder_enabled:    false,
  daily_tasks_reminder_hour:       8,
  daily_tasks_reminder_minute:     0,
};

// ─── Canaux Android ───────────────────────────────────────────────────────────
// À appeler au démarrage de l'app (ex. dans _layout.tsx), une seule fois.
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Rappels entraînement',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('streak-alerts', {
    name: 'Alertes streak',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync('achievements', {
    name: 'Récompenses',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

// ─── Conversion jour JS → weekday expo-notifications ─────────────────────────
// JS : 0=Dimanche … 6=Samedi
// expo : 1=Dimanche … 7=Samedi
function toExpoWeekday(jsDay: number): number {
  return jsDay + 1;
}

// ─── Types du hook ────────────────────────────────────────────────────────────

interface UseNotificationsReturn {
  permissionStatus: Notifications.PermissionStatus | null;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  requestPermissions:              () => Promise<boolean>;
  scheduleWorkoutReminder:         (hour: number, minute: number, days: number[]) => Promise<void>;
  cancelWorkoutReminders:          () => Promise<void>;
  scheduleStreakDangerNotification: (streakDays: number) => Promise<void>;
  cancelStreakDangerNotification:  () => Promise<void>;
  sendLevelUpNotification:         (level: number, levelName: string) => Promise<void>;
  scheduleDailyTasksReminder:      (hour: number, minute: number) => Promise<void>;
  cancelDailyTasksReminder:        () => Promise<void>;
  loadPreferences:                 (userId: string) => Promise<void>;
  savePreferences:                 (userId: string, prefs: Partial<NotificationPreferences>) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications(): UseNotificationsReturn {
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Demande de permissions ────────────────────────────────────────────────
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: existing } = await Notifications.getPermissionsAsync();

    if (existing === Notifications.PermissionStatus.GRANTED) {
      setPermissionStatus(existing);
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });

    setPermissionStatus(status);
    return status === Notifications.PermissionStatus.GRANTED;
  }, []);

  // ── Rappel entraînement (une notification par jour sélectionné) ───────────
  const scheduleWorkoutReminder = useCallback(
    async (hour: number, minute: number, days: number[]): Promise<void> => {
      // Annule les rappels existants avant de replanifier
      await Promise.all(
        [0, 1, 2, 3, 4, 5, 6].map((d) =>
          Notifications.cancelScheduledNotificationAsync(`${ID_WORKOUT_PREFIX}${d}`)
            .catch(() => undefined) // ignore si l'identifiant n'existe pas
        )
      );

      await Promise.all(
        days.map((day) =>
          Notifications.scheduleNotificationAsync({
            identifier: `${ID_WORKOUT_PREFIX}${day}`,
            content: {
              title: 'Rappel entraînement 💪',
              body: "C'est l'heure de t'entraîner !",
              sound: 'default',
              data: { type: 'workout_reminder' },
              ...(Platform.OS === 'android' && { channelId: 'reminders' }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: toExpoWeekday(day),
              hour,
              minute,
            },
          })
        )
      );
    },
    []
  );

  // ── Annulation des rappels entraînement ───────────────────────────────────
  const cancelWorkoutReminders = useCallback(async (): Promise<void> => {
    await Promise.all(
      [0, 1, 2, 3, 4, 5, 6].map((d) =>
        Notifications.cancelScheduledNotificationAsync(`${ID_WORKOUT_PREFIX}${d}`)
          .catch(() => undefined)
      )
    );
  }, []);

  // ── Alerte streak en danger (tous les jours à 20h) ────────────────────────
  const scheduleStreakDangerNotification = useCallback(
    async (streakDays: number): Promise<void> => {
      // Annule l'ancienne planification (streak count peut avoir changé)
      await Notifications.cancelScheduledNotificationAsync(ID_STREAK_DANGER)
        .catch(() => undefined);

      await Notifications.scheduleNotificationAsync({
        identifier: ID_STREAK_DANGER,
        content: {
          title: '🔥 Streak en danger !',
          body: `Ton streak de ${streakDays} jour${streakDays > 1 ? 's' : ''} est en danger ! Fais une séance avant minuit.`,
          sound: 'default',
          data: { type: 'streak_danger', streak_days: streakDays },
          ...(Platform.OS === 'android' && { channelId: 'streak-alerts' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        },
      });
    },
    []
  );

  // ── Annulation de l'alerte streak (appelé à la fin d'une séance) ──────────
  const cancelStreakDangerNotification = useCallback(async (): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(ID_STREAK_DANGER)
      .catch(() => undefined);
  }, []);

  // ── Notification immédiate de passage de niveau ───────────────────────────
  const sendLevelUpNotification = useCallback(
    async (level: number, levelName: string): Promise<void> => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Nouveau niveau débloqué !',
          body: `Félicitations ! Tu as atteint le niveau ${level} — ${levelName} !`,
          sound: 'default',
          data: { type: 'level_up', level, level_name: levelName },
          ...(Platform.OS === 'android' && { channelId: 'achievements' }),
        },
        trigger: null, // notification immédiate
      });
    },
    []
  );

  // ── Rappel tâches quotidiennes ────────────────────────────────────────────
  const scheduleDailyTasksReminder = useCallback(
    async (hour: number, minute: number): Promise<void> => {
      await Notifications.cancelScheduledNotificationAsync(ID_DAILY_TASKS)
        .catch(() => undefined);

      await Notifications.scheduleNotificationAsync({
        identifier: ID_DAILY_TASKS,
        content: {
          title: 'Tâches quotidiennes 📋',
          body: "N'oublie pas de compléter tes tâches du jour !",
          sound: 'default',
          data: { type: 'daily_tasks' },
          ...(Platform.OS === 'android' && { channelId: 'reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    },
    []
  );

  // ── Annulation du rappel tâches quotidiennes ──────────────────────────────
  const cancelDailyTasksReminder = useCallback(async (): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(ID_DAILY_TASKS)
      .catch(() => undefined);
  }, []);

  // ── Chargement des préférences depuis Supabase ────────────────────────────
  const loadPreferences = useCallback(async (userId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from('user_profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFERENCES,
        ...(data?.notification_preferences ?? {}),
      };
      setPreferences(prefs);
    } catch (err) {
      console.warn('[useNotifications] loadPreferences error:', err);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Sauvegarde des préférences dans Supabase ──────────────────────────────
  const savePreferences = useCallback(
    async (userId: string, prefs: Partial<NotificationPreferences>): Promise<void> => {
      // Mise à jour optimiste locale
      setPreferences((prev) => ({ ...(prev ?? DEFAULT_PREFERENCES), ...prefs }));

      try {
        const merged: NotificationPreferences = {
          ...(preferences ?? DEFAULT_PREFERENCES),
          ...prefs,
        };

        const { error } = await db
          .from('user_profiles')
          .update({ notification_preferences: merged })
          .eq('id', userId);

        if (error) throw error;

        // Synchronise les notifications planifiées avec les nouvelles préférences
        if (merged.workout_reminder_enabled && merged.workout_reminder_days.length > 0) {
          await scheduleWorkoutReminder(
            merged.workout_reminder_hour,
            merged.workout_reminder_minute,
            merged.workout_reminder_days
          );
        } else {
          await cancelWorkoutReminders();
        }

        if (!merged.daily_tasks_reminder_enabled) {
          await cancelDailyTasksReminder();
        } else {
          await scheduleDailyTasksReminder(
            merged.daily_tasks_reminder_hour,
            merged.daily_tasks_reminder_minute
          );
        }
      } catch (err) {
        console.warn('[useNotifications] savePreferences error:', err);
      }
    },
    [
      preferences,
      scheduleWorkoutReminder,
      cancelWorkoutReminders,
      scheduleDailyTasksReminder,
      cancelDailyTasksReminder,
    ]
  );

  return {
    permissionStatus,
    preferences,
    isLoading,
    requestPermissions,
    scheduleWorkoutReminder,
    cancelWorkoutReminders,
    scheduleStreakDangerNotification,
    cancelStreakDangerNotification,
    sendLevelUpNotification,
    scheduleDailyTasksReminder,
    cancelDailyTasksReminder,
    loadPreferences,
    savePreferences,
  };
}
