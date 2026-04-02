import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/toastStore';
import type { ToastItem, ToastType } from '@/stores/toastStore';
import { COLORS } from '@/lib/constants';

// ─── Config visuelle par type ─────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: `${COLORS.success}15`,  icon: '✅', border: `${COLORS.success}40` },
  error:   { bg: `${COLORS.error}15`,    icon: '❌', border: `${COLORS.error}40`   },
  info:    { bg: `${COLORS.primary}15`,  icon: 'ℹ️', border: `${COLORS.primary}40`  },
  xp:      { bg: `${COLORS.xp}15`,       icon: '✦',  border: `${COLORS.xp}40`       },
};

// ─── Composant individuel ─────────────────────────────────────────────────────

function ToastEntry({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const translateY = useSharedValue(-100);
  const opacity    = useSharedValue(0);
  const config = TOAST_CONFIG[toast.type];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dismiss() {
    // Animation de sortie vers le haut
    translateY.value = withTiming(-100, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onDismiss)(toast.id);
    });
  }

  useEffect(() => {
    // Entrée
    translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    opacity.value    = withTiming(1, { duration: 200 });

    // Auto-dismiss
    timer.current = setTimeout(dismiss, toast.duration);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.toast, animStyle, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={styles.toastIcon}>{config.icon}</Text>
      <Text style={styles.toastMessage} numberOfLines={2}>{toast.message}</Text>
      <Pressable onPress={dismiss} hitSlop={8}>
        <Text style={styles.closeBtn}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Conteneur global ─────────────────────────────────────────────────────────
// À placer une seule fois dans _layout.tsx (au-dessus de tout le contenu).

export function Toast() {
  const queue   = useToastStore((s) => s.queue);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets  = useSafeAreaInsets();

  if (queue.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      {queue.map((t) => (
        <ToastEntry key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10000,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIcon: {
    fontSize: 16,
  },
  toastMessage: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeBtn: {
    color: COLORS.textMuted,
    fontSize: 14,
    padding: 2,
  },
});
