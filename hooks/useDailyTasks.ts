import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useGamificationStore } from '@/stores/gamificationStore';
import type { UserDailyTask } from '@/types/index';

// Le champ `task` de UserDailyTask est un champ joint (relation) et non une colonne réelle.
// Cela provoque une résolution incorrecte du type Update par le client Supabase typé.
// On caste vers SupabaseClient non-typé pour les mutations sur cette table.
const db = supabase as unknown as SupabaseClient;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseDailyTasksReturn {
  tasks: UserDailyTask[];
  isLoading: boolean;
  error: string | null;
  loadTodaysTasks: (userId: string) => Promise<void>;
  updateTaskProgress: (taskId: string, newValue: number) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDailyTasks(): UseDailyTasksReturn {
  const [tasks, setTasks] = useState<UserDailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addXP = useGamificationStore((s) => s.addXP);

  // ── Chargement des tâches du jour ─────────────────────────────────────────
  const loadTodaysTasks = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error: dbError } = await db
        .from('user_daily_tasks')
        .select('*, task:daily_tasks(*)')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;
      setTasks((data ?? []) as UserDailyTask[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(message);
      console.warn('[useDailyTasks] loadTodaysTasks error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Mise à jour de la progression (health sync, saisie manuelle) ──────────
  const updateTaskProgress = useCallback(async (taskId: string, newValue: number) => {
    // Mise à jour optimiste locale
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, current_value: newValue } : t))
    );

    try {
      const { error: dbError } = await db
        .from('user_daily_tasks')
        .update({ current_value: newValue })
        .eq('id', taskId);

      if (dbError) throw dbError;
    } catch (err) {
      console.warn('[useDailyTasks] updateTaskProgress error:', err);
    }
  }, []);

  // ── Complétion d'une tâche → accordé l'XP via gamificationStore ──────────
  const completeTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.is_completed) return;

      const completedAt = new Date().toISOString();

      // Mise à jour optimiste locale
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, is_completed: true, completed_at: completedAt, current_value: t.task.target_value }
            : t
        )
      );

      try {
        const { error: dbError } = await db
          .from('user_daily_tasks')
          .update({
            is_completed: true,
            completed_at: completedAt,
            current_value: task.task.target_value,
          })
          .eq('id', taskId);

        if (dbError) throw dbError;

        // Déclenchement du gain XP via le store gamification
        await addXP(task.task.xp_reward, `Tâche quotidienne : ${task.task.title}`);
      } catch (err) {
        console.warn('[useDailyTasks] completeTask error:', err);
        // Rollback optimiste
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, is_completed: false, completed_at: null }
              : t
          )
        );
      }
    },
    [tasks, addXP]
  );

  return { tasks, isLoading, error, loadTodaysTasks, updateTaskProgress, completeTask };
}
