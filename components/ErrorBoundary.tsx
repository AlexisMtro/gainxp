import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
  /** UI de remplacement personnalisé en cas d'erreur */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ─── Composant ────────────────────────────────────────────────────────────────
// Les Error Boundaries doivent obligatoirement être des class components.

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erreur non gérée :', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Quelque chose s'est mal passé</Text>
          <Text style={styles.message} numberOfLines={3}>
            {this.state.error?.message ?? 'Erreur inattendue'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  icon: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
