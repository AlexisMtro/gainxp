-- ============================================================
-- GainXP — Préférences de notifications utilisateur
-- Migration : 20260402000001_notification_preferences.sql
-- ============================================================

alter table public.user_profiles
  add column if not exists notification_preferences jsonb not null default '{
    "workout_reminder_enabled": false,
    "workout_reminder_hour": 9,
    "workout_reminder_minute": 0,
    "workout_reminder_days": [],
    "streak_danger_enabled": true,
    "daily_tasks_reminder_enabled": false,
    "daily_tasks_reminder_hour": 8,
    "daily_tasks_reminder_minute": 0
  }'::jsonb;
