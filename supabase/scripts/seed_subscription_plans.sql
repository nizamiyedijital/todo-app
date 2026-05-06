-- ============================================================================
-- SEED: subscription_plans (Faz 3.A — canonical TS source ile sync)
--
-- KAYNAK: admin/lib/plans-shared.ts → PLAN_CATALOG
-- Fiyat veya özellik değiştirmek için BUNUN yerine plans-shared.ts'i güncelle,
-- sonra bu seed'i tekrar çalıştır (UPSERT — hem yeni kayıt hem mevcut update).
--
-- Iyzico reference code'ları (`iyzico_pricing_plan_reference_code`) Faz 3.B'de
-- doldurulur — Iyzico'da plan oluşturduktan sonra ayrı bir migration ile.
-- ============================================================================

insert into public.subscription_plans
  (code, name, description, amount, currency, interval, trial_period_days, features, status, display_order)
values
  ('free',
   'Bireysel',
   'Yeni başlayanlar için ücretsiz plan',
   0, 'TRY', 'monthly', 0,
   '["max_active_tasks_100", "max_lists_5", "balance_tracking", "basic_pomodoro"]'::jsonb,
   'active', 1),

  ('pro_monthly_try',
   'Pro Aylık',
   'Sınırsız görev ve tüm gelişmiş özellikler',
   99.00, 'TRY', 'monthly', 0,
   '["unlimited_tasks", "unlimited_lists", "subtasks", "weekly_calendar", "pomodoro_themes", "advanced_stats", "balance_analysis"]'::jsonb,
   'active', 2),

  ('pro_yearly_try',
   'Pro Yıllık',
   '%17 tasarruf — yılda 2 ay bedava',
   990.00, 'TRY', 'yearly', 0,
   '["unlimited_tasks", "unlimited_lists", "subtasks", "weekly_calendar", "pomodoro_themes", "advanced_stats", "balance_analysis"]'::jsonb,
   'active', 3)

on conflict (code) do update set
  name              = excluded.name,
  description       = excluded.description,
  amount            = excluded.amount,
  currency          = excluded.currency,
  interval          = excluded.interval,
  trial_period_days = excluded.trial_period_days,
  features          = excluded.features,
  status            = excluded.status,
  display_order     = excluded.display_order,
  updated_at        = now();

-- Kontrol
select code, name, amount, currency, interval, status, display_order
  from public.subscription_plans
  order by display_order;
