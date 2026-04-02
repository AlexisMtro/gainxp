import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'xp';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** Durée d'affichage en ms (défaut : 3000) */
  duration: number;
}

interface ToastStore {
  queue: ToastItem[];
  show:    (type: ToastType, message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useToastStore = create<ToastStore>((set) => ({
  queue: [],

  show: (type, message, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ queue: [...s.queue, { id, type, message, duration }] }));
  },

  dismiss: (id) => {
    set((s) => ({ queue: s.queue.filter((t) => t.id !== id) }));
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Raccourcis pour éviter la répétition dans les composants

export const toast = {
  success: (msg: string, duration?: number) =>
    useToastStore.getState().show('success', msg, duration),
  error:   (msg: string, duration?: number) =>
    useToastStore.getState().show('error', msg, duration),
  info:    (msg: string, duration?: number) =>
    useToastStore.getState().show('info', msg, duration),
  xp:      (msg: string, duration?: number) =>
    useToastStore.getState().show('xp', msg, duration),
};
