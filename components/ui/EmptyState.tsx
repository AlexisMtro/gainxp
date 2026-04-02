import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Pressable style={styles.actionBtn} onPress={action.onPress}>
          <Text style={styles.actionBtnText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
