import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    // TODO: implémenter la connexion Supabase
  };

  return (
    <View className="flex-1 bg-background justify-center px-6">
      <Text className="text-white text-3xl font-bold mb-2">GainXP</Text>
      <Text className="text-gray-400 mb-8">Connecte-toi pour continuer</Text>

      {error && (
        <Text className="text-red-500 mb-4">{error}</Text>
      )}

      <TextInput
        className="bg-background-card text-white rounded-xl px-4 py-3 mb-4"
        placeholder="Email"
        placeholderTextColor="#6B7280"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        className="bg-background-card text-white rounded-xl px-4 py-3 mb-6"
        placeholder="Mot de passe"
        placeholderTextColor="#6B7280"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-primary rounded-xl py-4 items-center"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white font-bold text-base">
          {loading ? 'Connexion...' : 'Se connecter'}
        </Text>
      </TouchableOpacity>

      <Link href="/(auth)/register" className="text-center mt-6">
        <Text className="text-gray-400">
          Pas de compte ?{' '}
          <Text className="text-primary">S'inscrire</Text>
        </Text>
      </Link>
    </View>
  );
}
