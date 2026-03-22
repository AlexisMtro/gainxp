import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useAuthStore } from '@/stores/authStore';

export { ErrorBoundary } from 'expo-router';

// Empêche le splash screen de se masquer avant que les assets soient prêts
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const { initialize, isInitialized, session } = useAuthStore();

  // ── Initialisation Supabase auth au démarrage ──────────────────────────────
  useEffect(() => {
    initialize();
  }, []);

  // ── Propagation erreur de police ───────────────────────────────────────────
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // ── Masquage du splash screen dès que tout est prêt ───────────────────────
  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  // ── Redirection selon l'état auth ─────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized || !fontsLoaded) return;

    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isInitialized, fontsLoaded, session]);

  // Affiche rien pendant le chargement (splash screen visible)
  if (!fontsLoaded || !isInitialized) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
      <Stack.Screen name="(auth)"  options={{ headerShown: false }} />
      <Stack.Screen name="workout/[id]"  options={{ headerShown: false }} />
      <Stack.Screen name="session/[id]"  options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
