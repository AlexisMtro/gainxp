import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

// Écran profil — avatar, badges, paramètres
export default function ProfileScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-white text-2xl font-bold">Profil</Text>
      </View>

      {/* Avatar & infos */}
      <View className="items-center mb-6">
        <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-3">
          <Text className="text-white text-3xl font-bold">J</Text>
        </View>
        <Text className="text-white text-xl font-bold">Joueur</Text>
        <Text className="text-gray-400 text-sm">Niveau 1 · 250 XP</Text>
      </View>

      {/* Badges */}
      <View className="mx-6 bg-background-card rounded-2xl p-5 mb-4">
        <Text className="text-white font-semibold mb-3">Badges</Text>
        <Text className="text-gray-500 text-sm">Complète des défis pour débloquer des badges</Text>
      </View>

      {/* Paramètres */}
      <View className="mx-6 bg-background-card rounded-2xl overflow-hidden">
        {['Notifications', 'Confidentialité', 'Déconnexion'].map((item, i) => (
          <TouchableOpacity
            key={item}
            className={`px-5 py-4 ${i < 2 ? 'border-b border-background-elevated' : ''}`}
          >
            <Text className={`${item === 'Déconnexion' ? 'text-red-400' : 'text-white'}`}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
