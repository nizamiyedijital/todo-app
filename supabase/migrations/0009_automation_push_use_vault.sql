-- ============================================================================
-- Migration: 0009_automation_push_use_vault
-- Faz: 5.B.3
-- Amaç: dispatch_automation_pushes() — service_role_key'i Supabase Vault'tan
--       oku (DB session setting yerine; Supabase'de ALTER DATABASE yetkisi yok).
-- Bağımlılık: 0008_automation_push_schedule
-- Setup öncesi (manuel):
--   select vault.create_secret('<service_role_key>', 'service_role_key');
-- ============================================================================

create or replace function public.dispatch_automation_pushes()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  service_key text;
  fn_url text;
  request_id bigint;
begin
  -- Vault'tan oku — secret name='service_role_key' olarak kayıtlı olmalı
  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  fn_url := 'https://uzkscrrqyxftbtwkiyra.supabase.co/functions/v1/send-automation-pushes';

  if service_key is null or service_key = '' then
    raise warning '[dispatch_automation_pushes] vault secret service_role_key bulunamadı; push gönderilmedi.';
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

revoke all on function public.dispatch_automation_pushes() from public;
grant execute on function public.dispatch_automation_pushes() to postgres;

insert into public._migration_log (version, description)
values ('0009', 'Faz 5.B.3: dispatch_automation_pushes vault.decrypted_secrets okur')
on conflict (version) do nothing;
