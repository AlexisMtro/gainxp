import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useAuthStore } from '@/stores/authStore';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { COLORS } from '@/lib/constants';
import type { MuscleGroup, Workout } from '@/types/index';

// ─── Données de filtre ────────────────────────────────────────────────────────

type Filter = MuscleGroup | null;

const FILTERS: { value: Filter; label: string }[] = [
  { value: null,         label: 'Tout'      },
  { value: 'full_body',  label: 'Full Body' },
  { value: 'chest',      label: 'Pectoraux' },
  { value: 'back',       label: 'Dos'       },
  { value: 'legs',       label: 'Jambes'    },
  { value: 'shoulders',  label: 'Épaules'   },
  { value: 'arms',       label: 'Bras'      },
  { value: 'core',       label: 'Abdos'     },
  { value: 'cardio',     label: 'Cardio'    },
];

// ─── Sous-composant : onglets ─────────────────────────────────────────────────

type Tab = 'discover' | 'mine';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: COLORS.backgroundElevated,
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 24,
        marginBottom: 16,
      }}
    >
      {(['discover', 'mine'] as Tab[]).map((tab) => {
        const isActive = active === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onChange(tab)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: isActive ? COLORS.primary : 'transparent',
            }}
          >
            <Text
              style={{
                color: isActive ? '#fff' : COLORS.textSecondary,
                fontWeight: isActive ? '700' : '400',
                fontSize: 14,
              }}
            >
              {tab === 'discover' ? 'Découvrir' : 'Mes programmes'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Sous-composant : filtres ─────────────────────────────────────────────────

function FilterBar({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 12 }}
    >
      {FILTERS.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <TouchableOpacity
            key={String(value)}
            onPress={() => onChange(value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: isActive ? COLORS.primary : COLORS.backgroundCard,
              borderWidth: isActive ? 0 : 1,
              borderColor: COLORS.backgroundElevated,
            }}
          >
            <Text
              style={{
                color: isActive ? '#fff' : COLORS.textSecondary,
                fontSize: 13,
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [activeFilter, setActiveFilter] = useState<Filter>(null);

  const { publicWorkouts, myWorkouts, isLoading, error, loadPublicWorkouts, loadMyWorkouts } =
    useWorkoutStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (activeTab === 'discover') {
      loadPublicWorkouts(activeFilter ?? undefined);
    } else if (user) {
      loadMyWorkouts(user.id);
    }
  }, [activeTab, activeFilter, user?.id]);

  const displayedWorkouts: Workout[] =
    activeTab === 'discover' ? publicWorkouts : myWorkouts;

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setActiveFilter(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Workout }) => <WorkoutCard workout={item} />,
    []
  );

  const keyExtractor = useCallback((item: Workout) => item.id, []);

  // ── Composants état vide / erreur / chargement ────────────────────────────
  const ListEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>
          {activeTab === 'discover' ? '🏋️' : '📋'}
        </Text>
        <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 14 }}>
          {activeTab === 'discover'
            ? 'Aucun programme trouvé pour ce filtre.'
            : "Tu n'as pas encore créé de programme."}
        </Text>
      </View>
    );
  }, [isLoading, activeTab]);

  const ListHeader = useCallback(
    () => (
      <View>
        {/* Titre de la page */}
        <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 20 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>Entraînement</Text>
          <Text
            style={{ color: COLORS.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 2 }}
          >
            Programmes
          </Text>
        </View>

        {/* Onglets Découvrir / Mes programmes */}
        <TabBar active={activeTab} onChange={handleTabChange} />

        {/* Filtres groupes musculaires (seulement en mode Découvrir) */}
        {activeTab === 'discover' && (
          <FilterBar active={activeFilter} onChange={setActiveFilter} />
        )}

        {/* Message d'erreur */}
        {error != null && (
          <View
            style={{
              marginHorizontal: 24,
              marginBottom: 12,
              padding: 12,
              backgroundColor: `${COLORS.error}15`,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: COLORS.error, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Indicateur de chargement */}
        {isLoading && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        )}
      </View>
    ),
    [activeTab, activeFilter, isLoading, error, handleTabChange]
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <FlatList
        data={displayedWorkouts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB : créer un programme */}
      <TouchableOpacity
        onPress={() => router.push('/workout/create')}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 28,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 26, lineHeight: 30 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
