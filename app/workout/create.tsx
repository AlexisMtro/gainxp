import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/lib/constants';
import { ExerciseSearchModal } from '@/components/workout/ExerciseSearchModal';
import type { Exercise, MuscleGroup, Difficulty } from '@/types/index';

const db = supabase as unknown as SupabaseClient;

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface DraftSet {
  target_reps: number | null;
  target_weight: number | null;
  target_duration_sec: number | null;
  rest_duration_sec: number;
}

interface DraftExercise {
  /** Clé unique pour DraggableFlatList */
  key: string;
  exercise: Exercise;
  notes: string;
  sets: DraftSet[];
}

function defaultSet(): DraftSet {
  return { target_reps: 10, target_weight: null, target_duration_sec: null, rest_duration_sec: 60 };
}

function defaultExercise(exercise: Exercise): DraftExercise {
  return {
    key: `${exercise.id}-${Date.now()}`,
    exercise,
    notes: '',
    sets: [defaultSet(), defaultSet(), defaultSet()],
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MUSCLE_LABELS: Partial<Record<MuscleGroup, string>> = {
  chest:     'Pectoraux',
  back:      'Dos',
  shoulders: 'Épaules',
  arms:      'Bras',
  legs:      'Jambes',
  core:      'Abdos',
  cardio:    'Cardio',
  full_body: 'Full Body',
};

const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full_body',
];

const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string; color: string }> = [
  { value: 1, label: 'Débutant',      color: '#34D399' },
  { value: 2, label: 'Intermédiaire', color: '#F59E0B' },
  { value: 3, label: 'Avancé',        color: '#EF4444' },
];

const STEP_LABELS = ['Infos', 'Exercices', 'Séries', 'Résumé'];
const TOTAL_STEPS = 4;

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.profile?.id ?? s.user?.id ?? '');

  // ── Navigation entre étapes ────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const progress = useSharedValue(0); // 0 → 1 sur les 4 étapes

  function goToStep(target: number) {
    setStep(target);
    progress.value = withTiming((target - 1) / (TOTAL_STEPS - 1), { duration: 300 });
  }

  function nextStep() { if (step < TOTAL_STEPS) goToStep(step + 1); }
  function prevStep() { if (step > 1) goToStep(step - 1); }

  // ── Étape 1 — Infos ───────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [durationMin, setDurationMin] = useState(45);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  function toggleMuscle(group: MuscleGroup) {
    setMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  function validateStep1(): boolean {
    if (!name.trim()) {
      setStep1Error('Le nom du programme est requis.');
      return false;
    }
    if (muscleGroups.length === 0) {
      setStep1Error('Sélectionne au moins un groupe musculaire.');
      return false;
    }
    setStep1Error(null);
    return true;
  }

  // ── Étape 2 — Exercices ───────────────────────────────────────────────────
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const handleExerciseSelect = useCallback((exercise: Exercise) => {
    setExercises((prev) => [...prev, defaultExercise(exercise)]);
  }, []);

  function removeExercise(key: string) {
    setExercises((prev) => prev.filter((e) => e.key !== key));
  }

  // ── Étape 3 — Séries ──────────────────────────────────────────────────────

  function updateExerciseNotes(key: string, notes: string) {
    setExercises((prev) =>
      prev.map((e) => (e.key === key ? { ...e, notes } : e))
    );
  }

  function updateSet(exerciseKey: string, setIdx: number, patch: Partial<DraftSet>) {
    setExercises((prev) =>
      prev.map((e) =>
        e.key === exerciseKey
          ? { ...e, sets: e.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s)) }
          : e
      )
    );
  }

  function addSet(exerciseKey: string) {
    setExercises((prev) =>
      prev.map((e) =>
        e.key === exerciseKey ? { ...e, sets: [...e.sets, defaultSet()] } : e
      )
    );
  }

  function removeSet(exerciseKey: string, setIdx: number) {
    setExercises((prev) =>
      prev.map((e) =>
        e.key === exerciseKey && e.sets.length > 1
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIdx) }
          : e
      )
    );
  }

  // ── Étape 4 — Sauvegarde ──────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!userId) {
      setSaveError('Utilisateur non authentifié.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Créer le programme
      const { data: workoutRow, error: workoutErr } = await db
        .from('workouts')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          // Le schéma DB utilise difficulty_level enum ('1','2','3')
          difficulty: String(difficulty),
          duration_min: durationMin,
          muscle_groups: muscleGroups,
          is_public: isPublic,
          created_by: userId,
        })
        .select('id')
        .single();

      if (workoutErr) throw workoutErr;
      const workoutId: string = workoutRow.id;

      // 2. Insérer les exercices et leurs séries
      for (const [idx, de] of exercises.entries()) {
        const { data: weRow, error: weErr } = await db
          .from('workout_exercises')
          .insert({
            workout_id: workoutId,
            exercise_id: de.exercise.id,
            order_index: idx,
            notes: de.notes.trim() || null,
          })
          .select('id')
          .single();

        if (weErr) throw weErr;

        if (de.sets.length > 0) {
          const setsPayload = de.sets.map((s, i) => ({
            workout_exercise_id: weRow.id,
            set_index: i + 1,
            target_reps:         s.target_reps,
            target_weight:       s.target_weight,
            target_duration_sec: s.target_duration_sec,
            rest_duration_sec:   s.rest_duration_sec,
          }));

          const { error: setsErr } = await db.from('workout_sets').insert(setsPayload);
          if (setsErr) throw setsErr;
        }
      }

      // 3. Naviguer vers la page du programme créé
      router.replace(`/workout/${workoutId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setSaveError(msg);
      console.warn('[CreateWorkout] handleSave error:', err);
    } finally {
      setIsSaving(false);
    }
  }

  // ── Animation de la barre de progression ──────────────────────────────────
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  // ─── Render ────────────────────────────────────────────────────────────────

  const canProceed =
    step === 1 ? name.trim().length > 0 && muscleGroups.length > 0 :
    step === 2 ? exercises.length > 0 :
    true;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => (step === 1 ? router.back() : prevStep())} hitSlop={12}>
          <Text style={styles.backBtn}>{step === 1 ? '✕' : '‹'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Créer un programme</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Stepper ── */}
      <View style={styles.stepperContainer}>
        {/* Barre de fond */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>

        {/* Étapes numérotées */}
        <View style={styles.stepDots}>
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = step > stepNum;
            const isActive    = step === stepNum;
            return (
              <Pressable
                key={stepNum}
                onPress={() => stepNum < step && goToStep(stepNum)}
                style={styles.stepDotWrapper}
              >
                <View style={[
                  styles.stepDot,
                  isCompleted && styles.stepDotCompleted,
                  isActive    && styles.stepDotActive,
                ]}>
                  <Text style={[styles.stepDotText, (isActive || isCompleted) && { color: '#fff' }]}>
                    {isCompleted ? '✓' : stepNum}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, isActive && { color: COLORS.primary }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Contenu de l'étape ── */}
      {step === 1 && (
        <Step1Infos
          name={name} onNameChange={setName}
          description={description} onDescriptionChange={setDescription}
          difficulty={difficulty} onDifficultyChange={setDifficulty}
          durationMin={durationMin} onDurationChange={setDurationMin}
          muscleGroups={muscleGroups} onToggleMuscle={toggleMuscle}
          isPublic={isPublic} onTogglePublic={setIsPublic}
          error={step1Error}
        />
      )}

      {step === 2 && (
        <Step2Exercises
          exercises={exercises}
          onReorder={setExercises}
          onRemove={removeExercise}
          onOpenSearch={() => setShowSearch(true)}
        />
      )}

      {step === 3 && (
        <Step3Sets
          exercises={exercises}
          onUpdateNotes={updateExerciseNotes}
          onUpdateSet={updateSet}
          onAddSet={addSet}
          onRemoveSet={removeSet}
        />
      )}

      {step === 4 && (
        <Step4Summary
          name={name}
          description={description}
          difficulty={difficulty}
          durationMin={durationMin}
          muscleGroups={muscleGroups}
          isPublic={isPublic}
          exercises={exercises}
          isSaving={isSaving}
          error={saveError}
          onSave={handleSave}
        />
      )}

      {/* ── Bouton navigation ── */}
      {step < 4 && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
            onPress={() => { if (step === 1 && !validateStep1()) return; nextStep(); }}
            disabled={!canProceed}
          >
            <Text style={styles.nextBtnText}>
              {step === 3 ? 'Voir le résumé →' : 'Suivant →'}
            </Text>
          </Pressable>
          {step === 2 && exercises.length === 0 && (
            <Text style={styles.footerHint}>Ajoute au moins un exercice pour continuer</Text>
          )}
        </View>
      )}

      {/* ── Modale de recherche d'exercices ── */}
      <ExerciseSearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleExerciseSelect}
        excludeIds={exercises.map((e) => e.exercise.id)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Étape 1 — Informations ───────────────────────────────────────────────────

interface Step1Props {
  name: string; onNameChange: (v: string) => void;
  description: string; onDescriptionChange: (v: string) => void;
  difficulty: Difficulty; onDifficultyChange: (d: Difficulty) => void;
  durationMin: number; onDurationChange: (v: number) => void;
  muscleGroups: MuscleGroup[]; onToggleMuscle: (g: MuscleGroup) => void;
  isPublic: boolean; onTogglePublic: (v: boolean) => void;
  error: string | null;
}

function Step1Infos({
  name, onNameChange,
  description, onDescriptionChange,
  difficulty, onDifficultyChange,
  durationMin, onDurationChange,
  muscleGroups, onToggleMuscle,
  isPublic, onTogglePublic,
  error,
}: Step1Props) {
  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Nom */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Nom du programme <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="ex : PPL Push — Débutant"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={onNameChange}
          maxLength={60}
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Décris ton programme…"
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </View>

      {/* Difficulté */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Difficulté</Text>
        <View style={styles.diffRow}>
          {DIFFICULTY_OPTIONS.map(({ value, label, color }) => {
            const active = difficulty === value;
            return (
              <Pressable
                key={value}
                onPress={() => onDifficultyChange(value)}
                style={[styles.diffBtn, active && { backgroundColor: color, borderColor: color }]}
              >
                <Text style={[styles.diffBtnText, active && { color: '#fff' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Durée */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Durée estimée</Text>
        <View style={styles.stepperRow}>
          <Pressable
            style={styles.stepperBtn}
            onPress={() => onDurationChange(Math.max(15, durationMin - 15))}
          >
            <Text style={styles.stepperBtnText}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{durationMin} min</Text>
          <Pressable
            style={styles.stepperBtn}
            onPress={() => onDurationChange(Math.min(180, durationMin + 15))}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Groupes musculaires */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Groupes musculaires <Text style={styles.required}>*</Text></Text>
        <View style={styles.muscleGrid}>
          {ALL_MUSCLE_GROUPS.map((group) => {
            const active = muscleGroups.includes(group);
            return (
              <Pressable
                key={group}
                onPress={() => onToggleMuscle(group)}
                style={[styles.muscleChip, active && styles.muscleChipActive]}
              >
                <Text style={[styles.muscleChipText, active && styles.muscleChipTextActive]}>
                  {MUSCLE_LABELS[group] ?? group}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Public / Privé */}
      <View style={styles.field}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.fieldLabel}>Rendre public</Text>
            <Text style={styles.fieldHint}>Visible dans la découverte par tous</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={onTogglePublic}
            trackColor={{ false: COLORS.backgroundElevated, true: COLORS.primary }}
            thumbColor={isPublic ? '#fff' : COLORS.textMuted}
          />
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}

// ─── Étape 2 — Exercices ──────────────────────────────────────────────────────

interface Step2Props {
  exercises: DraftExercise[];
  onReorder: (data: DraftExercise[]) => void;
  onRemove: (key: string) => void;
  onOpenSearch: () => void;
}

function Step2Exercises({ exercises, onReorder, onRemove, onOpenSearch }: Step2Props) {
  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<DraftExercise>) => (
      <ScaleDecorator>
        <View style={[styles.exerciseItem, isActive && { opacity: 0.8, backgroundColor: COLORS.backgroundElevated }]}>
          {/* Drag handle */}
          <Pressable onLongPress={drag} style={styles.dragHandle}>
            <Text style={styles.dragIcon}>⋮⋮</Text>
          </Pressable>

          <View style={styles.exerciseItemContent}>
            <Text style={styles.exerciseItemName} numberOfLines={1}>
              {item.exercise.name}
            </Text>
            {item.exercise.muscle_groups[0] && (
              <Text style={styles.exerciseItemMuscle}>
                {MUSCLE_LABELS[item.exercise.muscle_groups[0]] ?? item.exercise.muscle_groups[0]}
              </Text>
            )}
          </View>

          <View style={styles.exerciseItemMeta}>
            <Text style={styles.exerciseItemSets}>{item.sets.length} séries</Text>
            <Pressable onPress={() => onRemove(item.key)} hitSlop={8}>
              <Text style={styles.removeExercise}>✕</Text>
            </Pressable>
          </View>
        </View>
      </ScaleDecorator>
    ),
    [onRemove]
  );

  return (
    <View style={styles.step2Container}>
      {exercises.length === 0 ? (
        <View style={styles.emptyExercises}>
          <Text style={styles.emptyExercisesIcon}>🏋️</Text>
          <Text style={styles.emptyExercisesText}>Aucun exercice sélectionné</Text>
          <Text style={styles.emptyExercisesHint}>Appuie sur le bouton ci-dessous pour en ajouter</Text>
        </View>
      ) : (
        <DraggableFlatList
          data={exercises}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          onDragEnd={({ data }) => onReorder(data)}
          contentContainerStyle={styles.exerciseList}
        />
      )}

      <Pressable style={styles.addExerciseBtn} onPress={onOpenSearch}>
        <Text style={styles.addExerciseBtnText}>+ Ajouter un exercice</Text>
      </Pressable>
    </View>
  );
}

// ─── Étape 3 — Séries ─────────────────────────────────────────────────────────

interface Step3Props {
  exercises: DraftExercise[];
  onUpdateNotes: (key: string, notes: string) => void;
  onUpdateSet: (key: string, setIdx: number, patch: Partial<DraftSet>) => void;
  onAddSet: (key: string) => void;
  onRemoveSet: (key: string, setIdx: number) => void;
}

function Step3Sets({ exercises, onUpdateNotes, onUpdateSet, onAddSet, onRemoveSet }: Step3Props) {
  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      {exercises.map((de) => (
        <View key={de.key} style={styles.setsCard}>
          {/* En-tête exercice */}
          <Text style={styles.setsCardTitle}>{de.exercise.name}</Text>

          {/* Notes */}
          <TextInput
            style={[styles.input, { marginBottom: 12 }]}
            placeholder="Notes (ex : contrôle excentrique…)"
            placeholderTextColor={COLORS.textMuted}
            value={de.notes}
            onChangeText={(v) => onUpdateNotes(de.key, v)}
          />

          {/* En-tête colonnes */}
          <View style={styles.setsHeader}>
            <Text style={[styles.setsColLabel, { flex: 0.5 }]}>N°</Text>
            <Text style={[styles.setsColLabel, { flex: 1 }]}>Reps</Text>
            <Text style={[styles.setsColLabel, { flex: 1 }]}>Kg</Text>
            <Text style={[styles.setsColLabel, { flex: 1 }]}>Repos (s)</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Lignes de séries */}
          {de.sets.map((s, idx) => (
            <View key={idx} style={styles.setRow}>
              <Text style={[styles.setNum, { flex: 0.5 }]}>{idx + 1}</Text>

              {/* Reps */}
              <TextInput
                style={[styles.setInput, { flex: 1 }]}
                keyboardType="number-pad"
                value={s.target_reps != null ? String(s.target_reps) : ''}
                placeholder="—"
                placeholderTextColor={COLORS.textMuted}
                onChangeText={(v) =>
                  onUpdateSet(de.key, idx, { target_reps: v ? parseInt(v, 10) : null })
                }
              />

              {/* Poids */}
              <TextInput
                style={[styles.setInput, { flex: 1 }]}
                keyboardType="decimal-pad"
                value={s.target_weight != null ? String(s.target_weight) : ''}
                placeholder="—"
                placeholderTextColor={COLORS.textMuted}
                onChangeText={(v) =>
                  onUpdateSet(de.key, idx, { target_weight: v ? parseFloat(v) : null })
                }
              />

              {/* Repos */}
              <TextInput
                style={[styles.setInput, { flex: 1 }]}
                keyboardType="number-pad"
                value={String(s.rest_duration_sec)}
                onChangeText={(v) =>
                  onUpdateSet(de.key, idx, { rest_duration_sec: v ? parseInt(v, 10) : 60 })
                }
              />

              {/* Supprimer série */}
              <Pressable onPress={() => onRemoveSet(de.key, idx)} hitSlop={8} style={{ width: 24 }}>
                <Text style={styles.removeSetBtn}>✕</Text>
              </Pressable>
            </View>
          ))}

          {/* Ajouter une série */}
          <Pressable style={styles.addSetBtn} onPress={() => onAddSet(de.key)}>
            <Text style={styles.addSetBtnText}>+ Série</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Étape 4 — Résumé ─────────────────────────────────────────────────────────

interface Step4Props {
  name: string;
  description: string;
  difficulty: Difficulty;
  durationMin: number;
  muscleGroups: MuscleGroup[];
  isPublic: boolean;
  exercises: DraftExercise[];
  isSaving: boolean;
  error: string | null;
  onSave: () => void;
}

function Step4Summary({
  name, description, difficulty, durationMin, muscleGroups,
  isPublic, exercises, isSaving, error, onSave,
}: Step4Props) {
  const diff = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)!;
  const totalSets = exercises.reduce((acc, e) => acc + e.sets.length, 0);

  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Carte résumé */}
      <View style={styles.summaryCard}>
        {/* Nom + visibilité */}
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryName}>{name}</Text>
          <View style={[styles.summaryBadge, { backgroundColor: isPublic ? `${COLORS.success}20` : `${COLORS.backgroundElevated}` }]}>
            <Text style={[styles.summaryBadgeText, { color: isPublic ? COLORS.success : COLORS.textMuted }]}>
              {isPublic ? '🌐 Public' : '🔒 Privé'}
            </Text>
          </View>
        </View>

        {description.trim() !== '' && (
          <Text style={styles.summaryDescription}>{description}</Text>
        )}

        {/* Méta */}
        <View style={styles.summaryMeta}>
          <View style={styles.summaryMetaItem}>
            <Text style={styles.summaryMetaValue}>{durationMin} min</Text>
            <Text style={styles.summaryMetaLabel}>Durée</Text>
          </View>
          <View style={styles.summaryMetaItem}>
            <Text style={[styles.summaryMetaValue, { color: diff.color }]}>{diff.label}</Text>
            <Text style={styles.summaryMetaLabel}>Difficulté</Text>
          </View>
          <View style={styles.summaryMetaItem}>
            <Text style={styles.summaryMetaValue}>{exercises.length}</Text>
            <Text style={styles.summaryMetaLabel}>Exercices</Text>
          </View>
          <View style={styles.summaryMetaItem}>
            <Text style={styles.summaryMetaValue}>{totalSets}</Text>
            <Text style={styles.summaryMetaLabel}>Séries</Text>
          </View>
        </View>

        {/* Tags musculaires */}
        <View style={styles.muscleTags}>
          {muscleGroups.map((g) => (
            <View key={g} style={styles.muscleTagSummary}>
              <Text style={styles.muscleTagSummaryText}>{MUSCLE_LABELS[g] ?? g}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Liste des exercices */}
      <Text style={styles.summaryExercisesTitle}>Programme ({exercises.length} exercices)</Text>
      {exercises.map((de, idx) => (
        <View key={de.key} style={styles.summaryExerciseRow}>
          <Text style={styles.summaryExerciseIdx}>{idx + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryExerciseName}>{de.exercise.name}</Text>
            <Text style={styles.summaryExerciseSets}>{de.sets.length} séries</Text>
          </View>
        </View>
      ))}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Bouton Créer */}
      <Pressable
        style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={isSaving}
      >
        {isSaving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>🚀 Créer le programme</Text>
        }
      </Pressable>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    color: COLORS.textPrimary,
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  // Stepper
  stepperContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.backgroundElevated,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepDotWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundElevated,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepDotText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  // Contenu des étapes
  stepContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 20,
  },

  // Champs formulaire
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.backgroundCard,
    color: COLORS.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginTop: -8,
  },

  // Difficulté
  diffRow: {
    flexDirection: 'row',
    gap: 10,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
    alignItems: 'center',
  },
  diffBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Durée stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '300',
    lineHeight: 24,
  },
  stepperValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
  },

  // Groupes musculaires
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
  },
  muscleChipActive: {
    backgroundColor: `${COLORS.primary}25`,
    borderColor: COLORS.primary,
  },
  muscleChipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  muscleChipTextActive: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },

  // Toggle public/privé
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
  },

  // Footer bouton Suivant
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundElevated,
    gap: 8,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: COLORS.backgroundElevated,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },

  // Étape 2 — Exercices
  step2Container: {
    flex: 1,
  },
  exerciseList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
  },
  dragHandle: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  dragIcon: {
    color: COLORS.textMuted,
    fontSize: 18,
    letterSpacing: -2,
  },
  exerciseItemContent: {
    flex: 1,
    gap: 4,
  },
  exerciseItemName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseItemMuscle: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseItemMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  exerciseItemSets: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  removeExercise: {
    color: COLORS.error,
    fontSize: 14,
  },
  emptyExercises: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyExercisesIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyExercisesText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyExercisesHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  addExerciseBtn: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addExerciseBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Étape 3 — Séries
  setsCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
    gap: 8,
  },
  setsCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  setsColLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setNum: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  setInput: {
    backgroundColor: COLORS.backgroundElevated,
    color: COLORS.textPrimary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  removeSetBtn: {
    color: COLORS.error,
    fontSize: 12,
    textAlign: 'center',
  },
  addSetBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}20`,
    marginTop: 4,
  },
  addSetBtnText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },

  // Étape 4 — Résumé
  summaryCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
    gap: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryMetaItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryMetaValue: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryMetaLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTagSummary: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleTagSummaryText: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryExercisesTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 10,
    padding: 12,
  },
  summaryExerciseIdx: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  summaryExerciseName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryExerciseSets: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
