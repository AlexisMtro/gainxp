-- ============================================================
-- GainXP — Données de base (seed)
-- Migration : 20260322000002_seed.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 50 EXERCICES POPULAIRES
-- ─────────────────────────────────────────────────────────────

insert into public.exercises (name, description, muscle_groups, equipment, difficulty) values

-- ── POITRINE ──────────────────────────────────────────────
('Développé couché',        'Exercice de base pour la poitrine avec une barre',          '{chest,shoulders,arms}', 'barbell',    '2'),
('Développé couché haltères','Développé couché avec haltères, meilleure amplitude',      '{chest,shoulders,arms}', 'dumbbell',   '2'),
('Pompes',                  'Exercice au poids du corps pour la poitrine',               '{chest,shoulders,arms}', 'bodyweight', '1'),
('Développé incliné',       'Cible le haut de la poitrine',                              '{chest,shoulders}',      'barbell',    '2'),
('Écarté poulie haute',     'Isolation poitrine avec câbles en croix',                   '{chest}',                'cable',      '2'),
('Dips poitrine',           'Dips avec inclinaison avant pour cibler la poitrine',       '{chest,arms}',           'bodyweight', '2'),

-- ── DOS ───────────────────────────────────────────────────
('Tractions',               'Exercice de base pour le dos avec prise pronation',         '{back,arms}',            'bodyweight', '2'),
('Soulevé de terre',        'Exercice composé roi pour le dos et les jambes',            '{back,legs,core}',       'barbell',    '3'),
('Rowing barre',            'Tirage horizontal avec barre pour l'épaisseur du dos',      '{back,arms}',            'barbell',    '2'),
('Rowing haltère',          'Rowing unilatéral pour le grand dorsal',                    '{back,arms}',            'dumbbell',   '2'),
('Tirage poulie haute',     'Tirage vertical pour les dorsaux',                          '{back,arms}',            'cable',      '1'),
('Tirage horizontal câble', 'Rowing assis à la poulie basse',                            '{back,arms}',            'cable',      '1'),
('Good morning',            'Travail des ischio-jambiers et érecteurs du rachis',        '{back,legs}',            'barbell',    '2'),

-- ── ÉPAULES ───────────────────────────────────────────────
('Développé militaire',     'Presse épaules avec barre debout ou assis',                 '{shoulders,arms}',       'barbell',    '2'),
('Élévations latérales',    'Isolation du faisceau latéral de l'épaule',                 '{shoulders}',            'dumbbell',   '1'),
('Oiseau haltères',         'Isolation du faisceau postérieur de l'épaule',              '{shoulders,back}',       'dumbbell',   '1'),
('Arnold press',            'Variante du développé avec rotation, travail complet',      '{shoulders,arms}',       'dumbbell',   '2'),
('Shrugs barre',            'Travail des trapèzes supérieurs',                           '{shoulders,back}',       'barbell',    '1'),
('Face pull',               'Tirage corde au visage pour les deltoïdes postérieurs',     '{shoulders,back}',       'cable',      '1'),

-- ── BRAS ──────────────────────────────────────────────────
('Curl biceps barre',       'Flexion des avant-bras avec barre droite',                  '{arms}',                 'barbell',    '1'),
('Curl haltères',           'Curl alterné ou simultané avec haltères',                   '{arms}',                 'dumbbell',   '1'),
('Curl marteau',            'Curl prise neutre pour le brachial et brachio-radial',      '{arms}',                 'dumbbell',   '1'),
('Curl poulie basse',       'Curl au câble pour tension constante',                      '{arms}',                 'cable',      '1'),
('Extension triceps barre', 'Skull crusher pour les triceps',                            '{arms}',                 'barbell',    '2'),
('Dips triceps',            'Dips sur banc pour les triceps',                            '{arms,chest}',           'bodyweight', '1'),
('Pushdown câble',          'Extension triceps à la poulie haute',                       '{arms}',                 'cable',      '1'),
('Extension triceps haltère','Extension unilatérale au-dessus de la tête',              '{arms}',                 'dumbbell',   '1'),

-- ── JAMBES ────────────────────────────────────────────────
('Squat',                   'Roi des exercices de jambes, travail complet',              '{legs,core}',            'barbell',    '2'),
('Squat bulgare',           'Fente bulgare sur un support, travail unilatéral',          '{legs,core}',            'dumbbell',   '2'),
('Presse à jambes',         'Presse 45° pour les quadriceps',                            '{legs}',                 'machine',    '1'),
('Leg curl',                'Curl des ischio-jambiers en machine couché',                '{legs}',                 'machine',    '1'),
('Leg extension',           'Extension des quadriceps en machine assis',                 '{legs}',                 'machine',    '1'),
('Fentes marchées',         'Fentes en marche pour les quadriceps et fessiers',          '{legs,core}',            'dumbbell',   '1'),
('Hip thrust',              'Poussée de hanches pour les fessiers',                      '{legs}',                 'barbell',    '2'),
('Mollets machine debout',  'Élévations de mollets en machine debout',                   '{legs}',                 'machine',    '1'),
('Romanian deadlift',       'Soulevé de terre jambes tendues, focus ischio',             '{legs,back}',            'barbell',    '2'),
('Goblet squat',            'Squat avec kettlebell ou haltère, idéal débutant',          '{legs,core}',            'kettlebell', '1'),

-- ── ABDOMINAUX / CORE ─────────────────────────────────────
('Planche',                 'Gainage isométrique pour le core',                          '{core}',                 'bodyweight', '1'),
('Crunchs',                 'Flexion abdominale partielle',                              '{core}',                 'bodyweight', '1'),
('Relevé de jambes suspendu','Relevé de jambes à la barre pour les abdos bas',           '{core}',                 'bodyweight', '2'),
('Russian twist',           'Rotation du tronc avec poids',                              '{core}',                 'dumbbell',   '1'),
('Ab wheel',                'Roue abdominale pour le core profond',                      '{core}',                 'other',      '3'),
('Mountain climbers',       'Exercice dynamique de core et cardio',                      '{core,cardio}',          'bodyweight', '1'),

-- ── CARDIO / FULL BODY ────────────────────────────────────
('Burpees',                 'Exercice full body à haute intensité',                      '{full_body,cardio}',     'bodyweight', '2'),
('Jumping jacks',           'Exercice cardio de base',                                   '{cardio,full_body}',     'bodyweight', '1'),
('Corde à sauter',          'Cardio efficace, coordination et endurance',                '{cardio,legs}',          'other',      '1'),
('Kettlebell swing',        'Swing pour la chaîne postérieure et le cardio',             '{full_body,cardio}',     'kettlebell', '2'),
('Box jump',                'Saut sur box pour explosivité des jambes',                  '{legs,cardio}',          'other',      '2');

-- ─────────────────────────────────────────────────────────────
-- 10 PROGRAMMES PUBLICS
-- ─────────────────────────────────────────────────────────────

insert into public.workouts (name, description, difficulty, duration_min, muscle_groups, is_public) values
('PPL Push — Débutant',     'Programme Push pour débutant : poitrine, épaules, triceps', '1', 45,  '{chest,shoulders,arms}',  true),
('PPL Pull — Débutant',     'Programme Pull pour débutant : dos, biceps',                '1', 40,  '{back,arms}',             true),
('PPL Legs — Débutant',     'Programme Leg Day pour débutant : quadriceps et ischio',    '1', 45,  '{legs,core}',             true),
('Full Body Force',         'Séance full body avec les grands mouvements composés',      '2', 60,  '{full_body}',             true),
('Upper Body Hypertrophie', 'Travail haut du corps en hypertrophie, 3-4x12',             '2', 55,  '{chest,back,shoulders,arms}', true),
('Leg Day Intensif',        'Séance jambes avancée avec volume élevé',                   '3', 60,  '{legs}',                  true),
('HIIT Cardio 20min',       'Circuit HIIT haute intensité, sans matériel',               '2', 20,  '{cardio,full_body}',      true),
('Core & Mobilité',         'Renforcement du core et travail de mobilité',               '1', 30,  '{core}',                  true),
('Force 5x5',               'Programme de force classique sur 3 mouvements',             '3', 50,  '{full_body}',             true),
('Épaules & Bras',          'Séance isolation épaules et bras, finition',                '2', 45,  '{shoulders,arms}',        true);

-- ─────────────────────────────────────────────────────────────
-- WORKOUT_EXERCISES — PPL Push Débutant (programme 1)
-- ─────────────────────────────────────────────────────────────

with prog as (select id from public.workouts where name = 'PPL Push — Débutant' limit 1),
     ex1  as (select id from public.exercises   where name = 'Développé couché'       limit 1),
     ex2  as (select id from public.exercises   where name = 'Développé incliné'      limit 1),
     ex3  as (select id from public.exercises   where name = 'Dips poitrine'          limit 1),
     ex4  as (select id from public.exercises   where name = 'Développé militaire'    limit 1),
     ex5  as (select id from public.exercises   where name = 'Élévations latérales'   limit 1),
     ex6  as (select id from public.exercises   where name = 'Pushdown câble'         limit 1)
insert into public.workout_exercises (workout_id, exercise_id, order_index)
select prog.id, ex1.id, 1 from prog, ex1 union all
select prog.id, ex2.id, 2 from prog, ex2 union all
select prog.id, ex3.id, 3 from prog, ex3 union all
select prog.id, ex4.id, 4 from prog, ex4 union all
select prog.id, ex5.id, 5 from prog, ex5 union all
select prog.id, ex6.id, 6 from prog, ex6;

-- Séries cibles pour PPL Push
insert into public.workout_sets (workout_exercise_id, set_index, target_reps, target_weight, rest_duration_sec)
select we.id, s.set_index, s.reps, s.weight, s.rest
from public.workout_exercises we
join public.workouts w on w.id = we.workout_id
join public.exercises e on e.id = we.exercise_id
cross join (values (1,10,60,90),(2,10,60,90),(3,10,60,90)) as s(set_index, reps, weight, rest)
where w.name = 'PPL Push — Débutant'
  and e.name in ('Développé couché','Développé incliné','Développé militaire')
union all
select we.id, s.set_index, s.reps, null, s.rest
from public.workout_exercises we
join public.workouts w on w.id = we.workout_id
join public.exercises e on e.id = we.exercise_id
cross join (values (1,10,90),(2,10,90),(3,10,90)) as s(set_index, reps, rest)
where w.name = 'PPL Push — Débutant'
  and e.name in ('Dips poitrine','Élévations latérales','Pushdown câble');

-- ─────────────────────────────────────────────────────────────
-- 15 BADGES
-- ─────────────────────────────────────────────────────────────

insert into public.badges (name, description, icon, color, condition_type, condition_value, xp_reward, is_secret) values
-- Progression sessions
('Première Sueur',        'Complète ta première séance',                   'flame',         '#F97316', 'total_sessions',   1,   50,  false),
('Habitué',               'Complète 10 séances au total',                  'dumbbell',      '#60A5FA', 'total_sessions',   10,  100, false),
('Athlète Confirmé',      'Complète 50 séances au total',                  'trophy',        '#818CF8', 'total_sessions',   50,  250, false),
('Centurion',             'Complète 100 séances au total',                 'crown',         '#F59E0B', 'total_sessions',   100, 500, false),
('Légende Vivante',       'Complète 500 séances — tu es une machine',      'star',          '#EF4444', 'total_sessions',   500, 1000,false),

-- Streaks
('3 Jours d''Affilée',   'Maintiens un streak de 3 jours',                'calendar',      '#34D399', 'streak_days',      3,   75,  false),
('Semaine de Feu',        'Maintiens un streak de 7 jours',                'fire',          '#F97316', 'streak_days',      7,   200, false),
('Mois de Titan',         'Maintiens un streak de 30 jours',               'shield',        '#6366F1', 'streak_days',      30,  500, false),
('100 Jours',             'Streak incroyable de 100 jours consécutifs',    'infinity',      '#EF4444', 'streak_days',      100, 1000,true),

-- XP
('Premier Millier',       'Atteins 1 000 XP total',                        'bolt',          '#60A5FA', 'total_xp',         1000, 0,  false),
('Guerrier XP',           'Atteins 10 000 XP total',                       'sword',         '#818CF8', 'total_xp',         10000,0,  false),
('Maître XP',             'Atteins 50 000 XP total',                       'gem',           '#F59E0B', 'total_xp',         50000,0,  true),

-- Niveaux
('Niveau 5 atteint',      'Atteins le niveau 5',                           'arrow-up',      '#34D399', 'level',            5,   150, false),
('Niveau 8 — Légende',    'Atteins le niveau maximum : Légende',           'medal',         '#EF4444', 'level',            8,   500, true),

-- Perfection
('Perfectionniste',       'Complète 10 séances parfaites (0 série ratée)', 'check-circle',  '#10B981', 'perfect_sessions', 10,  300, false);

-- ─────────────────────────────────────────────────────────────
-- 8 TÂCHES QUOTIDIENNES
-- ─────────────────────────────────────────────────────────────

insert into public.daily_tasks (task_type, name, description, icon, target_value, xp_reward, is_active) values
('steps',   '5 000 pas',            'Marche au moins 5 000 pas aujourd''hui',           'footsteps',     5000,  30,  true),
('steps',   '10 000 pas',           'Atteins l''objectif classique de 10 000 pas',      'footsteps',     10000, 50,  true),
('session', 'Séance du jour',       'Complète une séance d''entraînement aujourd''hui', 'dumbbell',      1,     100, true),
('calories','Brûle 300 kcal',       'Dépense 300 kcal en activité physique',            'fire',          300,   40,  true),
('calories','Brûle 500 kcal',       'Dépense 500 kcal en activité physique',            'fire',          500,   75,  true),
('streak',  'Maintiens ton streak', 'Fais au moins une séance pour maintenir le streak','flame',         1,     25,  true),
('sets',    '30 séries',            'Réalise au moins 30 séries dans la journée',       'list',          30,    60,  true),
('distance','Cours 3 km',           'Parcours 3 km en courant ou marchant vite',        'map-pin',       3,     50,  true);
