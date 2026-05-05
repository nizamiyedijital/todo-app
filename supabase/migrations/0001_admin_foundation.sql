-- ============================================================================
-- Migration: 0001_admin_foundation
-- Faz: 0
-- Amaç: Admin user yönetimi, çoklu-rol destekli RBAC, audit log
-- Bağımlılık: auth.users (Supabase Auth — varsayılan olarak var)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) ROL ENUM
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type admin_role as enum (
      'owner',
      'admin',
      'support',
      'content_editor',
      'analyst'
    );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2) ADMIN USERS — auth.users'a bağlı, admin paneline erişim hakkı
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  status       text not null default 'active' check (status in ('active', 'suspended', 'invited')),
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  last_login_at timestamptz,
  notes        text
);

create index if not exists idx_admin_users_user_id on public.admin_users(user_id);
create index if not exists idx_admin_users_status on public.admin_users(status);

-- ----------------------------------------------------------------------------
-- 3) ADMIN USER ROLES — many-to-many, bir admin birden fazla rol alabilir
-- ----------------------------------------------------------------------------
create table if not exists public.admin_user_roles (
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  role          admin_role not null,
  granted_at    timestamptz not null default now(),
  granted_by    uuid references auth.users(id),
  primary key (admin_user_id, role)
);

create index if not exists idx_admin_user_roles_role on public.admin_user_roles(role);

-- "En az bir owner her zaman var" kuralı: trigger ile son owner silinemez
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
as $$
declare
  remaining_owners integer;
begin
  if old.role = 'owner' then
    select count(*) into remaining_owners
    from public.admin_user_roles
    where role = 'owner' and admin_user_id != old.admin_user_id;

    if remaining_owners = 0 then
      raise exception 'En az bir owner her zaman olmalı. Önce başka birini owner yap.';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_last_owner on public.admin_user_roles;
create trigger trg_prevent_last_owner
  before delete on public.admin_user_roles
  for each row
  execute function public.prevent_last_owner_removal();

-- ----------------------------------------------------------------------------
-- 4) HELPER FUNCTIONS — RLS politikalarında kullanılacak
-- ----------------------------------------------------------------------------

-- Şu an oturumdaki kullanıcı admin mi? (herhangi bir rol)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.status = 'active'
  );
$$;

-- Şu an oturumdaki kullanıcı belirli bir role sahip mi?
create or replace function public.has_admin_role(required_role admin_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    join public.admin_user_roles aur on aur.admin_user_id = au.id
    where au.user_id = auth.uid()
      and au.status = 'active'
      and (aur.role = required_role or aur.role = 'owner')
      -- owner her şeye yetkili
  );
$$;

-- Şu an oturumdaki kullanıcı şu rollerden birine sahip mi?
create or replace function public.has_any_admin_role(required_roles admin_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    join public.admin_user_roles aur on aur.admin_user_id = au.id
    where au.user_id = auth.uid()
      and au.status = 'active'
      and (aur.role = any(required_roles) or aur.role = 'owner')
  );
$$;

-- ----------------------------------------------------------------------------
-- 5) AUDIT LOG — her admin işlemi buraya yazılır
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,                 -- snapshot, kullanıcı silinse de kalsın
  action      text not null,        -- 'USER_UPDATED', 'ARTICLE_PUBLISHED', vb.
  target_type text,                 -- 'user', 'article', 'subscription', vb.
  target_id   text,                 -- string çünkü uuid+int+string karışık olabilir
  payload     jsonb default '{}'::jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_actor on public.audit_log(actor_id);
create index if not exists idx_audit_log_action on public.audit_log(action);
create index if not exists idx_audit_log_target on public.audit_log(target_type, target_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);

-- Audit log INSERT helper (admin app'ten çağrılır)
create or replace function public.log_admin_action(
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_email text;
begin
  -- Sadece admin'ler log atabilir
  if not public.is_admin() then
    raise exception 'Audit log sadece admin tarafından yazılabilir';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into public.audit_log (actor_id, actor_email, action, target_type, target_id, payload)
  values (auth.uid(), v_email, p_action, p_target_type, p_target_id, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6) ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- admin_users: sadece owner+admin görebilir/değiştirebilir
alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select" on public.admin_users;
create policy "admin_users_select" on public.admin_users
  for select
  using (public.has_any_admin_role(array['admin']::admin_role[]));

drop policy if exists "admin_users_insert" on public.admin_users;
create policy "admin_users_insert" on public.admin_users
  for insert
  with check (public.has_admin_role('owner'));

drop policy if exists "admin_users_update" on public.admin_users;
create policy "admin_users_update" on public.admin_users
  for update
  using (public.has_any_admin_role(array['admin']::admin_role[]));

drop policy if exists "admin_users_delete" on public.admin_users;
create policy "admin_users_delete" on public.admin_users
  for delete
  using (public.has_admin_role('owner'));

-- admin_user_roles: sadece owner ekleyebilir/silebilir, admin görebilir
alter table public.admin_user_roles enable row level security;

drop policy if exists "admin_user_roles_select" on public.admin_user_roles;
create policy "admin_user_roles_select" on public.admin_user_roles
  for select
  using (public.has_any_admin_role(array['admin']::admin_role[]));

drop policy if exists "admin_user_roles_insert" on public.admin_user_roles;
create policy "admin_user_roles_insert" on public.admin_user_roles
  for insert
  with check (public.has_admin_role('owner'));

drop policy if exists "admin_user_roles_delete" on public.admin_user_roles;
create policy "admin_user_roles_delete" on public.admin_user_roles
  for delete
  using (public.has_admin_role('owner'));

-- audit_log: tüm admin'ler okur, sadece function ile insert (RLS bypass)
alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select" on public.audit_log
  for select
  using (public.is_admin());

-- INSERT politikası YOK — sadece log_admin_action() function'ı (security definer) yazabilir
-- DELETE politikası YOK — kimse silemez (acil durumda direkt SQL ile)

-- ----------------------------------------------------------------------------
-- 7) GRANT'LER
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.admin_users to authenticated;
grant select on public.admin_user_roles to authenticated;
grant select on public.audit_log to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_admin_role(admin_role) to authenticated;
grant execute on function public.has_any_admin_role(admin_role[]) to authenticated;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 8) MIGRATION META — versiyonlama için
-- ----------------------------------------------------------------------------
create table if not exists public._migration_log (
  version text primary key,
  applied_at timestamptz not null default now(),
  description text
);

insert into public._migration_log (version, description)
values ('0001', 'Admin foundation: admin_users, admin_user_roles, audit_log, RLS, RBAC helpers')
on conflict (version) do nothing;

-- ============================================================================
-- ROLLBACK (manuel — yanlış uygulandıysa SQL editor'dan tek tek çalıştır)
-- ============================================================================
-- drop policy if exists "audit_log_select" on public.audit_log;
-- drop policy if exists "admin_user_roles_delete" on public.admin_user_roles;
-- drop policy if exists "admin_user_roles_insert" on public.admin_user_roles;
-- drop policy if exists "admin_user_roles_select" on public.admin_user_roles;
-- drop policy if exists "admin_users_delete" on public.admin_users;
-- drop policy if exists "admin_users_update" on public.admin_users;
-- drop policy if exists "admin_users_insert" on public.admin_users;
-- drop policy if exists "admin_users_select" on public.admin_users;
-- drop function if exists public.log_admin_action(text, text, text, jsonb);
-- drop function if exists public.has_any_admin_role(admin_role[]);
-- drop function if exists public.has_admin_role(admin_role);
-- drop function if exists public.is_admin();
-- drop trigger if exists trg_prevent_last_owner on public.admin_user_roles;
-- drop function if exists public.prevent_last_owner_removal();
-- drop table if exists public.audit_log;
-- drop table if exists public.admin_user_roles;
-- drop table if exists public.admin_users;
-- drop type if exists admin_role;
-- delete from public._migration_log where version = '0001';
