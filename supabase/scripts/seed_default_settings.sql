-- ============================================================================
-- SEED: Varsayılan app_settings ve feature_flags
-- Çalıştırma: Migration'lardan sonra bir kez
-- Idempotent: tekrar çalıştırılabilir, üzerine yazmaz
-- ============================================================================

-- App Settings (varsayılan plan limitleri ve genel ayarlar)
insert into public.app_settings (key, value, description) values
  ('free_max_lists',         '5'::jsonb,                       'Free plan kullanıcı için maksimum liste sayısı'),
  ('free_max_tasks_per_list','100'::jsonb,                     'Free plan liste başına maksimum görev'),
  ('free_max_subtasks',      '5'::jsonb,                       'Free plan görev başına maksimum alt görev'),
  ('pro_max_lists',          '50'::jsonb,                      'Pro plan maksimum liste'),
  ('pro_max_tasks_per_list', '1000'::jsonb,                    'Pro plan liste başına maksimum görev'),
  ('default_balance_target', '{"mind":480,"body":120,"spirit":40}'::jsonb, 'Varsayılan denge hedefleri (dakika)'),
  ('maintenance_mode',       'false'::jsonb,                   'Bakım modu — true ise login dışı her şey kapalı'),
  ('maintenance_message',    '"Disiplan bakımda. Kısa süre içinde döneceğiz."'::jsonb, 'Bakım modu mesajı'),
  ('signup_enabled',         'true'::jsonb,                    'Yeni kayıtlara açık mı'),
  ('support_email',          '"destek@disiplan.app"'::jsonb,   'Destek e-posta adresi'),
  ('app_version_min_web',    '"1.0.0"'::jsonb,                 'Desteklenen minimum web versiyonu'),
  ('app_version_min_mobile', '"1.0.0"'::jsonb,                 'Desteklenen minimum mobile versiyonu')
on conflict (key) do nothing;

-- Feature Flags (Faz 2+ için hazır)
insert into public.feature_flags (key, enabled, description, rollout_percent) values
  ('admin_panel_v1',     true,  'Admin paneli aktif (Faz 1)', 100),
  ('subscription_billing', false, 'Iyzico ödeme akışı aktif (Faz 3)', 0),
  ('ai_assistant',       false, 'AI yönetim asistanı (Faz 7)', 0),
  ('team_workspaces',    false, 'Kurumsal/team özellikleri (Faz 6)', 0),
  ('automation_engine',  false, 'Otomatik akışlar (Faz 5)', 0),
  ('advanced_analytics', false, 'Gelişmiş analitik dashboardları (Faz 2)', 0)
on conflict (key) do nothing;

-- Varsayılan subscription planları (Iyzico ref code'lar boş — Faz 3'te doldurulur)
insert into public.subscription_plans
  (code, name, description, amount, currency, interval, trial_period_days, features, status, display_order)
values
  ('free',
   'Free',
   'Disiplan temel özellikleri, ücretsiz',
   0, 'TRY', 'monthly', 0,
   '["basic_lists", "basic_tasks", "balance_tracking"]'::jsonb,
   'active', 0),

  ('pro_monthly_try',
   'Disiplan Pro Aylık',
   'Tüm özellikler, sınırsız liste, bulut senkronizasyon',
   49.90, 'TRY', 'monthly', 7,
   '["unlimited_lists", "unlimited_tasks", "cloud_sync", "advanced_stats", "priority_support"]'::jsonb,
   'active', 1),

  ('pro_yearly_try',
   'Disiplan Pro Yıllık',
   'Pro planın yıllık versiyonu — 2 ay bedava',
   499.00, 'TRY', 'yearly', 7,
   '["unlimited_lists", "unlimited_tasks", "cloud_sync", "advanced_stats", "priority_support"]'::jsonb,
   'active', 2)

on conflict (code) do nothing;

-- Kontrol
select 'app_settings' as kind, count(*) as count from public.app_settings
union all select 'feature_flags', count(*) from public.feature_flags
union all select 'subscription_plans', count(*) from public.subscription_plans;
