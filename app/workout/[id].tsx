import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Détail d'un programme d'entraînement
export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-gray-400 text-sm mb-1">Programme #{id}</Text>
        <Text className="text-white text-2xl font-bold">Full Body Débutant</Text>
        <Text className="text-gray-400 text-sm mt-2">4 semaines · 3 séances/semaine</Text>
      </View>

      {/* Récompenses */}
      <View className="mx-6 flex-row gap-3 mb-4">
        <View className="flex-1 bg-background-card rounded-xl p-3 items-center">
          <Text className="text-primary font-bold text-lg">+500 XP</Text>
          <Text className="text-gray-400 text-xs">Complétion</Text>
        </View>
        <View className="flex-1 bg-background-card rounded-xl p-3 items-center">
          <Text className="text-xp font-bold text-lg">1 Badge</Text>
          <Text className="text-gray-400 text-xs">À débloquer</Text>
        </View>
      </View>

      {/* Séances */}
      <View className="mx-6">
        <Text className="text-white font-semibold mb-3">Séances</Text>
        {[1, 2, 3].map((session) => (
          <TouchableOpacity
            key={session}
            className="bg-background-card rounded-xl p-4 mb-3"
            onPress={() => router.push(`/session/${session}`)}
          >
            <Text className="text-white font-medium">Séance {session}</Text>
            <Text className="text-gray-400 text-sm mt-1">8 exercices · ~45 min</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity className="mx-6 mt-4 mb-8 bg-primary rounded-2xl py-4 items-center">
        <Text className="text-white font-bold text-base">Démarrer le programme</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
