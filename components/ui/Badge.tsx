import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'xp';
export type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Icône texte/emoji à gauche */
  icon?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: COLORS.backgroundElevated, text: COLORS.textSecondary },
  primary: { bg: `${COLORS.primary}25`,     text: COLORS.primaryLight  },
  success: { bg: `${COLORS.success}20`,     text: COLORS.success       },
  warning: { bg: `${COLORS.warning}20`,     text: COLORS.warning       },
  error:   { bg: `${COLORS.error}20`,       text: COLORS.error         },
  xp:      { bg: `${COLORS.xp}20`,          text: COLORS.xp            },
};

const SIZE_STYLES: Record<BadgeSize, { px: number; py: number; fs: number; br: number }> = {
  sm: { px: 7,  py: 2, fs: 11, br: 6  },
  md: { px: 10, py: 4, fs: 13, br: 8  },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function Badge({ label, variant = 'default', size = 'md', icon }: BadgeProps) {
  const c = VARIANT_COLORS[variant];
  const s = SIZE_STYLES[size];

  return (
    <View style={[
      styles.base,
      {
        backgroundColor: c.bg,
        paddingHorizontal: s.px,
        paddingVertical: s.py,
        borderRadius: s.br,
      },
    ]}>
      {icon ? <Text style={[styles.icon, { fontSize: s.fs }]}>{icon}</Text> : null}
      <Text style={[styles.label, { color: c.text, fontSize: s.fs }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  icon: {
    lineHeight: 16,
  },
  label: {
    fontWeight: '600',
  },
});
