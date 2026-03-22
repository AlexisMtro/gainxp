import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types/index';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'username' | 'avatar_url' | 'weight_kg' | 'height_cm'>>) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set, get) => ({
  // État initial
  user: null,
  profile: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  // ── initialize : récupère la session existante et écoute les changements ──
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      set({ session, user: session.user });
      await get().fetchProfile(session.user.id);
    }

    // Écoute des changements d'état auth (token refresh, déconnexion, etc.)
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        set({ session: newSession, user: newSession.user });
        await get().fetchProfile(newSession.user.id);
      } else {
        set({ session: null, user: null, profile: null });
      }
    });

    set({ isInitialized: true });
  },

  // ── fetchProfile : charge le profil depuis user_profiles ─────────────────
  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('[authStore] fetchProfile error:', error.message);
      return;
    }

    // Mapping vers le type UserProfile (id sert de user_id dans le schéma SQL)
    set({
      profile: {
        ...data,
        user_id: data.id,
        last_active_date: data.last_session_date ?? null,
      } as UserProfile,
    });
  },

  // ── signIn ────────────────────────────────────────────────────────────────
  signIn: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (!data.session || !data.user) throw new Error('Connexion échouée');

      set({ session: data.session, user: data.user });
      await get().fetchProfile(data.user.id);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── signUp ────────────────────────────────────────────────────────────────
  signUp: async (email: string, password: string, username: string) => {
    set({ isLoading: true });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }, // transmis au trigger on_auth_user_created
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Inscription échouée');

      // Le trigger PostgreSQL crée automatiquement le profil
      // Si la confirmation email est désactivée, la session est disponible
      if (data.session) {
        set({ session: data.session, user: data.user });
        await get().fetchProfile(data.user.id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // ── signOut ───────────────────────────────────────────────────────────────
  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, session: null });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── updateProfile ─────────────────────────────────────────────────────────
  updateProfile: async (data) => {
    const userId = get().user?.id;
    if (!userId) throw new Error('Non authentifié');

    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // Mise à jour locale optimiste
      set((state) => ({
        profile: state.profile ? { ...state.profile, ...data } : null,
      }));
    } finally {
      set({ isLoading: false });
    }
  },
}));
