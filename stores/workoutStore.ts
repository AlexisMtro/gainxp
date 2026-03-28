import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Workout, MuscleGroup } from '@/types/index';

// Les requêtes impliquent des jointures imbriquées (workout_exercises → exercises → workout_sets)
// non supportées par le typage généré — on utilise le client non-typé.
const db = supabase as unknown as SupabaseClient;

// Sélection complète : programme + exercices + séries
const WORKOUT_SELECT = `
  *,
  exercises:workout_exercises(
    *,
    exercise:exercises(*),
    sets:workout_sets(*)
  )
` as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutDraft = Omit<Workout, 'id' | 'created_at' | 'exercises'>;

interface WorkoutState {
  publicWorkouts: Workout[];
  myWorkouts: Workout[];
  selectedWorkout: Workout | null;
  isLoading: boolean;
  error: string | null;
}

interface WorkoutActions {
  loadPublicWorkouts: (filter?: MuscleGroup) => Promise<void>;
  loadMyWorkouts: (userId: string) => Promise<void>;
  loadWorkoutById: (workoutId: string) => Promise<void>;
  createWorkout: (draft: WorkoutDraft, userId: string) => Promise<Workout | null>;
  updateWorkout: (workoutId: string, data: Partial<WorkoutDraft>) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;
}

type WorkoutStore = WorkoutState & WorkoutActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  publicWorkouts: [],
  myWorkouts: [],
  selectedWorkout: null,
  isLoading: false,
  error: null,

  // ── Programmes publics (avec filtre groupe musculaire optionnel) ──────────
  loadPublicWorkouts: async (filter?: MuscleGroup) => {
    set({ isLoading: true, error: null });
    try {
      let query = db
        .from('workouts')
        .select(WORKOUT_SELECT)
        .order('created_at', { ascending: false });

      if (filter) {
        // Filtre sur le tableau PostgreSQL muscle_groups
        query = query.contains('muscle_groups', [filter]);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw dbError;

      set({ publicWorkouts: (data ?? []) as Workout[] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      set({ error: message });
      console.warn('[workoutStore] loadPublicWorkouts error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Programmes créés par l'utilisateur ────────────────────────────────────
  loadMyWorkouts: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error: dbError } = await db
        .from('workouts')
        .select(WORKOUT_SELECT)
        .eq('creator', userId)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      set({ myWorkouts: (data ?? []) as Workout[] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      set({ error: message });
      console.warn('[workoutStore] loadMyWorkouts error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Détail d'un programme — vérifie le cache avant d'appeler Supabase ────
  loadWorkoutById: async (workoutId: string) => {
    const cached =
      get().publicWorkouts.find((w) => w.id === workoutId) ??
      get().myWorkouts.find((w) => w.id === workoutId);

    if (cached) {
      set({ selectedWorkout: cached });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error: dbError } = await db
        .from('workouts')
        .select(WORKOUT_SELECT)
        .eq('id', workoutId)
        .single();

      if (dbError) throw dbError;
      set({ selectedWorkout: data as Workout });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Programme introuvable';
      set({ error: message });
      console.warn('[workoutStore] loadWorkoutById error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Création d'un programme ───────────────────────────────────────────────
  createWorkout: async (draft: WorkoutDraft, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error: dbError } = await db
        .from('workouts')
        .insert({ ...draft, creator: userId })
        .select(WORKOUT_SELECT)
        .single();

      if (dbError) throw dbError;

      const created = data as Workout;
      set((s) => ({ myWorkouts: [created, ...s.myWorkouts] }));
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de création';
      set({ error: message });
      console.warn('[workoutStore] createWorkout error:', err);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Mise à jour d'un programme ────────────────────────────────────────────
  updateWorkout: async (workoutId: string, data: Partial<WorkoutDraft>) => {
    try {
      const { error: dbError } = await db
        .from('workouts')
        .update(data)
        .eq('id', workoutId);

      if (dbError) throw dbError;

      const patch = (list: Workout[]) =>
        list.map((w) => (w.id === workoutId ? { ...w, ...data } : w));

      set((s) => ({
        publicWorkouts: patch(s.publicWorkouts),
        myWorkouts: patch(s.myWorkouts),
        selectedWorkout:
          s.selectedWorkout?.id === workoutId
            ? { ...s.selectedWorkout, ...data }
            : s.selectedWorkout,
      }));
    } catch (err) {
      console.warn('[workoutStore] updateWorkout error:', err);
      throw err;
    }
  },

  // ── Suppression d'un programme ────────────────────────────────────────────
  deleteWorkout: async (workoutId: string) => {
    try {
      const { error: dbError } = await db
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (dbError) throw dbError;

      set((s) => ({
        publicWorkouts: s.publicWorkouts.filter((w) => w.id !== workoutId),
        myWorkouts: s.myWorkouts.filter((w) => w.id !== workoutId),
        selectedWorkout:
          s.selectedWorkout?.id === workoutId ? null : s.selectedWorkout,
      }));
    } catch (err) {
      console.warn('[workoutStore] deleteWorkout error:', err);
      throw err;
    }
  },
}));
