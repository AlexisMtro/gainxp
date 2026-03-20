import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Écran des programmes d'entraînement
export default function WorkoutScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-white text-2xl font-bold">Programmes</Text>
        <Text className="text-gray-400 text-sm mt-1">Choisis ton entraînement</Text>
      </View>

      {/* Liste programmes placeholder */}
      <View className="px-6 gap-4">
        {['Débutant', 'Intermédiaire', 'Avancé'].map((level) => (
          <TouchableOpacity
            key={level}
            className="bg-background-card rounded-2xl p-5"
            onPress={() => router.push('/workout/1')}
          >
            <Text className="text-white font-semibold text-base">{level}</Text>
            <Text className="text-gray-400 text-sm mt-1">Programme {level.toLowerCase()}</Text>
            <View className="flex-row items-center mt-3">
              <Text className="text-primary text-sm">+150 XP</Text>
              <Text className="text-gray-600 mx-2">·</Text>
              <Text className="text-gray-400 text-sm">4 séances/semaine</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
