import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { COLORS } from '@/lib/constants';

// ─── Composant ────────────────────────────────────────────────────────────────
// S'affiche en haut de l'écran quand la connexion est absente.
// Renderisé une seule fois dans _layout.tsx (couche globale).

export function OfflineBanner() {
  const { isConnected, isLoading } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-80);

  const isOffline = !isLoading && !isConnected;

  useEffect(() => {
    translateY.value = withTiming(isOffline ? 0 : -80, { duration: 300 });
  }, [isOffline]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        animStyle,
        // Prend en compte la safe area iOS (encoche)
        { paddingTop: insets.top > 0 ? insets.top : 12 },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>📵</Text>
        <Text style={styles.text}>Pas de connexion internet</Text>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.error,
    zIndex: 9999,
    paddingBottom: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
