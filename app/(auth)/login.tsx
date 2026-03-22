import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('Email not confirmed'))       return 'Confirme ton email avant de te connecter.';
  if (message.includes('Too many requests'))         return 'Trop de tentatives. Réessaie dans quelques minutes.';
  return 'Une erreur est survenue. Réessaie plus tard.';
}

// ─── Composant champ de saisie ────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'password' | 'off';
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
}: InputFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-gray-400 text-sm mb-1 ml-1">{label}</Text>
      <TextInput
        className="bg-background-elevated text-white rounded-2xl px-4 py-4 text-base"
        placeholder={placeholder}
        placeholderTextColor="#4B5563"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);

  const { signIn, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Remplis tous les champs.');
      return;
    }

    try {
      await signIn(trimmedEmail, password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(mapAuthError(message));
    }
  };

  const isDisabled = isLoading || !email.trim() || !password;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── En-tête avec dégradé ── */}
        <LinearGradient
          colors={['#1A1040', '#0F0F1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="items-center pt-20 pb-12 px-6"
        >
          {/* Logo */}
          <View className="items-center mb-6">
            <LinearGradient
              colors={['#6C63FF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-20 h-20 rounded-3xl items-center justify-center mb-4"
              style={{ elevation: 8 }}
            >
              <Text className="text-white text-4xl font-bold">G</Text>
            </LinearGradient>
            <Text className="text-white text-4xl font-bold tracking-tight">
              Gain<Text className="text-primary">XP</Text>
            </Text>
          </View>

          <Text className="text-gray-400 text-base text-center leading-6">
            Chaque séance te rapproche{'\n'}de ta meilleure version.
          </Text>
        </LinearGradient>

        {/* ── Formulaire ── */}
        <View className="flex-1 px-6 pt-8">
          <Text className="text-white text-2xl font-bold mb-6">Connexion</Text>

          {/* Message d'erreur */}
          {error && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="ton@email.com"
            keyboardType="email-address"
            autoComplete="email"
          />

          <InputField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          {/* Bouton connexion */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isDisabled}
            activeOpacity={0.85}
            className="mt-2"
          >
            <LinearGradient
              colors={isDisabled ? ['#3D3A6B', '#3D3A6B'] : ['#6C63FF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-2xl py-4 items-center"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Se connecter</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Lien inscription */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-400 text-sm">Pas encore de compte ? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-primary font-semibold text-sm">S'inscrire</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
