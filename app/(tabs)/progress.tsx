import { View, Text, ScrollView } from 'react-native';

// Écran de progression — graphiques, historique, stats
export default function ProgressScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-white text-2xl font-bold">Progression</Text>
        <Text className="text-gray-400 text-sm mt-1">Tes performances au fil du temps</Text>
      </View>

      {/* Graphique XP placeholder */}
      <View className="mx-6 bg-background-card rounded-2xl p-5 mb-4">
        <Text className="text-white font-semibold mb-3">XP par semaine</Text>
        <View className="h-40 items-center justify-center">
          <Text className="text-gray-500 text-sm">Aucune donnée disponible</Text>
        </View>
      </View>

      {/* Mesures corporelles */}
      <View className="mx-6 bg-background-card rounded-2xl p-5 mb-4">
        <Text className="text-white font-semibold mb-3">Mesures</Text>
        <Text className="text-gray-500 text-sm">Ajoute tes premières mesures</Text>
      </View>

      {/* Records personnels */}
      <View className="mx-6 bg-background-card rounded-2xl p-5">
        <Text className="text-white font-semibold mb-3">Records personnels</Text>
        <Text className="text-gray-500 text-sm">Aucun record pour le moment</Text>
      </View>
    </ScrollView>
  );
}
