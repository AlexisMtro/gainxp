import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { getLevelFromXP } from '@/lib/utils';
import type { UserProfile, UserBadge } from '@/types/index';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XPGain {
  id: string;         // UUID pour key React
  amount: number;
  reason: string;
  timestamp: number;  // Date.now()
}

export interface PendingLevelUp {
  from: number;
  to: number;
  newName: string;
}

interface GamificationState {
  profile: UserProfile | null;
  recentXpGains: XPGain[];
  pendingLevelUp: PendingLevelUp | null;
  earnedBadges: UserBadge[];
  isLoading: boolean;
}

interface GamificationActions {
  loadProfile: (userId: string) => Promise<void>;
  addXP: (amount: number, reason: string) => Promise<void>;
  checkLevelUp: (previousLevel: number) => void;
  loadBadges: (userId: string) => Promise<void>;
  dismissLevelUp: () => void;
  removeXPGain: (id: string) => void;
}

type GamificationStore = GamificationState & GamificationActions;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  profile: null,
  recentXpGains: [],
  pendingLevelUp: null,
  earnedBadges: [],
  isLoading: false,

  // ── loadProfile : récupère le profil utilisateur depuis Supabase ──────────
  loadProfile: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile: data as UserProfile });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── addXP : appelle le RPC Supabase puis déclenche checkLevelUp ───────────
  addXP: async (amount: number, reason: string) => {
    const profile = get().profile;
    if (!profile) return;

    const previousLevel = profile.level;

    // Ajout local optimiste de la notification flottante
    const gain: XPGain = {
      id: generateId(),
      amount,
      reason,
      timestamp: Date.now(),
    };
    set((s) => ({ recentXpGains: [...s.recentXpGains, gain] }));

    try {
      // Appel RPC PostgreSQL défini dans le schéma Supabase
      const { error } = await supabase.rpc('add_xp', {
        p_user_id: profile.id,
        p_amount: amount,
      });
      if (error) throw error;

      // Rechargement du profil mis à jour (niveau, XP)
      await get().loadProfile(profile.id);

      // Vérification du passage de niveau
      get().checkLevelUp(previousLevel);
    } catch (err) {
      console.warn('[gamificationStore] addXP error:', err);
      // En cas d'erreur, on retire la notification optimiste
      set((s) => ({
        recentXpGains: s.recentXpGains.filter((g) => g.id !== gain.id),
      }));
    }
  },

  // ── checkLevelUp : compare l'ancien niveau avec le nouveau ───────────────
  checkLevelUp: (previousLevel: number) => {
    const { profile } = get();
    if (!profile) return;

    const newLevel = getLevelFromXP(profile.total_xp);
    if (newLevel > previousLevel) {
      // Import dynamique pour éviter la dépendance circulaire
      const { getLevelName } = require('@/lib/utils') as typeof import('@/lib/utils');
      set({
        pendingLevelUp: {
          from: previousLevel,
          to: newLevel,
          newName: getLevelName(newLevel),
        },
      });
    }
  },

  // ── loadBadges : charge les badges obtenus par l'utilisateur ─────────────
  loadBadges: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.warn('[gamificationStore] loadBadges error:', error.message);
      return;
    }
    set({ earnedBadges: (data ?? []) as UserBadge[] });
  },

  // ── dismissLevelUp : ferme le modal de passage de niveau ─────────────────
  dismissLevelUp: () => set({ pendingLevelUp: null }),

  // ── removeXPGain : supprime une notification flottante après animation ───
  removeXPGain: (id: string) =>
    set((s) => ({
      recentXpGains: s.recentXpGains.filter((g) => g.id !== id),
    })),
}));
