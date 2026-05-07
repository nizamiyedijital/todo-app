-- ============================================================================
-- Migration: 0011_automation_audience_filter
-- Faz: 5.B.4
-- Amaç: Cron preset'lerinde audience='pro'/'free'/'all' filtreleme.
-- Bağımlılık: 0010_automation_substitution, 0003_subscriptions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: kullanıcının pro abonesi olup olmadığını döner
-- ----------------------------------------------------------------------------
create or replace function public.is_user_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    join public.subscription_plans pl on pl.id = s.plan_id
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
      and pl.code <> 'free'
  );
$$;

revoke all on function public.is_user_pro(uuid) from public;
grant execute on function public.is_user_pro(uuid) to postgres, authenticated;

-- ----------------------------------------------------------------------------
-- process_cron_automations() — audience filtresi
-- ----------------------------------------------------------------------------
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

    if not (cron_days ? current_dow) then
      continue;
    end if;
    if current_hour <> cron_hour or current_minute <> cron_minute then
      continue;
    end if;

    scheduled_at := date_trunc('minute', now());

    -- Audience filtresi: 'all' = herkes, 'pro' = aktif/trialing pro, 'free' = aksi
    insert into public.automation_executions
      (preset_id, user_id, scheduled_for, title_snapshot, body_snapshot, cta_snapshot, deeplink_snapshot)
    select
      preset.id,
      u.id,
      scheduled_at,
      public.automation_substitute(
        coalesce(preset.action_config ->> 'title', ''),
        public.automation_user_stats(u.id)
      ),
      public.automation_substitute(
        coalesce(preset.action_config ->> 'body', ''),
        public.automation_user_stats(u.id)
      ),
      preset.action_config ->> 'cta',
      preset.action_config ->> 'deeplink'
    from auth.users u
    where
      preset.audience = 'all'
      or (preset.audience = 'pro' and public.is_user_pro(u.id))
      or (preset.audience = 'free' and not public.is_user_pro(u.id))
    on conflict (preset_id, user_id, scheduled_for) do nothing;

    get diagnostics inserted_count = row_count;

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

insert into public._migration_log (version, description)
values ('0011', 'Faz 5.B.4: cron audience filter (pro/free/all) + is_user_pro')
on conflict (version) do nothing;
