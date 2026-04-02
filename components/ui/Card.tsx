import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  /** Titre affiché dans l'en-tête de la carte */
  title?: string;
  /** Action optionnelle en haut à droite */
  action?: { label: string; onPress: () => void };
  /** elevated → ombre + fond légèrement plus clair */
  elevated?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function Card({ children, title, action, elevated, onPress, style }: CardProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.card,
        elevated && styles.elevated,
        onPress && (pressed ? { opacity: 0.85 } : undefined),
        style,
      ]}
    >
      {(title || action) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {action && (
            <Pressable onPress={action.onPress} hitSlop={8}>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          )}
        </View>
      )}
      {children}
    </Container>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
  },
  elevated: {
    backgroundColor: COLORS.backgroundElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  actionLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
