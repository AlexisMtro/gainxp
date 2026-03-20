// ─── Utilisateur ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  level: number;
  streak: number;
  created_at: string;
}

// ─── Programmes ─────────────────────────────────────────────────────────────

export interface WorkoutProgram {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  duration_weeks: number;
  xp_reward: number;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  program_id: string;
  name: string;
  order_index: number;
  estimated_duration_min: number;
  exercises: SessionExercise[];
}

// ─── Exercices ───────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  muscle_groups: MuscleGroup[];
  equipment: string | null;
  description: string;
  video_url: string | null;
}

export interface SessionExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: number | null;
  duration_sec: number | null;
  rest_sec: number;
  order_index: number;
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'legs'
  | 'glutes'
  | 'cardio';

// ─── Séances complétées ──────────────────────────────────────────────────────

export interface CompletedSession {
  id: string;
  user_id: string;
  session_id: string;
  xp_earned: number;
  duration_min: number;
  completed_at: string;
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: 'sessions_count' | 'streak' | 'level' | 'program_complete';
  condition_value: number;
}

export interface UserBadge {
  badge: Badge;
  earned_at: string;
}

// ─── Mesures corporelles ──────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  user_id: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  measured_at: string;
}

// ─── Database (Supabase généré) ───────────────────────────────────────────────
// Squelette — à remplacer par le type généré via `supabase gen types typescript`

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>;
      };
      workout_programs: {
        Row: WorkoutProgram;
        Insert: Omit<WorkoutProgram, 'id' | 'created_at'>;
        Update: Partial<Omit<WorkoutProgram, 'id' | 'created_at'>>;
      };
      completed_sessions: {
        Row: CompletedSession;
        Insert: Omit<CompletedSession, 'id'>;
        Update: Partial<Omit<CompletedSession, 'id' | 'user_id'>>;
      };
      body_measurements: {
        Row: BodyMeasurement;
        Insert: Omit<BodyMeasurement, 'id'>;
        Update: Partial<Omit<BodyMeasurement, 'id' | 'user_id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
