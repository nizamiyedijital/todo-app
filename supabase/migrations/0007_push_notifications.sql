-- ============================================================================
-- Migration: 0007_push_notifications
-- Faz: 5.B.3
-- Amaç: Mobile push notification altyapısı.
--       - push_tokens tablosu (user_id × cihaz token'ı)
--       - automation_executions'a push_sent_at kolonu
--       - pg_net extension etkinleştir (Edge Function'a HTTP POST için)
--       - pg_cron schedule: her dk Edge Function URL'ine POST
-- Bağımlılık: 0006_automation_runner
-- Not: Edge Function (send-automation-pushes) ayrı dizinde, deploy edilir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PUSH_TOKENS — user × cihaz push token kaydı
-- ----------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  token           text not null,                                        -- ExponentPushToken[xxx] (mobile) veya web push subscription
  platform        text not null check (platform in ('ios', 'android', 'web')),
  device_label    text,                                                 -- "iPhone 15 Pro" gibi opsiyonel etiket

  last_seen_at    timestamptz not null default now(),                   -- son aktif kullanım
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (token)                                                        -- aynı token tek kayıt
);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

comment on table public.push_tokens is
  'Faz 5.B.3: kullanıcı × cihaz push token kaydı. Logout''ta delete; uygulama boot''unda upsert.';

-- ----------------------------------------------------------------------------
-- 2) AUTOMATION_EXECUTIONS — push_sent_at kolonu ekle
-- ----------------------------------------------------------------------------
alter table public.automation_executions
  add column if not exists push_sent_at timestamptz;

create index if not exists idx_automation_executions_push_pending
  on public.automation_executions (push_sent_at)
  where push_sent_at is null;

-- ----------------------------------------------------------------------------
-- 3) RLS — push_tokens
-- ----------------------------------------------------------------------------
alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_user_all" on public.push_tokens;
create policy "push_tokens_user_all" on public.push_tokens
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_admin_select" on public.push_tokens;
create policy "push_tokens_admin_select" on public.push_tokens
  for select
  using (public.has_any_admin_role(array['admin']::admin_role[]));

grant select, insert, update, delete on public.push_tokens to authenticated;

-- ----------------------------------------------------------------------------
-- 4) PG_NET EXTENSION — Edge Function HTTP POST için
-- ----------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------------------------
-- 5) PG_CRON SCHEDULE — Edge Function her dk çağrılır
-- ----------------------------------------------------------------------------
-- Edge Function URL: https://uzkscrrqyxftbtwkiyra.supabase.co/functions/v1/send-automation-pushes
-- Auth: service role key (Authorization: Bearer ...) — secrets'ten okur
-- Note: pg_cron schedule SQL içinde tanımlı; service role key DB'den okumamız
--       gerek. Bunu vault'a koymak yerine, schedule'i deploy sonrası dashboard'tan
--       da kurabiliriz. Şu an placeholder bırakıyoruz, deploy sırasında set edilir.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'automation-push-dispatcher') then
    perform cron.unschedule('automation-push-dispatcher');
  end if;
exception when others then null;
end$$;

-- pg_cron schedule'i deploy sonrası kurulacak — supabase secrets ile
-- service_role_key alındıktan sonra. Şimdilik manuel schedule helper:
-- (deploy script'i veya manuel admin SQL çalıştırır)
--
-- Örnek (manuel kurulum):
-- select cron.schedule(
--   'automation-push-dispatcher',
--   '* * * * *',
--   $sql$
--     select net.http_post(
--       url := 'https://uzkscrrqyxftbtwkiyra.supabase.co/functions/v1/send-automation-pushes',
--       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
--     );
--   $sql$
-- );

-- ----------------------------------------------------------------------------
-- 6) MIGRATION LOG
-- ----------------------------------------------------------------------------
insert into public._migration_log (version, description)
values ('0007', 'Faz 5.B.3: push_tokens + automation_executions.push_sent_at + pg_net')
on conflict (version) do nothing;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- select cron.unschedule('automation-push-dispatcher');
-- alter table public.automation_executions drop column if exists push_sent_at;
-- drop policy if exists "push_tokens_admin_select" on public.push_tokens;
-- drop policy if exists "push_tokens_user_all" on public.push_tokens;
-- drop table if exists public.push_tokens;
