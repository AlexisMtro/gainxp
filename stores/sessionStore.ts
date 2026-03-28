import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useWorkoutStore } from './workoutStore';
import { useGamificationStore } from './gamificationStore';
import type { Workout, Session, CompletedSet, WorkoutExercise } from '@/types/index';
import { XP_REWARDS } from '@/lib/constants';

// Jointures complexes → client non-typé
const db = supabase as unknown as SupabaseClient;

// ─── Timers module-level (survivent aux re-renders Zustand) ───────────────────

let _sessionInterval: ReturnType<typeof setInterval> | null = null;
let _restInterval:    ReturnType<typeof setInterval> | null = null;

function clearSessionInterval() {
  if (_sessionInterval !== null) { clearInterval(_sessionInterval); _sessionInterval = null; }
}
function clearRestInterval() {
  if (_restInterval !== null) { clearInterval(_restInterval); _restInterval = null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionSummary {
  workoutId:     string;
  workoutName:   string;
  duration:      number;        // secondes
  xpEarned:      number;
  xpBefore:      number;        // total_xp avant la séance
  levelBefore:   number;
  completedSets: CompletedSet[];
  exercises:     WorkoutExercise[];  // exercices triés pour le récap
}

interface SessionState {
  workout:               Workout | null;
  currentSession:        Session | null;
  currentExerciseIndex:  number;
  currentSetIndex:       number;
  completedSets:         CompletedSet[];
  restTimer:             number;   // secondes restantes dans le repos
  isResting:             boolean;
  sessionTimer:          number;   // secondes écoulées depuis le début
  isPaused:              boolean;
  isLoading:             boolean;
  error:                 string | null;
  // Snapshot de départ pour le récap
  xpAtStart:             number;
  levelAtStart:          number;
  // Résumé de la dernière séance complétée (persiste après reset)
  lastSummary:           SessionSummary | null;
}

interface SessionActions {
  startSession:    (workoutId: string, userId: string) => Promise<void>;
  completeSet:     (reps: number, weightKg: number | null) => Promise<void>;
  startRest:       () => void;
  skipRest:        () => void;
  adjustRestTimer: (delta: number) => void;
  nextExercise:    () => void;
  prevExercise:    () => void;
  pauseSession:    () => void;
  completeSession: () => Promise<void>;
  abandonSession:  () => Promise<void>;
  reset:           () => void;
  clearSummary:    () => void;
}

type SessionStore = SessionState & SessionActions;

// ─── État initial ─────────────────────────────────────────────────────────────

const INITIAL_STATE: SessionState = {
  workout:              null,
  currentSession:       null,
  currentExerciseIndex: 0,
  currentSetIndex:      0,
  completedSets:        [],
  restTimer:            0,
  isResting:            false,
  sessionTimer:         0,
  isPaused:             false,
  isLoading:            false,
  error:                null,
  xpAtStart:            0,
  levelAtStart:         1,
  lastSummary:          null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── Démarrage d'une séance ────────────────────────────────────────────────
  startSession: async (workoutId: string, userId: string) => {
    // Reprend la séance si elle est déjà active pour ce programme
    const existing = get().currentSession;
    if (existing && existing.workout_id === workoutId) return;

    set({ isLoading: true, error: null });
    try {
      // Charge le programme depuis le workoutStore (ou le cache)
      let workout = useWorkoutStore.getState().selectedWorkout;
      if (!workout || workout.id !== workoutId) {
        await useWorkoutStore.getState().loadWorkoutById(workoutId);
        workout = useWorkoutStore.getState().selectedWorkout;
      }
      if (!workout) throw new Error('Programme introuvable');

      // Crée la session en base
      const { data, error: dbError } = await db
        .from('sessions')
        .insert({
          user_id:     userId,
          workout_id:  workoutId,
          status:      'in_progress',
          xp_earned:   0,
          duration_sec: 0,
          started_at:  new Date().toISOString(),
        })
        .select('*')
        .single();

      if (dbError) throw dbError;

      // Trie les exercices par order_index pour un affichage cohérent
      const sortedWorkout: Workout = {
        ...workout,
        exercises: [...workout.exercises].sort((a, b) => a.order_index - b.order_index),
      };

      // Snapshot XP/niveau avant la séance pour le calcul du récap
      const gamProfile = useGamificationStore.getState().profile;

      set({
        workout:              sortedWorkout,
        currentSession:       data as Session,
        currentExerciseIndex: 0,
        currentSetIndex:      0,
        completedSets:        [],
        restTimer:            0,
        isResting:            false,
        sessionTimer:         0,
        isPaused:             false,
        xpAtStart:            gamProfile?.total_xp  ?? 0,
        levelAtStart:         gamProfile?.level      ?? 1,
      });

      // Lance le chrono global (tique seulement si pas en pause)
      clearSessionInterval();
      _sessionInterval = setInterval(() => {
        if (!get().isPaused) {
          set((s) => ({ sessionTimer: s.sessionTimer + 1 }));
        }
      }, 1000);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de démarrage';
      set({ error: message });
      console.warn('[sessionStore] startSession error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Complétion d'une série ────────────────────────────────────────────────
  completeSet: async (reps: number, weightKg: number | null) => {
    const { currentSession, currentExerciseIndex, currentSetIndex, workout } = get();
    if (!currentSession || !workout) return;

    const currentExercise = workout.exercises[currentExerciseIndex];
    if (!currentExercise) return;

    const newSet = {
      session_id:          currentSession.id,
      exercise_id:         currentExercise.exercise.id,
      set_number:          currentSetIndex + 1,
      actual_reps:         reps,
      actual_weight_kg:    weightKg,
      actual_duration_sec: null,
      completed_at:        new Date().toISOString(),
    };

    try {
      const { data, error: dbError } = await db
        .from('completed_sets')
        .insert(newSet)
        .select('*')
        .single();

      if (dbError) throw dbError;
      set((s) => ({ completedSets: [...s.completedSets, data as CompletedSet] }));
    } catch (err) {
      console.warn('[sessionStore] completeSet error (DB):', err);
      // Ajout optimiste local même en cas d'erreur réseau
      set((s) => ({
        completedSets: [...s.completedSets, { ...newSet, id: `local-${Date.now()}` } as CompletedSet],
      }));
    }

    // Avance au set suivant si l'exercice n'est pas terminé
    const totalSets = currentExercise.sets.length;
    if (currentSetIndex + 1 < totalSets) {
      set({ currentSetIndex: currentSetIndex + 1 });
    }

    // Lance le repos si configuré
    if (currentExercise.rest_sec > 0) {
      get().startRest();
    }
  },

  // ── Démarrage du timer de repos ───────────────────────────────────────────
  startRest: () => {
    const { workout, currentExerciseIndex } = get();
    if (!workout) return;

    const exercise = workout.exercises[currentExerciseIndex];
    const restDuration = exercise?.rest_sec ?? 60;

    set({ isResting: true, restTimer: restDuration });

    clearRestInterval();
    _restInterval = setInterval(() => {
      if (get().isPaused) return;

      const { restTimer } = get();
      if (restTimer <= 1) {
        get().skipRest();
      } else {
        set({ restTimer: restTimer - 1 });
      }
    }, 1000);
  },

  // ── Fin du repos (auto ou manuelle) ──────────────────────────────────────
  skipRest: () => {
    clearRestInterval();
    set({ isResting: false, restTimer: 0 });
  },

  // ── Ajustement manuel du timer de repos ──────────────────────────────────
  adjustRestTimer: (delta: number) => {
    set((s) => ({ restTimer: Math.max(0, s.restTimer + delta) }));
  },

  // ── Navigation entre exercices ────────────────────────────────────────────
  nextExercise: () => {
    const { workout, currentExerciseIndex } = get();
    if (!workout) return;
    if (currentExerciseIndex + 1 >= workout.exercises.length) return;

    get().skipRest();
    set({ currentExerciseIndex: currentExerciseIndex + 1, currentSetIndex: 0 });
  },

  prevExercise: () => {
    const { currentExerciseIndex } = get();
    if (currentExerciseIndex <= 0) return;

    get().skipRest();
    set({ currentExerciseIndex: currentExerciseIndex - 1, currentSetIndex: 0 });
  },

  // ── Pause / reprise ───────────────────────────────────────────────────────
  pauseSession: () => {
    set((s) => ({ isPaused: !s.isPaused }));
  },

  // ── Complétion de la séance ───────────────────────────────────────────────
  completeSession: async () => {
    const { currentSession, completedSets, sessionTimer, workout, xpAtStart, levelAtStart } = get();
    if (!currentSession) return;

    clearSessionInterval();
    clearRestInterval();

    const totalXP =
      XP_REWARDS.COMPLETE_SESSION + completedSets.length * XP_REWARDS.COMPLETE_SET;

    // Construit le résumé AVANT le reset (accès au state courant)
    const summary: SessionSummary = {
      workoutId:     workout?.id     ?? '',
      workoutName:   workout?.name   ?? '',
      duration:      sessionTimer,
      xpEarned:      totalXP,
      xpBefore:      xpAtStart,
      levelBefore:   levelAtStart,
      completedSets: [...completedSets],
      exercises:     workout?.exercises ?? [],
    };

    try {
      // Le trigger PostgreSQL `session_completed_trigger` met à jour le profil
      // et appelle add_xp automatiquement quand status → 'completed'.
      const { error: dbError } = await db
        .from('sessions')
        .update({
          status:       'completed',
          duration_sec: sessionTimer,
          xp_earned:    totalXP,
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentSession.id);

      if (dbError) throw dbError;

      // Recharge le profil pour mettre à jour XP/niveau (après le trigger)
      await useGamificationStore.getState().loadProfile(currentSession.user_id);
    } catch (err) {
      console.warn('[sessionStore] completeSession error:', err);
      throw err;
    }

    // Réinitialise la séance active tout en conservant le résumé
    set({ ...INITIAL_STATE, lastSummary: summary });
  },

  // ── Abandon de la séance ──────────────────────────────────────────────────
  abandonSession: async () => {
    const { currentSession, sessionTimer } = get();
    clearSessionInterval();
    clearRestInterval();

    if (currentSession) {
      try {
        await db
          .from('sessions')
          .update({
            status:       'abandoned',
            duration_sec: sessionTimer,
            completed_at: new Date().toISOString(),
          })
          .eq('id', currentSession.id);
      } catch (err) {
        console.warn('[sessionStore] abandonSession error:', err);
      }
    }

    set({ ...INITIAL_STATE });
  },

  // ── Réinitialisation propre (ex. démontage forcé) ─────────────────────────
  reset: () => {
    clearSessionInterval();
    clearRestInterval();
    set({ ...INITIAL_STATE });
  },

  // ── Efface le résumé après consultation ───────────────────────────────────
  clearSummary: () => set({ lastSummary: null }),
}));
