-- ============================================================================
-- Migration: 0005_automation
-- Faz: 5.A
-- Amaç: Otomasyon presetleri — admin'in tanımladığı, belirli tetikleyicilerde
--       (cron veya event) çalışıp kullanıcıya bildirim/banner gönderecek
--       şablon kuralların DB tarafı.
-- Bağımlılık: 0001_admin_foundation (has_any_admin_role)
-- Not: Bu migration sadece SCHEMA + 6 built-in preset SEED içerir.
--      Çalıştırma altyapısı (cron tetiklemesi, event listener, bildirim
--      gönderimi) Faz 5.B'de eklenecek.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) AUTOMATION_PRESETS — kuralların kendisi
-- ----------------------------------------------------------------------------
create table if not exists public.automation_presets (
  id              uuid primary key default gen_random_uuid(),

  -- Tanım
  preset_key      text unique,                                          -- built-in için sabit slug ('incomplete_tasks_login', ...), kullanıcı yarattıysa null
  name            text not null,                                        -- admin görünen ad ("Tamamlanmayan Görevler")
  description     text,                                                 -- kısa açıklama

  -- Tetikleyici
  trigger_type    text not null check (trigger_type in ('cron', 'event')),
  -- trigger_config örnekleri:
  --   cron : { "cron": "0 18 * * *", "timezone": "Europe/Istanbul" }
  --          { "days": ["mon"], "hour": 9, "minute": 0 }              -- cron için iki şekilde de saklanabilir
  --   event: { "event": "login" } | { "event": "pomo_completed" } | { "event": "task_completed" }
  trigger_config  jsonb not null,

  -- Ek koşullar (opsiyonel) — preset çalıştığında ek filtre uygular
  -- Örnek: { "incomplete_tasks_yesterday": true }
  --        { "balance_zero_today": true }
  --        { "daily_pomo_minutes_gt": 0 }
  conditions      jsonb not null default '{}'::jsonb,

  -- Eylem
  action_type     text not null default 'notification' check (action_type in ('notification', 'banner', 'email')),
  -- action_config örnekleri:
  --   { "title": "...", "body": "...", "cta": "Plan yap", "deeplink": "/weekly" }
  action_config   jsonb not null,

  -- Hedef kitle — Faz 5.B+'da segment_id eklenebilir
  audience        text not null default 'all' check (audience in ('all', 'pro', 'free')),

  -- Durum
  is_enabled      boolean not null default true,
  is_built_in     boolean not null default false,                       -- seed ile gelmiş, silinemez

  -- Telemetri (Faz 5.B'de runner doldurur)
  last_triggered_at timestamptz,
  trigger_count   integer not null default 0,

  -- Audit
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null
);

create index if not exists idx_automation_presets_enabled on public.automation_presets(is_enabled) where is_enabled;
create index if not exists idx_automation_presets_trigger_type on public.automation_presets(trigger_type);

comment on table public.automation_presets is
  'Faz 5.A: admin tanımlı otomasyon kuralları. Çalıştırma altyapısı 5.B''de.';

-- ----------------------------------------------------------------------------
-- 2) updated_at otomatik güncelleme trigger'ı
-- ----------------------------------------------------------------------------
create or replace function public.tg_automation_presets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_automation_presets_updated_at on public.automation_presets;
create trigger tr_automation_presets_updated_at
  before update on public.automation_presets
  for each row execute function public.tg_automation_presets_updated_at();

-- ----------------------------------------------------------------------------
-- 3) ROW LEVEL SECURITY — sadece admin
-- ----------------------------------------------------------------------------
alter table public.automation_presets enable row level security;

drop policy if exists "automation_presets_admin_all" on public.automation_presets;
create policy "automation_presets_admin_all" on public.automation_presets
  for all
  using (public.has_any_admin_role(array['admin']::admin_role[]))
  with check (public.has_any_admin_role(array['admin']::admin_role[]));

-- ----------------------------------------------------------------------------
-- 4) GRANT'LER
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on public.automation_presets to authenticated;

-- ----------------------------------------------------------------------------
-- 5) BUILT-IN 6 PRESET SEED
-- ----------------------------------------------------------------------------
-- 1) Tamamlanmayan Görevler — login event'inde, dünden kalan görev varsa banner
insert into public.automation_presets (preset_key, name, description, trigger_type, trigger_config, conditions, action_type, action_config, is_enabled, is_built_in)
values (
  'incomplete_tasks_login',
  'Tamamlanmayan Görevler',
  'Oturum açıldığında, dünden tamamlanmamış görevleri hatırlatır ve yeniden planlamayı önerir.',
  'event',
  jsonb_build_object('event', 'login'),
  jsonb_build_object('incomplete_tasks_yesterday', true),
  'banner',
  jsonb_build_object(
    'title', 'Dünden tamamlanmamış görevlerin var',
    'body', 'Bu görevleri yeniden planlamak ister misin?',
    'cta', 'Yeniden planla',
    'deeplink', '/weekly?focus=yesterday'
  ),
  true,
  true
)
on conflict (preset_key) do nothing;

-- 2a) Haftalık Plan — Cuma 15:00
insert into public.automation_presets (preset_key, name, description, trigger_type, trigger_config, conditions, action_type, action_config, is_enabled, is_built_in)
values (
  'weekly_plan_friday',
  'Haftalık Plan — Cuma',
  'Cuma 15:00''te önümüzdeki haftanın öncelikli görevlerini planlama hatırlatması.',
  'cron',
  jsonb_build_object('days', jsonb_build_array('fri'), 'hour', 15, 'minute', 0, 'timezone', 'Europe/Istanbul'),
  jsonb_build_object(),
  'notification',
  jsonb_build_object(
    'title', 'Önümüzdeki haftayı planla',
    'body', 'Önceliklerini şimdiden belirle, haftaya hazırlıklı başla.',
    'cta', 'Planla',
    'deeplink', '/weekly'
  ),
  true,
  true
)
on conflict (preset_key) do nothing;

-- 2b) Haftalık Plan — Cumartesi 11:00
insert into public.automation_presets (preset_key, name, description, trigger_type, trigger_config, conditions, action_type, action_config, is_enabled, is_built_in)
values (
  'weekly_plan_saturday',
  'Haftalık Plan — Cumartesi',
  'Cumartesi 11:00''de önümüzdeki haftanın görevlerini planlama hatırlatması (Cuma''da kaçırdıysan).',
  'cron',
  jsonb_build_object('days', jsonb_build_array('sat'), 'hour', 11, 'minute', 0, 'timezone', 'Europe/Istanbul'),
  jsonb_build_object(),
  'notification',
  jsonb_build_object(
    'title', 'Haftayı planlama vakti',
    'body', 'Hafta sonu planını yap; pazartesiye odaklanmış başla.',
    'cta', 'Planla',
    'deeplink', '/weekly'
  ),
  true,
  true
)
on conflict (preset_key) do nothing;

-- 3) Denge Uyarı — her gün 18:00, bir kategori 0 dk ise nazik bildirim
insert into public.automation_presets (preset_key, name, description, trigger_type, trigger_config, conditions, action_type, action_config, is_enabled, is_built_in)
values (
  'balance_warning_evening',
  'Denge Uyarı',
  'Her gün 18:00''de denge kategorilerine bakar; bir kategori 0 dk ise nazik bir öneriyle hatırlatır.',
  'cron',
  jsonb_build_object('days', jsonb_build_array('mon','tue','wed','thu','fri','sat','sun'), 'hour', 18, 'minute', 0, 'timezone', 'Europe/Istanbul'),
  jsonb_build_object('balance_zero_category_today', true),
  'notification',
  jsonb_build_object(
    'title', 'Bugün dengenden eksik bir parça var',
    'body', 'Beden için 30 dk yürüyüş, 20 squat veya 30 mekik gibi küçük bir görev ekle. Zihin için 10 dk okuma, kalp için 5 dk şükür/derin nefes önerebilirim.',
    'cta', 'Görev ekle',
    'deeplink', '/?addBalance=missing'
  ),
  true,
  true
)
on conflict (preset_key) do nothing;

-- 4) Hafta başı özeti — Pazartesi 09:00
insert into public.automation_presets (preset_key, name, description, trigger_type, trigger_config, conditions, action_type, action_config, is_enabled, is_built_in)
values (
  'monday_summary',
  'Hafta başı özeti',
  'Pazartesi 09:00''da gelen hafta için özet: yıldızlı görev sayısı, toplam görev, öncelikli görev sayısı.',
  'cron',
  jsonb_build_object('days', jsonb_build_array('mon'), 'hour', 9, 'minute', 0, 'timezone', 'Europe/Istanbul'),
  jsonb_build_object(),
  'notification',
  jsonb_build_object(
    'title', 'Bu haftan {starred_count} odak görevi içeriyor',
    'body', '{lists_count} listede toplam {total_count} görev planladın; bunlardan {priority_count} tanesi öncelikli.',
    'cta', 'Haftaya bak',
    'deeplink', '/weekly'
  ),
  true,
  true
)
on conflict (preset_key) do nothing;

-- 5) Pomodoro sonrası geri bildirim — pomo_completed event
insert into public.automation_presets (preset_key, name, description, trigger_type, trigger_config, conditions, action_type, action_config, is_enabled, is_built_in)
values (
  'pomo_completed_feedback',
  'Pomodoro sonrası geri bildirim',
  'Bir pomodoro tamamlandığında, günün toplam pomodoro süresi ve tamamlanan görev sayısıyla motive eden kısa bir mesaj gösterir.',
  'event',
  jsonb_build_object('event', 'pomo_completed'),
  jsonb_build_object(),
  'notification',
  jsonb_build_object(
    'title', 'Bugün {pomo_minutes_today} dk odaklı çalıştın',
    'body', 'Bugün {tasks_completed_today} görev tamamladın. Yarım kalsa bile zamana riayet etmen, bir süre sonra blok çalışma ritmine alıştıracak.',
    'cta', null,
    'deeplink', '/stats'
  ),
  true,
  true
)
on conflict (preset_key) do nothing;

-- ----------------------------------------------------------------------------
-- 6) MIGRATION LOG
-- ----------------------------------------------------------------------------
insert into public._migration_log (version, description)
values ('0005', 'Faz 5.A: automation_presets schema + 6 built-in preset seed')
on conflict (version) do nothing;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- drop trigger if exists tr_automation_presets_updated_at on public.automation_presets;
-- drop function if exists public.tg_automation_presets_updated_at();
-- drop policy if exists "automation_presets_admin_all" on public.automation_presets;
-- drop table if exists public.automation_presets;
