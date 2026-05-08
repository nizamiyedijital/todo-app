-- ============================================================================
-- Migration: 0012_automation_pomo_stats
-- Faz: 5.A iyileştirme
-- Amaç: automation_user_stats(user_id) → jsonb fonksiyonuna `pomo_minutes_today`
--       eklenmesi. Mobile artık pomo_sessions'a log atıyor (Faz 2.C.1+),
--       cron preset'lerinin {pomo_minutes_today} placeholder'ı server-side
--       substitution ile gerçek değer gösterebilir.
-- Bağımlılık: 0010_automation_substitution, pomo_sessions tablosu
-- ============================================================================

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
    ),
    -- Faz 5.A iyileştirme: pomo_sessions'tan bugünkü 'work' phase
    -- dakikaları toplamı (Europe/Istanbul gün dilimi).
    'pomo_minutes_today', coalesce((
      select sum(duration_min)::int from public.pomo_sessions
      where user_id = p_user_id
        and phase = 'work'
        and completed_at >= (date_trunc('day', now() at time zone 'Europe/Istanbul')
                              at time zone 'Europe/Istanbul')
    ), 0)
  );
$$;

revoke all on function public.automation_user_stats(uuid) from public;
grant execute on function public.automation_user_stats(uuid) to postgres;

insert into public._migration_log (version, description)
values ('0012', 'Faz 5.A: automation_user_stats pomo_minutes_today eklendi (pomo_sessions sum)')
on conflict (version) do nothing;
