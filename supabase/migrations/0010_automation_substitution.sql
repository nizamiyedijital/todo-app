-- ============================================================================
-- Migration: 0010_automation_substitution
-- Faz: 5.B.4
-- Amaç: Cron preset'lerinin title/body'sindeki {placeholder}'ları INSERT
--       sırasında server-side substitute et — client'a ham template gelmesin.
-- Bağımlılık: 0006_automation_runner
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) automation_user_stats(user_id) — placeholder context
-- ----------------------------------------------------------------------------
-- Mevcut placeholder'lar (admin form'unda öneri olarak bahsedildi):
--   {starred_count}            — aktif yıldızlı kök görev sayısı
--   {total_count}              — aktif kök görev toplam sayısı
--   {priority_count}           — aktif p0/p1/p2 görev sayısı
--   {tasks_completed_today}    — bugün tamamlanan görev sayısı
--   {lists_count}              — kullanıcının liste sayısı
-- {pomo_minutes_today} server-side'da hesaplanamaz (pomo log DB'de yok);
-- event-based banner'da context'ten gelir, cron'da '{pomo_minutes_today}' ham
-- bırakılır (kullanıcı görse de cron'da pomo özetinin yeri yok zaten).

create or replace function public.automation_user_stats(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'starred_count', (
      select count(*) from public.todos
      where user_id = p_user_id
        and parent_id is null
        and done = false
        and starred = true
    ),
    'total_count', (
      select count(*) from public.todos
      where user_id = p_user_id
        and parent_id is null
        and done = false
    ),
    'priority_count', (
      select count(*) from public.todos
      where user_id = p_user_id
        and parent_id is null
        and done = false
        and priority in ('p0', 'p1', 'p2')
    ),
    'tasks_completed_today', (
      select count(*) from public.todos
      where user_id = p_user_id
        and parent_id is null
        and done = true
        and completed_at >= (date_trunc('day', now() at time zone 'Europe/Istanbul')
                              at time zone 'Europe/Istanbul')
    ),
    'lists_count', (
      select count(*) from public.lists where user_id = p_user_id
    )
  );
$$;

revoke all on function public.automation_user_stats(uuid) from public;
grant execute on function public.automation_user_stats(uuid) to postgres;

-- ----------------------------------------------------------------------------
-- 2) automation_substitute(template, ctx) — basit {key} → ctx[key] replace
-- ----------------------------------------------------------------------------
create or replace function public.automation_substitute(p_template text, p_ctx jsonb)
returns text
language plpgsql
immutable
as $$
declare
  result text := coalesce(p_template, '');
  k text;
  v text;
begin
  if p_ctx is null then
    return result;
  end if;
  for k in select jsonb_object_keys(p_ctx) loop
    v := coalesce(p_ctx ->> k, '');
    result := replace(result, '{' || k || '}', v);
  end loop;
  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) process_cron_automations() — title/body substitute'lu INSERT
-- ----------------------------------------------------------------------------
-- 0006'daki function'ı override et — ek değişiklik:
--   title_snapshot/body_snapshot artık substitute edilmiş halde yazılır.
-- Audience filtreleme 5.B.4.4'te ayrıca eklenecek.
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

    -- Her user için stats hesapla + title/body substitute + INSERT
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
    where preset.audience = 'all'
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
values ('0010', 'Faz 5.B.4: server-side placeholder substitution (automation_user_stats + substitute)')
on conflict (version) do nothing;
