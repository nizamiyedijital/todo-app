-- ============================================================================
-- Migration: 0008_automation_push_schedule
-- Faz: 5.B.3
-- Amaç: pg_cron'dan her dakika send-automation-pushes Edge Function'ına POST.
-- Bağımlılık: 0007_push_notifications (pg_net etkin)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Helper function — Edge Function'a POST atar
-- ----------------------------------------------------------------------------
-- Service role key'i `app.service_role_key` DB setting'inden okur.
-- Set etmek için (Supabase SQL Editor'dan, bir kerelik):
--   alter database postgres set app.service_role_key to '<service_role_key>';
-- Bu setting persist eder, restart sonrası korunur.
create or replace function public.dispatch_automation_pushes()
returns bigint  -- net.http_post request_id (async)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  service_key text;
  fn_url text;
  request_id bigint;
begin
  service_key := current_setting('app.service_role_key', true);
  fn_url := 'https://uzkscrrqyxftbtwkiyra.supabase.co/functions/v1/send-automation-pushes';

  if service_key is null or service_key = '' then
    raise warning '[dispatch_automation_pushes] app.service_role_key tanımlı değil; push gönderilmedi.';
    return null;
  end if;

  select net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) into request_id;

  return request_id;
end;
$$;

comment on function public.dispatch_automation_pushes() is
  'Faz 5.B.3: pg_cron her dk bu function''ı çağırır → send-automation-pushes Edge Function''a HTTP POST atar.';

revoke all on function public.dispatch_automation_pushes() from public;
grant execute on function public.dispatch_automation_pushes() to postgres;

-- ----------------------------------------------------------------------------
-- 2) PG_CRON SCHEDULE — her dakika
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'automation-push-dispatcher') then
    perform cron.unschedule('automation-push-dispatcher');
  end if;
exception when others then null;
end$$;

select cron.schedule(
  'automation-push-dispatcher',
  '* * * * *',
  $$select public.dispatch_automation_pushes();$$
);

-- ----------------------------------------------------------------------------
-- 3) MIGRATION LOG
-- ----------------------------------------------------------------------------
insert into public._migration_log (version, description)
values ('0008', 'Faz 5.B.3: pg_cron + dispatch_automation_pushes() helper')
on conflict (version) do nothing;

-- ============================================================================
-- DEPLOY-AFTER ADIMI (kullanıcı):
--   Supabase Studio → SQL Editor:
--     alter database postgres set app.service_role_key to '<SERVICE_ROLE_KEY>';
--   Service role key: Supabase Dashboard → Settings → API → service_role
--   (anon key DEĞİL!) Bu setting bir kez set edilir, persist eder.
-- ROLLBACK
-- ============================================================================
-- select cron.unschedule('automation-push-dispatcher');
-- drop function if exists public.dispatch_automation_pushes();
