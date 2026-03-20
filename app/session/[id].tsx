import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// Écran de séance en cours — exercices, sets, repos
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-gray-400 text-sm mb-1">Séance #{id}</Text>
        <Text className="text-white text-2xl font-bold">En cours...</Text>
      </View>

      {/* Exercice actif */}
      <View className="mx-6 bg-background-card rounded-2xl p-5 mb-4">
        <Text className="text-gray-400 text-sm mb-1">Exercice 1 / 8</Text>
        <Text className="text-white text-xl font-bold mb-4">Squat</Text>

        {/* Sets */}
        <View className="gap-2">
          {[1, 2, 3].map((set) => (
            <View key={set} className="flex-row items-center bg-background-elevated rounded-xl px-4 py-3">
              <Text className="text-gray-400 w-8">S{set}</Text>
              <Text className="text-white flex-1">3 × 10</Text>
              <TouchableOpacity className="bg-primary rounded-lg px-3 py-1">
                <Text className="text-white text-sm">Fait</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* XP gagné */}
      <View className="mx-6 bg-background-card rounded-2xl p-4 flex-row items-center justify-between mb-4">
        <Text className="text-gray-400">XP gagné</Text>
        <Text className="text-primary font-bold text-lg">+75 XP</Text>
      </View>

      <TouchableOpacity className="mx-6 mb-8 bg-accent rounded-2xl py-4 items-center">
        <Text className="text-background font-bold text-base">Terminer la séance</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
