-- ============================================================================
-- Migration: 0006_automation_runner
-- Faz: 5.B.2
-- Amaç: Cron tabanlı otomasyon presetlerinin runtime'ı.
--       - automation_executions log tablosu (idempotency + okundu takibi)
--       - process_cron_automations() SECURITY DEFINER function (her dk çalışır)
--       - pg_cron schedule
-- Bağımlılık: 0005_automation
-- Not: Client RPC'leri (get_pending_automations / mark_automation_seen)
--      ayrı bir bölümde, aynı dosyada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) AUTOMATION_EXECUTIONS — kullanıcı bazlı tetikleme log'u
-- ----------------------------------------------------------------------------
create table if not exists public.automation_executions (
  id              bigserial primary key,
  preset_id       uuid not null references public.automation_presets(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Cron için: presetin "tetiklenmesi gereken" datetime (idempotency anahtarı)
  -- Event için: trigger anı (idempotency YOK; client tarafında localStorage/AsyncStorage)
  scheduled_for   timestamptz not null,

  -- Snapshot: preset değiştirilse de bu kayıt o zamanki içeriği taşısın
  title_snapshot  text not null,
  body_snapshot   text not null,
  cta_snapshot    text,
  deeplink_snapshot text,

  -- Kullanıcı görüş/dismiss durumu
  seen_at         timestamptz,                                          -- null = görülmedi (banner gösterilmeli)
  dismissed_at    timestamptz,                                          -- null = dismiss edilmedi

  created_at      timestamptz not null default now()
);

-- Aynı kullanıcıya, aynı preset için, aynı planlanmış zaman → sadece 1 execution
create unique index if not exists idx_automation_executions_unique
  on public.automation_executions (preset_id, user_id, scheduled_for);

create index if not exists idx_automation_executions_user_pending
  on public.automation_executions (user_id, seen_at)
  where seen_at is null;

comment on table public.automation_executions is
  'Faz 5.B.2: cron preset tetiklemelerinin per-user log''u. seen_at=null ise client banner göstermeli.';

-- ----------------------------------------------------------------------------
-- 2) RLS — user kendi execution'larını okur, admin hepsini
-- ----------------------------------------------------------------------------
alter table public.automation_executions enable row level security;

drop policy if exists "executions_user_select" on public.automation_executions;
create policy "executions_user_select" on public.automation_executions
  for select
  using (user_id = auth.uid() or public.has_any_admin_role(array['admin']::admin_role[]));

drop policy if exists "executions_user_update" on public.automation_executions;
create policy "executions_user_update" on public.automation_executions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- INSERT yalnızca SECURITY DEFINER function tarafından (service role bypass değil,
-- ama runner function'ı definer olarak çalışıyor) — direct INSERT engellenir
drop policy if exists "executions_no_direct_insert" on public.automation_executions;
create policy "executions_no_direct_insert" on public.automation_executions
  for insert
  with check (false);  -- function bypass eder; doğrudan client INSERT atamaz

grant select, update on public.automation_executions to authenticated;
grant usage, select on sequence public.automation_executions_id_seq to authenticated;

-- ----------------------------------------------------------------------------
-- 3) RUNNER — process_cron_automations(): her dk pg_cron'dan çağrılır
-- ----------------------------------------------------------------------------
-- Yardımcı: weekday short ('mon', 'tue', ..., 'sun')
create or replace function public.weekday_short(t timestamptz, tz text default 'Europe/Istanbul')
returns text
language plpgsql
immutable
as $$
declare
  dow int;
begin
  dow := extract(dow from t at time zone tz)::int;  -- 0=Sun .. 6=Sat
  return case dow
    when 0 then 'sun'
    when 1 then 'mon'
    when 2 then 'tue'
    when 3 then 'wed'
    when 4 then 'thu'
    when 5 then 'fri'
    when 6 then 'sat'
  end;
end;
$$;

create or replace function public.process_cron_automations()
returns table(processed_preset_id uuid, processed_user_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  preset record;
  cron_days jsonb;
  cron_hour int;
  cron_minute int;
  cron_tz text;
  current_local timestamptz;
  current_dow text;
  current_hour int;
  current_minute int;
  scheduled_at timestamptz;
  inserted_count int;
begin
  for preset in
    select id, name, trigger_config, action_config, audience, conditions
    from public.automation_presets
    where is_enabled = true
      and trigger_type = 'cron'
  loop
    cron_days := preset.trigger_config -> 'days';
    cron_hour := (preset.trigger_config ->> 'hour')::int;
    cron_minute := (preset.trigger_config ->> 'minute')::int;
    cron_tz := coalesce(preset.trigger_config ->> 'timezone', 'Europe/Istanbul');

    if cron_days is null or cron_hour is null or cron_minute is null then
      continue;
    end if;

    current_local := now() at time zone cron_tz;
    current_dow := public.weekday_short(now(), cron_tz);
    current_hour := extract(hour from current_local)::int;
    current_minute := extract(minute from current_local)::int;

    -- Gün eşleşmesi
    if not (cron_days ? current_dow) then
      continue;
    end if;
    -- Saat:dk eşleşmesi (dakika hassasiyeti)
    if current_hour <> cron_hour or current_minute <> cron_minute then
      continue;
    end if;

    -- scheduled_for: bu presetin bugün için tetiklenmesi gereken UTC anı
    -- (idempotency anahtarı; aynı anda 2. çalışma INSERT yapamaz)
    scheduled_at := date_trunc('minute', now());

    -- Her authenticated user için (audience='all' şimdilik; pro/free ayrımı 5.B.3+)
    -- INSERT ON CONFLICT DO NOTHING — idempotent
    insert into public.automation_executions
      (preset_id, user_id, scheduled_for, title_snapshot, body_snapshot, cta_snapshot, deeplink_snapshot)
    select
      preset.id,
      u.id,
      scheduled_at,
      coalesce(preset.action_config ->> 'title', ''),
      coalesce(preset.action_config ->> 'body', ''),
      preset.action_config ->> 'cta',
      preset.action_config ->> 'deeplink'
    from auth.users u
    where (
      preset.audience = 'all'
      -- audience='pro' ve 'free' subscription tablosuyla join 5.B.3'te eklenecek
    )
    on conflict (preset_id, user_id, scheduled_for) do nothing;

    get diagnostics inserted_count = row_count;

    -- Telemetri update
    if inserted_count > 0 then
      update public.automation_presets
      set last_triggered_at = now(),
          trigger_count = trigger_count + 1
      where id = preset.id;
    end if;

    processed_preset_id := preset.id;
    processed_user_count := inserted_count;
    return next;
  end loop;
end;
$$;

comment on function public.process_cron_automations() is
  'Her dakika pg_cron''dan çağrılır. Eşleşen cron preset''leri için tüm authenticated user''lara execution log INSERT eder (idempotent).';

revoke all on function public.process_cron_automations() from public;
grant execute on function public.process_cron_automations() to postgres;

-- ----------------------------------------------------------------------------
-- 4) CLIENT RPC'LERİ — get_pending + mark_seen (SECURITY INVOKER, RLS uygulanır)
-- ----------------------------------------------------------------------------
create or replace function public.get_pending_automations()
returns table(
  execution_id    bigint,
  preset_id       uuid,
  preset_name     text,
  scheduled_for   timestamptz,
  title           text,
  body            text,
  cta             text,
  deeplink        text
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    e.id, e.preset_id, p.name,
    e.scheduled_for,
    e.title_snapshot, e.body_snapshot,
    e.cta_snapshot, e.deeplink_snapshot
  from public.automation_executions e
  join public.automation_presets p on p.id = e.preset_id
  where e.user_id = auth.uid()
    and e.seen_at is null
  order by e.scheduled_for desc
  limit 20;
$$;

grant execute on function public.get_pending_automations() to authenticated;

create or replace function public.mark_automation_seen(p_execution_id bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.automation_executions
  set seen_at = now(), dismissed_at = now()
  where id = p_execution_id and user_id = auth.uid() and seen_at is null;
end;
$$;

grant execute on function public.mark_automation_seen(bigint) to authenticated;

-- ----------------------------------------------------------------------------
-- 5) PG_CRON SCHEDULE — her dakika
-- ----------------------------------------------------------------------------
-- pg_cron Supabase'de varsayılan kapalı; etkinleştirme:
create extension if not exists pg_cron with schema extensions;

-- Önceki schedule varsa temizle (idempotent migration için)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'automation-runner') then
    perform cron.unschedule('automation-runner');
  end if;
exception when others then
  -- pg_cron extension henüz hazır değilse sessizce atla (Supabase ilk push)
  null;
end$$;

select cron.schedule(
  'automation-runner',
  '* * * * *',
  $$select public.process_cron_automations();$$
);

-- ----------------------------------------------------------------------------
-- 6) MIGRATION LOG
-- ----------------------------------------------------------------------------
insert into public._migration_log (version, description)
values ('0006', 'Faz 5.B.2: automation_executions + process_cron_automations() + pg_cron')
on conflict (version) do nothing;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- select cron.unschedule('automation-runner');
-- drop function if exists public.mark_automation_seen(bigint);
-- drop function if exists public.get_pending_automations();
-- drop function if exists public.process_cron_automations();
-- drop function if exists public.weekday_short(timestamptz, text);
-- drop table if exists public.automation_executions;
