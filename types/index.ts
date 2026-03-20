// ─── Utilisateur ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  current_xp: number;   // XP dans le niveau actuel
  total_xp: number;     // XP cumulé depuis le début
  streak_days: number;  // Jours consécutifs d'activité
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Niveaux ─────────────────────────────────────────────────────────────────

export interface Level {
  level: number;
  name: string;         // ex: "Novice", "Guerrier", "Légende"
  xp_required: number;  // XP total nécessaire pour atteindre ce niveau
  badge_color: string;  // Couleur hex du badge de niveau
  icon: string;         // Nom de l'icône (ex: "shield", "flame", "crown")
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export type BadgeConditionType =
  | 'sessions_count'   // Nombre de séances complétées
  | 'streak_days'      // Jours de streak consécutifs
  | 'level_reached'    // Niveau atteint
  | 'program_complete' // Programme terminé
  | 'total_xp'         // XP total accumulé
  | 'steps_daily'      // Nombre de pas en une journée
  | 'calories_burned'; // Calories brûlées en une journée

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: BadgeConditionType;
  condition_value: number;
  xp_reward: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge: Badge;
  earned_at: string;
}

// ─── Exercices ────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'full_body';

/** Difficulté de 1 (débutant) à 3 (avancé) */
export type Difficulty = 1 | 2 | 3;

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'resistance_band'
  | 'pull_up_bar';

export interface Exercise {
  id: string;
  name: string;
  muscle_groups: MuscleGroup[];
  equipment: Equipment | null;
  difficulty: Difficulty;
  description: string;
  instructions: string[];
  video_url: string | null;
  created_at: string;
}

// ─── Programmes ───────────────────────────────────────────────────────────────

export interface Workout {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  sessions_per_week: number;
  duration_weeks: number;
  xp_reward: number;          // XP gagné à la complétion du programme
  target_muscle_groups: MuscleGroup[];
  exercises: WorkoutExercise[];
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise: Exercise;
  order_index: number;
  sets: WorkoutSet[];
  rest_sec: number;
  notes: string | null;
}

export interface WorkoutSet {
  set_number: number;
  target_reps: number | null;         // null si basé sur la durée
  target_weight_kg: number | null;    // null si bodyweight
  target_duration_sec: number | null; // null si basé sur les reps
}

// ─── Séances ─────────────────────────────────────────────────────────────────

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface Session {
  id: string;
  user_id: string;
  workout_id: string;
  status: SessionStatus;
  xp_earned: number;
  duration_sec: number;     // Durée réelle de la séance
  completed_sets: CompletedSet[];
  started_at: string;
  completed_at: string | null;
}

export interface CompletedSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight_kg: number | null;
  actual_duration_sec: number | null;
  completed_at: string;
}

// ─── Tâches quotidiennes ──────────────────────────────────────────────────────

export type DailyTaskType =
  | 'steps'    // Nombre de pas
  | 'session'  // Compléter une séance
  | 'calories' // Calories actives brûlées
  | 'streak';  // Maintenir le streak

export interface DailyTask {
  id: string;
  task_type: DailyTaskType;
  title: string;
  description: string;
  target_value: number;  // ex: 10000 pour steps, 1 pour session
  xp_reward: number;
}

export interface UserDailyTask {
  id: string;
  user_id: string;
  task: DailyTask;
  date: string;          // Format ISO "YYYY-MM-DD"
  current_value: number; // Progression actuelle
  is_completed: boolean;
  completed_at: string | null;
}

// ─── Données de santé ─────────────────────────────────────────────────────────

export interface HealthData {
  id: string;
  user_id: string;
  date: string;                    // Format ISO "YYYY-MM-DD"
  steps: number | null;
  calories_active: number | null;  // Calories actives (hors métabolisme de base)
  heart_rate_avg: number | null;   // BPM moyen sur la journée
  sleep_hours: number | null;
  created_at: string;
}

// ─── Mesures corporelles ─────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  user_id: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  measured_at: string;
}

// ─── Database (squelette Supabase) ───────────────────────────────────────────
// À remplacer par le type généré via : `supabase gen types typescript`

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at'>>;
      };
      workouts: {
        Row: Workout;
        Insert: Omit<Workout, 'id' | 'created_at'>;
        Update: Partial<Omit<Workout, 'id' | 'created_at'>>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id'>;
        Update: Partial<Omit<Session, 'id' | 'user_id'>>;
      };
      completed_sets: {
        Row: CompletedSet;
        Insert: Omit<CompletedSet, 'id'>;
        Update: Partial<Omit<CompletedSet, 'id' | 'session_id'>>;
      };
      badges: {
        Row: Badge;
        Insert: Omit<Badge, 'id' | 'created_at'>;
        Update: Partial<Omit<Badge, 'id' | 'created_at'>>;
      };
      user_badges: {
        Row: UserBadge;
        Insert: Omit<UserBadge, 'id'>;
        Update: never;
      };
      daily_tasks: {
        Row: DailyTask;
        Insert: Omit<DailyTask, 'id'>;
        Update: Partial<Omit<DailyTask, 'id'>>;
      };
      user_daily_tasks: {
        Row: UserDailyTask;
        Insert: Omit<UserDailyTask, 'id'>;
        Update: Partial<Omit<UserDailyTask, 'id' | 'user_id' | 'date'>>;
      };
      health_data: {
        Row: HealthData;
        Insert: Omit<HealthData, 'id' | 'created_at'>;
        Update: Partial<Omit<HealthData, 'id' | 'user_id' | 'created_at'>>;
      };
      body_measurements: {
        Row: BodyMeasurement;
        Insert: Omit<BodyMeasurement, 'id'>;
        Update: Partial<Omit<BodyMeasurement, 'id' | 'user_id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      muscle_group: MuscleGroup;
      daily_task_type: DailyTaskType;
      session_status: SessionStatus;
      equipment: Equipment;
    };
  };
}
