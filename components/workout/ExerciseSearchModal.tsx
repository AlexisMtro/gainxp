import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/constants';
import type { Exercise, MuscleGroup, Difficulty } from '@/types/index';

// Cast non-typé — même pattern que les autres hooks/stores
const db = supabase as unknown as SupabaseClient;

// ─── Constantes ───────────────────────────────────────────────────────────────

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full_body',
];

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest:     'Pectoraux',
  back:      'Dos',
  shoulders: 'Épaules',
  arms:      'Bras',
  legs:      'Jambes',
  core:      'Abdos',
  cardio:    'Cardio',
  full_body: 'Full Body',
};

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Débutant',      color: '#34D399' },
  2: { label: 'Intermédiaire', color: '#F59E0B' },
  3: { label: 'Avancé',        color: '#EF4444' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  /** IDs des exercices déjà sélectionnés à exclure de la liste */
  excludeIds?: string[];
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ExerciseSearchModal({ visible, onClose, onSelect, excludeIds = [] }: Props) {
  const sheetRef = useRef<BottomSheet>(null);

  // ── État liste ────────────────────────────────────────────────────────────
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<MuscleGroup | null>(null);

  // ── État formulaire custom ────────────────────────────────────────────────
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscles, setCustomMuscles] = useState<MuscleGroup[]>([]);
  const [customDifficulty, setCustomDifficulty] = useState<Difficulty>(1);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // ── Ouverture / fermeture ─────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
      setQuery('');
      setFilterGroup(null);
      setShowCustomForm(false);
      resetCustomForm();
    }
  }, [visible]);

  // ── Chargement des exercices ──────────────────────────────────────────────
  useEffect(() => {
    if (visible && exercises.length === 0) {
      fetchExercises();
    }
  }, [visible]);

  async function fetchExercises() {
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setExercises((data ?? []) as Exercise[]);
    } catch (err) {
      console.warn('[ExerciseSearchModal] fetchExercises error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Filtrage temps réel ───────────────────────────────────────────────────
  const filteredExercises = useMemo(() => {
    const excludeSet = new Set(excludeIds);
    return exercises.filter((e) => {
      if (excludeSet.has(e.id)) return false;
      if (filterGroup && !e.muscle_groups.includes(filterGroup)) return false;
      if (query.trim()) {
        return e.name.toLowerCase().includes(query.trim().toLowerCase());
      }
      return true;
    });
  }, [exercises, query, filterGroup, excludeIds]);

  // ── Sélection ─────────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (exercise: Exercise) => {
      onSelect(exercise);
      sheetRef.current?.close();
    },
    [onSelect]
  );

  // ── Création exercice custom ──────────────────────────────────────────────
  function resetCustomForm() {
    setCustomName('');
    setCustomMuscles([]);
    setCustomDifficulty(1);
    setCustomError(null);
  }

  function toggleCustomMuscle(group: MuscleGroup) {
    setCustomMuscles((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  async function handleCreateCustom() {
    if (!customName.trim()) {
      setCustomError('Le nom est requis.');
      return;
    }
    if (customMuscles.length === 0) {
      setCustomError('Sélectionne au moins un groupe musculaire.');
      return;
    }

    setIsSavingCustom(true);
    setCustomError(null);
    try {
      const { data, error } = await db
        .from('exercises')
        .insert({
          name: customName.trim(),
          muscle_groups: customMuscles,
          // Le schéma DB utilise difficulty_level enum ('1','2','3')
          difficulty: String(customDifficulty),
          equipment: 'bodyweight',
          description: '',
        })
        .select()
        .single();

      if (error) throw error;

      // Ajoute l'exercice à la liste locale et sélectionne-le
      const created = data as Exercise;
      setExercises((prev) => [created, ...prev]);
      handleSelect(created);
      resetCustomForm();
      setShowCustomForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      setCustomError(msg);
      console.warn('[ExerciseSearchModal] handleCreateCustom error:', err);
    } finally {
      setIsSavingCustom(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['92%']}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      {/* ── En-tête ── */}
      <BottomSheetView style={styles.header}>
        <Text style={styles.headerTitle}>Ajouter un exercice</Text>
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </BottomSheetView>

      {/* ── Recherche ── */}
      <BottomSheetView style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <BottomSheetTextInput
          style={styles.searchInput}
          placeholder="Rechercher un exercice…"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.clearBtn}>✕</Text>
          </Pressable>
        )}
      </BottomSheetView>

      {/* ── Filtres groupe musculaire ── */}
      <BottomSheetView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {ALL_MUSCLE_GROUPS.map((group) => {
            const active = filterGroup === group;
            return (
              <Pressable
                key={group}
                onPress={() => setFilterGroup(active ? null : group)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {MUSCLE_LABELS[group]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetView>

      {/* ── Indicateur de résultats ── */}
      {!isLoading && (
        <BottomSheetView style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {filteredExercises.length} exercice{filteredExercises.length !== 1 ? 's' : ''}
          </Text>
        </BottomSheetView>
      )}

      {/* ── Liste des exercices ── */}
      {isLoading ? (
        <BottomSheetView style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </BottomSheetView>
      ) : (
        <BottomSheetFlatList<Exercise>
          data={filteredExercises}
          keyExtractor={(item: Exercise) => item.id}
          renderItem={({ item }: { item: Exercise }) => (
            <ExerciseRow exercise={item} onSelect={handleSelect} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <BottomSheetView style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {query ? `Aucun résultat pour « ${query} »` : 'Aucun exercice trouvé'}
              </Text>
            </BottomSheetView>
          }
          ListFooterComponent={<View style={{ height: showCustomForm ? 0 : 120 }} />}
        />
      )}

      {/* ── Section création exercice custom ── */}
      {!isLoading && (
        <BottomSheetView style={styles.customSection}>
          {!showCustomForm ? (
            <Pressable
              style={styles.addCustomBtn}
              onPress={() => setShowCustomForm(true)}
            >
              <Text style={styles.addCustomBtnText}>+ Créer un exercice personnalisé</Text>
            </Pressable>
          ) : (
            <BottomSheetView style={styles.customForm}>
              <Text style={styles.customFormTitle}>Nouvel exercice</Text>

              <BottomSheetTextInput
                style={styles.customInput}
                placeholder="Nom de l'exercice"
                placeholderTextColor={COLORS.textMuted}
                value={customName}
                onChangeText={setCustomName}
              />

              {/* Groupes musculaires */}
              <Text style={styles.customLabel}>Groupes musculaires</Text>
              <View style={styles.muscleGrid}>
                {ALL_MUSCLE_GROUPS.map((group) => {
                  const selected = customMuscles.includes(group);
                  return (
                    <Pressable
                      key={group}
                      onPress={() => toggleCustomMuscle(group)}
                      style={[styles.muscleChip, selected && styles.muscleChipSelected]}
                    >
                      <Text style={[styles.muscleChipText, selected && styles.muscleChipTextSelected]}>
                        {MUSCLE_LABELS[group]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Difficulté */}
              <Text style={styles.customLabel}>Difficulté</Text>
              <View style={styles.difficultyRow}>
                {([1, 2, 3] as Difficulty[]).map((d) => {
                  const { label, color } = DIFFICULTY_LABELS[d];
                  const selected = customDifficulty === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setCustomDifficulty(d)}
                      style={[
                        styles.diffChip,
                        selected && { backgroundColor: color, borderColor: color },
                      ]}
                    >
                      <Text style={[styles.diffChipText, selected && { color: '#fff' }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {customError && <Text style={styles.errorText}>{customError}</Text>}

              {/* Actions */}
              <View style={styles.customActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => { setShowCustomForm(false); resetCustomForm(); }}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveCustomBtn, isSavingCustom && { opacity: 0.6 }]}
                  onPress={handleCreateCustom}
                  disabled={isSavingCustom}
                >
                  {isSavingCustom
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveCustomBtnText}>Créer</Text>
                  }
                </Pressable>
              </View>
            </BottomSheetView>
          )}
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}

// ─── Sous-composant : ligne d'exercice ────────────────────────────────────────

const MUSCLE_LABELS_SHORT: Partial<Record<MuscleGroup, string>> = {
  chest:     'Pecto',
  back:      'Dos',
  shoulders: 'Épaules',
  arms:      'Bras',
  legs:      'Jambes',
  core:      'Abdos',
  cardio:    'Cardio',
  full_body: 'Full',
};

function ExerciseRow({ exercise, onSelect }: { exercise: Exercise; onSelect: (e: Exercise) => void }) {
  const primaryGroup = exercise.muscle_groups[0];

  return (
    <Pressable
      onPress={() => onSelect(exercise)}
      style={({ pressed }) => [styles.exerciseRow, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName} numberOfLines={1}>{exercise.name}</Text>
        <View style={styles.exerciseTags}>
          {primaryGroup && (
            <View style={styles.muscleTag}>
              <Text style={styles.muscleTagText}>
                {MUSCLE_LABELS_SHORT[primaryGroup] ?? primaryGroup}
              </Text>
            </View>
          )}
          {exercise.equipment && (
            <View style={styles.equipmentTag}>
              <Text style={styles.equipmentTagText}>{exercise.equipment}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.addIcon}>＋</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.backgroundCard,
  },
  sheetHandle: {
    backgroundColor: COLORS.textMuted,
    width: 36,
  },

  // En-tête
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 18,
  },

  // Recherche
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: 10,
  },
  clearBtn: {
    color: COLORS.textMuted,
    fontSize: 14,
    padding: 4,
  },

  // Filtres
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: `${COLORS.primary}30`,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.primaryLight,
  },

  // Compteur résultats
  resultsCount: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  resultsCountText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
  },

  // Liste
  listContent: {
    paddingHorizontal: 16,
  },

  // Ligne exercice
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
    gap: 6,
  },
  exerciseName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseTags: {
    flexDirection: 'row',
    gap: 6,
  },
  muscleTag: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  muscleTagText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  equipmentTag: {
    backgroundColor: `${COLORS.backgroundCard}`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  equipmentTagText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  addIcon: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '300',
    paddingLeft: 12,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // Section custom
  customSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundElevated,
    marginTop: 4,
  },
  addCustomBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCustomBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Formulaire custom
  customForm: {
    paddingTop: 16,
    gap: 12,
  },
  customFormTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  customInput: {
    backgroundColor: COLORS.backgroundElevated,
    color: COLORS.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  customLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: -4,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  muscleChipSelected: {
    backgroundColor: `${COLORS.primary}30`,
    borderColor: COLORS.primary,
  },
  muscleChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  muscleChipTextSelected: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
    alignItems: 'center',
  },
  diffChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
  customActions: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveCustomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveCustomBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
