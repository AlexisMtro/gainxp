import { View, Text, ScrollView } from 'react-native';

// Dashboard principal — XP, niveau, résumé des activités récentes
export default function DashboardScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-gray-400 text-sm">Bienvenue,</Text>
        <Text className="text-white text-2xl font-bold">Joueur</Text>
      </View>

      {/* Carte XP / Niveau */}
      <View className="mx-6 bg-background-card rounded-2xl p-5 mb-4">
        <Text className="text-gray-400 text-sm mb-1">Niveau</Text>
        <Text className="text-white text-4xl font-bold">1</Text>
        <View className="bg-background-elevated rounded-full h-2 mt-3">
          <View className="bg-primary rounded-full h-2 w-1/4" />
        </View>
        <Text className="text-gray-400 text-xs mt-1">250 / 1000 XP</Text>
      </View>

      {/* Stats rapides */}
      <View className="flex-row mx-6 gap-3 mb-4">
        <View className="flex-1 bg-background-card rounded-2xl p-4">
          <Text className="text-xp text-2xl font-bold">0</Text>
          <Text className="text-gray-400 text-xs mt-1">Séances</Text>
        </View>
        <View className="flex-1 bg-background-card rounded-2xl p-4">
          <Text className="text-accent text-2xl font-bold">0</Text>
          <Text className="text-gray-400 text-xs mt-1">Streak 🔥</Text>
        </View>
        <View className="flex-1 bg-background-card rounded-2xl p-4">
          <Text className="text-secondary text-2xl font-bold">0</Text>
          <Text className="text-gray-400 text-xs mt-1">Badges</Text>
        </View>
      </View>

      {/* Activité récente */}
      <View className="mx-6 bg-background-card rounded-2xl p-5">
        <Text className="text-white font-semibold mb-3">Activité récente</Text>
        <Text className="text-gray-500 text-sm">Aucune séance pour le moment.</Text>
      </View>
    </ScrollView>
  );
}
