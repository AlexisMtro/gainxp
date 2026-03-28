import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useDailyTasks } from './useDailyTasks';
import type { HealthData } from '@/types/index';

// Même raison que useDailyTasks : upsert sur health_data avec champs primitifs uniquement
const db = supabase as unknown as SupabaseClient;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthSnapshot {
  steps: number;
  caloriesActive: number;
  date: string; // "YYYY-MM-DD"
}

interface UseHealthDataReturn {
  healthData: HealthData | null;
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<boolean>;
  syncTodayData: () => Promise<HealthSnapshot | null>;
  saveToSupabase: (userId: string, snapshot: HealthSnapshot) => Promise<void>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

// ─── Stub du module santé (expo-health est un placeholder vide en v0.0.0) ─────
// Remplacer par react-native-health (iOS) / react-native-google-fit (Android)
// quand un module natif réel est disponible.

interface HealthModule {
  requestPermissionsAsync: (types: string[]) => Promise<{ granted: boolean }>;
  getStepsAsync: (opts: { startDate: Date; endDate: Date }) => Promise<number>;
  getActiveCaloriesAsync: (opts: { startDate: Date; endDate: Date }) => Promise<number>;
  HealthDataType: { Steps: string; ActiveEnergyBurned: string };
}

/** Importe le module santé de façon conditionnelle (non disponible sur le web) */
async function getHealthModule(): Promise<HealthModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const health = require('expo-health') as HealthModule;
    // Le module est vide (v0.0.0) : vérifie qu'il expose bien l'API attendue
    if (typeof health?.requestPermissionsAsync !== 'function') return null;
    return health;
  } catch {
    console.warn('[useHealthData] expo-health non disponible sur cette plateforme');
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHealthData(userId: string): UseHealthDataReturn {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tasks, updateTaskProgress, completeTask } = useDailyTasks();

  // ── Mise à jour automatique des tâches "steps" et "calories" ─────────────
  // Déclaré avant syncTodayData pour éviter un accès avant initialisation
  const syncHealthToTasks = useCallback(
    async (snapshot: HealthSnapshot): Promise<void> => {
      for (const task of tasks) {
        const type = task.task.task_type;
        if (type !== 'steps' && type !== 'calories') continue;

        const newValue = type === 'steps' ? snapshot.steps : snapshot.caloriesActive;

        await updateTaskProgress(task.id, newValue);

        // Complétion automatique si l'objectif est atteint
        if (!task.is_completed && newValue >= task.task.target_value) {
          await completeTask(task.id);
        }
      }
    },
    [tasks, updateTaskProgress, completeTask]
  );

  // ── Demande des permissions HealthKit / Google Health Connect ─────────────
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const health = await getHealthModule();
    if (!health) return false;

    try {
      const result = await health.requestPermissionsAsync([
        health.HealthDataType.Steps,
        health.HealthDataType.ActiveEnergyBurned,
      ]);
      return result.granted;
    } catch (err) {
      console.warn('[useHealthData] requestPermissions error:', err);
      return false;
    }
  }, []);

  // ── Lecture des données du jour via HealthKit / Health Connect ────────────
  const syncTodayData = useCallback(async (): Promise<HealthSnapshot | null> => {
    const health = await getHealthModule();
    if (!health) return null;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dateStr = startOfDay.toISOString().split('T')[0];

      const [stepsResult, caloriesResult] = await Promise.all([
        health.getStepsAsync({ startDate: startOfDay, endDate: now }),
        health.getActiveCaloriesAsync({ startDate: startOfDay, endDate: now }),
      ]);

      const snapshot: HealthSnapshot = {
        steps: Math.round(stepsResult ?? 0),
        caloriesActive: Math.round(caloriesResult ?? 0),
        date: dateStr,
      };

      // Propagation vers les tâches quotidiennes steps/calories
      await syncHealthToTasks(snapshot);

      return snapshot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de synchronisation';
      setError(message);
      console.warn('[useHealthData] syncTodayData error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [syncHealthToTasks]);

  // ── Sauvegarde dans Supabase (upsert par user_id + date) ─────────────────
  const saveToSupabase = useCallback(
    async (uid: string, snapshot: HealthSnapshot): Promise<void> => {
      try {
        const { error: dbError } = await db
          .from('health_data')
          .upsert(
            {
              user_id: uid,
              date: snapshot.date,
              steps: snapshot.steps,
              calories_active: snapshot.caloriesActive,
            },
            { onConflict: 'user_id,date' }
          );

        if (dbError) throw dbError;

        setHealthData((prev) => ({
          id: prev?.id ?? '',
          user_id: uid,
          date: snapshot.date,
          steps: snapshot.steps,
          calories_active: snapshot.caloriesActive,
          heart_rate_avg: prev?.heart_rate_avg ?? null,
          sleep_hours: prev?.sleep_hours ?? null,
          created_at: prev?.created_at ?? new Date().toISOString(),
        }));
      } catch (err) {
        console.warn('[useHealthData] saveToSupabase error:', err);
        throw err;
      }
    },
    []
  );

  return { healthData, isLoading, error, requestPermissions, syncTodayData, saveToSupabase };
}
