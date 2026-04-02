import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** Icône texte/emoji à gauche du label */
  iconLeft?: string;
  fullWidth?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: COLORS.primary,            text: '#fff'                       },
  secondary: { bg: `${COLORS.primary}20`,     text: COLORS.primaryLight, border: `${COLORS.primary}40` },
  ghost:     { bg: 'transparent',             text: COLORS.textSecondary, border: COLORS.backgroundElevated },
  danger:    { bg: `${COLORS.error}20`,       text: COLORS.error,        border: `${COLORS.error}40`       },
};

const SIZE_STYLES: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 8,  paddingHorizontal: 14, fontSize: 13 },
  md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 15 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function Button({
  label, onPress,
  variant = 'primary',
  size    = 'md',
  loading  = false,
  disabled = false,
  iconLeft,
  fullWidth = false,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.content}>
          {iconLeft ? (
            <Text style={[styles.icon, { fontSize: s.fontSize }]}>{iconLeft}</Text>
          ) : null}
          <Text style={[styles.label, { color: v.text, fontSize: s.fontSize }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    lineHeight: 20,
  },
  label: {
    fontWeight: '700',
  },
});
