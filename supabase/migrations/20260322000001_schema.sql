-- ============================================================
-- GainXP — Schéma complet Supabase
-- Migration : 20260322000001_schema.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- recherche full-text exercices

-- ─────────────────────────────────────────────────────────────
-- TYPES ÉNUMÉRÉS
-- ─────────────────────────────────────────────────────────────

create type muscle_group as enum (
  'chest','back','shoulders','arms','legs','core','cardio','full_body'
);

create type difficulty_level as enum ('1','2','3');

create type equipment_type as enum (
  'barbell','dumbbell','machine','cable','bodyweight','kettlebell','band','other'
);

create type session_status as enum ('in_progress','completed','abandoned');

create type task_type as enum ('steps','session','calories','streak','sets','distance');

create type badge_condition_type as enum (
  'total_sessions','streak_days','total_xp','level','badge_count','perfect_sessions'
);

-- ─────────────────────────────────────────────────────────────
-- 1. USER_PROFILES
-- ─────────────────────────────────────────────────────────────

create table public.user_profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,
  username          text        not null unique,
  avatar_url        text,
  level             int         not null default 1,
  current_xp        int         not null default 0,
  total_xp          int         not null default 0,
  streak_days       int         not null default 0,
  longest_streak    int         not null default 0,
  last_session_date date,
  total_sessions    int         not null default 0,
  total_minutes     int         not null default 0,
  total_sets        int         not null default 0,
  total_reps        int         not null default 0,
  weight_kg         numeric(5,2),
  height_cm         int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. EXERCISES
-- ─────────────────────────────────────────────────────────────

create table public.exercises (
  id             uuid           primary key default uuid_generate_v4(),
  name           text           not null,
  description    text,
  muscle_groups  muscle_group[] not null,
  equipment      equipment_type not null default 'bodyweight',
  difficulty     difficulty_level not null default '1',
  instructions   text[],          -- étapes d'exécution
  tips           text[],          -- conseils de forme
  video_url      text,
  thumbnail_url  text,
  is_public      boolean        not null default true,
  created_by     uuid           references public.user_profiles(id) on delete set null,
  created_at     timestamptz    not null default now()
);

create index exercises_muscle_groups_idx on public.exercises using gin(muscle_groups);
create index exercises_name_trgm_idx on public.exercises using gin(name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- 3. WORKOUTS (programmes)
-- ─────────────────────────────────────────────────────────────

create table public.workouts (
  id            uuid        primary key default uuid_generate_v4(),
  name          text        not null,
  description   text,
  difficulty    difficulty_level not null default '1',
  duration_min  int,                          -- durée estimée en minutes
  muscle_groups muscle_group[],
  thumbnail_url text,
  is_public     boolean     not null default false,
  created_by    uuid        references public.user_profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. WORKOUT_EXERCISES (exercices dans un programme)
-- ─────────────────────────────────────────────────────────────

create table public.workout_exercises (
  id          uuid    primary key default uuid_generate_v4(),
  workout_id  uuid    not null references public.workouts(id) on delete cascade,
  exercise_id uuid    not null references public.exercises(id) on delete cascade,
  order_index int     not null,               -- position dans le programme
  notes       text,                           -- consigne spécifique
  unique (workout_id, order_index)
);

-- ─────────────────────────────────────────────────────────────
-- 5. WORKOUT_SETS (séries cibles)
-- ─────────────────────────────────────────────────────────────

create table public.workout_sets (
  id                  uuid           primary key default uuid_generate_v4(),
  workout_exercise_id uuid           not null references public.workout_exercises(id) on delete cascade,
  set_index           int            not null,   -- numéro de la série
  target_reps         int,
  target_weight       numeric(6,2),
  target_duration_sec int,                       -- pour exercices en temps
  rest_duration_sec   int            not null default 60,
  unique (workout_exercise_id, set_index)
);

-- ─────────────────────────────────────────────────────────────
-- 6. SESSIONS (séances réalisées)
-- ─────────────────────────────────────────────────────────────

create table public.sessions (
  id              uuid           primary key default uuid_generate_v4(),
  user_id         uuid           not null references public.user_profiles(id) on delete cascade,
  workout_id      uuid           references public.workouts(id) on delete set null,
  status          session_status not null default 'in_progress',
  started_at      timestamptz    not null default now(),
  completed_at    timestamptz,
  duration_sec    int,
  xp_earned       int            not null default 0,
  is_perfect      boolean        not null default false, -- toutes séries complétées
  notes           text,
  created_at      timestamptz    not null default now()
);

create index sessions_user_id_idx on public.sessions(user_id);
create index sessions_status_idx  on public.sessions(status);

-- ─────────────────────────────────────────────────────────────
-- 7. COMPLETED_SETS (séries réalisées)
-- ─────────────────────────────────────────────────────────────

create table public.completed_sets (
  id                  uuid        primary key default uuid_generate_v4(),
  session_id          uuid        not null references public.sessions(id) on delete cascade,
  exercise_id         uuid        not null references public.exercises(id) on delete cascade,
  workout_exercise_id uuid        references public.workout_exercises(id) on delete set null,
  set_index           int         not null,
  actual_reps         int,
  actual_weight       numeric(6,2),
  actual_duration_sec int,
  rpe                 int check (rpe between 1 and 10), -- perceived exertion
  completed_at        timestamptz not null default now()
);

create index completed_sets_session_idx on public.completed_sets(session_id);

-- ─────────────────────────────────────────────────────────────
-- 8. BADGES
-- ─────────────────────────────────────────────────────────────

create table public.badges (
  id              uuid                 primary key default uuid_generate_v4(),
  name            text                 not null unique,
  description     text                 not null,
  icon            text                 not null,
  color           text                 not null default '#6C63FF',
  condition_type  badge_condition_type not null,
  condition_value int                  not null,  -- valeur seuil
  xp_reward       int                  not null default 0,
  is_secret       boolean              not null default false,
  created_at      timestamptz          not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 9. USER_BADGES
-- ─────────────────────────────────────────────────────────────

create table public.user_badges (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.user_profiles(id) on delete cascade,
  badge_id   uuid        not null references public.badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  unique (user_id, badge_id)
);

create index user_badges_user_idx on public.user_badges(user_id);

-- ─────────────────────────────────────────────────────────────
-- 10. DAILY_TASKS
-- ─────────────────────────────────────────────────────────────

create table public.daily_tasks (
  id           uuid      primary key default uuid_generate_v4(),
  task_type    task_type not null,
  name         text      not null,
  description  text,
  icon         text      not null,
  target_value int       not null,
  xp_reward    int       not null default 50,
  is_active    boolean   not null default true,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 11. USER_DAILY_TASKS
-- ─────────────────────────────────────────────────────────────

create table public.user_daily_tasks (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references public.user_profiles(id) on delete cascade,
  task_id       uuid        not null references public.daily_tasks(id) on delete cascade,
  date          date        not null default current_date,
  current_value int         not null default 0,
  is_completed  boolean     not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, task_id, date)
);

create index user_daily_tasks_user_date_idx on public.user_daily_tasks(user_id, date);

-- ─────────────────────────────────────────────────────────────
-- 12. HEALTH_DATA
-- ─────────────────────────────────────────────────────────────

create table public.health_data (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.user_profiles(id) on delete cascade,
  date              date        not null default current_date,
  steps             int,
  calories_active   int,
  calories_total    int,
  heart_rate_avg    int,
  heart_rate_max    int,
  sleep_hours       numeric(4,2),
  sleep_quality     int check (sleep_quality between 1 and 5),
  distance_km       numeric(6,3),
  active_minutes    int,
  source            text default 'manual', -- 'healthkit','googlefit','manual'
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, date)
);

create index health_data_user_date_idx on public.health_data(user_id, date desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.user_profiles      enable row level security;
alter table public.exercises           enable row level security;
alter table public.workouts            enable row level security;
alter table public.workout_exercises   enable row level security;
alter table public.workout_sets        enable row level security;
alter table public.sessions            enable row level security;
alter table public.completed_sets      enable row level security;
alter table public.badges              enable row level security;
alter table public.user_badges         enable row level security;
alter table public.daily_tasks         enable row level security;
alter table public.user_daily_tasks    enable row level security;
alter table public.health_data         enable row level security;

-- ─────────────────────────────────────────────────────────────
-- POLICIES — user_profiles
-- ─────────────────────────────────────────────────────────────

create policy "user_profiles: lecture propre"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "user_profiles: création propre"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "user_profiles: modification propre"
  on public.user_profiles for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — exercises
-- ─────────────────────────────────────────────────────────────

create policy "exercises: lecture publique ou propre"
  on public.exercises for select
  using (is_public = true or auth.uid() = created_by);

create policy "exercises: création authentifiée"
  on public.exercises for insert
  with check (auth.uid() = created_by);

create policy "exercises: modification propre"
  on public.exercises for update
  using (auth.uid() = created_by);

create policy "exercises: suppression propre"
  on public.exercises for delete
  using (auth.uid() = created_by);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — workouts
-- ─────────────────────────────────────────────────────────────

create policy "workouts: lecture publique ou propre"
  on public.workouts for select
  using (is_public = true or auth.uid() = created_by);

create policy "workouts: création authentifiée"
  on public.workouts for insert
  with check (auth.uid() = created_by);

create policy "workouts: modification propre"
  on public.workouts for update
  using (auth.uid() = created_by);

create policy "workouts: suppression propre"
  on public.workouts for delete
  using (auth.uid() = created_by);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — workout_exercises & workout_sets
-- (visibles si le workout parent est accessible)
-- ─────────────────────────────────────────────────────────────

create policy "workout_exercises: lecture via workout"
  on public.workout_exercises for select
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id
        and (w.is_public = true or w.created_by = auth.uid())
    )
  );

create policy "workout_exercises: écriture propre"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.created_by = auth.uid()
    )
  );

create policy "workout_sets: lecture via workout"
  on public.workout_sets for select
  using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id
        and (w.is_public = true or w.created_by = auth.uid())
    )
  );

create policy "workout_sets: écriture propre"
  on public.workout_sets for all
  using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_exercise_id and w.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- POLICIES — sessions
-- ─────────────────────────────────────────────────────────────

create policy "sessions: propre uniquement"
  on public.sessions for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — completed_sets
-- ─────────────────────────────────────────────────────────────

create policy "completed_sets: propre uniquement"
  on public.completed_sets for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- POLICIES — badges (lecture publique, écriture admin)
-- ─────────────────────────────────────────────────────────────

create policy "badges: lecture publique"
  on public.badges for select
  using (true);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — user_badges
-- ─────────────────────────────────────────────────────────────

create policy "user_badges: propre uniquement"
  on public.user_badges for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — daily_tasks (lecture publique)
-- ─────────────────────────────────────────────────────────────

create policy "daily_tasks: lecture publique"
  on public.daily_tasks for select
  using (true);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — user_daily_tasks
-- ─────────────────────────────────────────────────────────────

create policy "user_daily_tasks: propre uniquement"
  on public.user_daily_tasks for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — health_data
-- ─────────────────────────────────────────────────────────────

create policy "health_data: propre uniquement"
  on public.health_data for all
  using (auth.uid() = user_id);

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- add_xp : ajoute XP et recalcule le niveau
-- ─────────────────────────────────────────────────────────────

create or replace function public.add_xp(
  p_user_id uuid,
  p_amount  int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_xp int;
  v_new_level int;
begin
  -- Mise à jour du total XP
  update user_profiles
  set
    current_xp = current_xp + p_amount,
    total_xp   = total_xp   + p_amount,
    updated_at = now()
  where id = p_user_id
  returning total_xp into v_total_xp;

  -- Calcul du niveau à partir des seuils (progression exponentielle)
  -- Seuils : niv1=0, niv2=500, niv3=1500, niv4=4000, niv5=9000,
  --          niv6=18000, niv7=35000, niv8=60000
  v_new_level := case
    when v_total_xp >= 60000 then 8
    when v_total_xp >= 35000 then 7
    when v_total_xp >= 18000 then 6
    when v_total_xp >= 9000  then 5
    when v_total_xp >= 4000  then 4
    when v_total_xp >= 1500  then 3
    when v_total_xp >= 500   then 2
    else 1
  end;

  -- Mise à jour du niveau uniquement si changement
  update user_profiles
  set level = v_new_level, updated_at = now()
  where id = p_user_id and level <> v_new_level;

  -- Vérification des badges après gain XP
  perform public.check_and_award_badges(p_user_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- check_and_award_badges : attribue tous les badges mérités
-- ─────────────────────────────────────────────────────────────

create or replace function public.check_and_award_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile     user_profiles%rowtype;
  v_badge       badges%rowtype;
  v_badge_count int;
  v_perf_count  int;
  v_condition   bool;
begin
  select * into v_profile from user_profiles where id = p_user_id;
  select count(*) into v_badge_count from user_badges where user_id = p_user_id;
  select count(*) into v_perf_count
    from sessions where user_id = p_user_id and is_perfect = true;

  -- Parcours de tous les badges non encore obtenus
  for v_badge in
    select b.* from badges b
    where not exists (
      select 1 from user_badges ub
      where ub.user_id = p_user_id and ub.badge_id = b.id
    )
  loop
    v_condition := case v_badge.condition_type
      when 'total_sessions'   then v_profile.total_sessions   >= v_badge.condition_value
      when 'streak_days'      then v_profile.streak_days       >= v_badge.condition_value
      when 'total_xp'         then v_profile.total_xp          >= v_badge.condition_value
      when 'level'            then v_profile.level             >= v_badge.condition_value
      when 'badge_count'      then v_badge_count               >= v_badge.condition_value
      when 'perfect_sessions' then v_perf_count                >= v_badge.condition_value
      else false
    end;

    if v_condition then
      -- Attribution du badge
      insert into user_badges (user_id, badge_id)
      values (p_user_id, v_badge.id)
      on conflict do nothing;

      -- Récompense XP du badge (sans récursion infinie)
      if v_badge.xp_reward > 0 then
        update user_profiles
        set current_xp = current_xp + v_badge.xp_reward,
            total_xp   = total_xp   + v_badge.xp_reward,
            updated_at = now()
        where id = p_user_id;
      end if;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Trigger : updated_at automatique
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

create trigger workouts_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

create trigger health_data_updated_at
  before update on public.health_data
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Trigger : session → completed → maj profil + XP
-- ─────────────────────────────────────────────────────────────

create or replace function public.on_session_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today          date := current_date;
  v_last_session   date;
  v_xp_earned      int  := new.xp_earned;
  v_sets_count     int;
  v_reps_count     int;
  v_duration_min   int  := coalesce(new.duration_sec / 60, 0);
begin
  -- Traitement uniquement lors du passage à "completed"
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  -- Nombre de séries et répétitions réalisées
  select
    count(*),
    coalesce(sum(actual_reps), 0)
  into v_sets_count, v_reps_count
  from completed_sets
  where session_id = new.id;

  -- Récupération de la dernière date de séance
  select last_session_date into v_last_session
  from user_profiles where id = new.user_id;

  -- Mise à jour du profil
  update user_profiles
  set
    total_sessions    = total_sessions + 1,
    total_minutes     = total_minutes  + v_duration_min,
    total_sets        = total_sets     + v_sets_count,
    total_reps        = total_reps     + v_reps_count,
    last_session_date = v_today,
    -- Gestion du streak
    streak_days = case
      when last_session_date = v_today - interval '1 day'
        then streak_days + 1
      when last_session_date = v_today
        then streak_days  -- déjà compté aujourd'hui
      else 1              -- streak rompu → remise à 1
    end,
    longest_streak = greatest(
      longest_streak,
      case
        when last_session_date = v_today - interval '1 day' then streak_days + 1
        when last_session_date = v_today then streak_days
        else 1
      end
    ),
    updated_at = now()
  where id = new.user_id;

  -- XP de base pour la séance
  perform public.add_xp(new.user_id, v_xp_earned);

  return new;
end;
$$;

create trigger session_completed_trigger
  after update of status on public.sessions
  for each row execute function public.on_session_completed();

-- ─────────────────────────────────────────────────────────────
-- Trigger : user_daily_tasks → is_completed → ajoute XP
-- ─────────────────────────────────────────────────────────────

create or replace function public.on_daily_task_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp_reward int;
begin
  -- Traitement uniquement lors du passage à completed
  if new.is_completed = false or old.is_completed = true then
    return new;
  end if;

  -- Heure de completion
  new.completed_at = now();

  -- Récupération de la récompense XP de la tâche
  select xp_reward into v_xp_reward
  from daily_tasks where id = new.task_id;

  perform public.add_xp(new.user_id, coalesce(v_xp_reward, 0));

  return new;
end;
$$;

create trigger daily_task_completed_trigger
  before update of is_completed on public.user_daily_tasks
  for each row execute function public.on_daily_task_completed();

-- ─────────────────────────────────────────────────────────────
-- Trigger : création auto du profil à l'inscription
-- ─────────────────────────────────────────────────────────────

create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.on_auth_user_created();
