import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '@/stores/sessionStore';
import { COLORS } from '@/lib/constants';

// ─── Configuration des onglets ────────────────────────────────────────────────

type TabName = 'index' | 'workout' | 'progress' | 'profile';

interface TabConfig {
  label:       string;
  iconActive:  keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIG: Record<TabName, TabConfig> = {
  index:    { label: 'Dashboard',   iconActive: 'home',         iconInactive: 'home-outline'        },
  workout:  { label: 'Workout',     iconActive: 'barbell',      iconInactive: 'barbell-outline'     },
  progress: { label: 'Progression', iconActive: 'stats-chart',  iconInactive: 'stats-chart-outline' },
  profile:  { label: 'Profil',      iconActive: 'person',       iconInactive: 'person-outline'      },
};

// ─── Composant d'un onglet individuel ────────────────────────────────────────

interface TabItemProps {
  name:      TabName;
  isFocused: boolean;
  showBadge: boolean;
  onPress:   () => void;
}

function TabItem({ name, isFocused, showBadge, onPress }: TabItemProps) {
  const config = TAB_CONFIG[name];
  const scale  = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      scale.value = withSpring(1.12, { damping: 10, stiffness: 200 }, () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      });
    }
  }, [isFocused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconName = isFocused ? config.iconActive : config.iconInactive;
  const iconColor = isFocused ? COLORS.primary : COLORS.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.label}
    >
      <Animated.View style={[styles.tabIconWrapper, animStyle]}>
        {/* Fond actif */}
        {isFocused && <View style={styles.activeBackground} />}

        <Ionicons name={iconName} size={22} color={iconColor} />

        {/* Badge séance en cours */}
        {showBadge && <View style={styles.badge} />}
      </Animated.View>

      <Text style={[styles.tabLabel, { color: iconColor }]}>{config.label}</Text>
    </Pressable>
  );
}

// ─── Barre d'onglets custom ───────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hasActiveSession = useSessionStore((s) => s.currentSession !== null);

  // Filtre les routes cachées (href: null)
  const visibleRoutes = state.routes.filter(
    (r) => r.name in TAB_CONFIG
  ) as Array<(typeof state.routes)[number] & { name: TabName }>;

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {visibleRoutes.map((route) => {
        const isFocused = state.routes[state.index].name === route.name;

        return (
          <TabItem
            key={route.key}
            name={route.name}
            isFocused={isFocused}
            showBadge={route.name === 'workout' && hasActiveSession}
            onPress={() => {
              if (!isFocused) {
                navigation.navigate(route.name);
              }
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Layout des onglets ───────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    />
      <Tabs.Screen name="workout"  />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="profile"  />
      {/* Écrans cachés de la tab bar */}
      <Tabs.Screen name="two"      options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundElevated,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  tabIconWrapper: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    width: 44,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}18`,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Badge séance en cours (point rouge en haut à droite de l'icône)
  badge: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.backgroundCard,
  },
});
