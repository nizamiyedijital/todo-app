-- ============================================================================
-- SEED: İlk owner ekleme
-- KULLANIM: Bu dosyayı çalıştırmadan önce <YOUR_EMAIL> yerine kendi email'ini koy
-- Çalıştırma: Supabase SQL Editor'dan tek seferlik
-- ============================================================================

-- 1) Email'inden user_id bul
-- (auth.users'a Supabase Auth zaten eklemiş olmalı — eğer yoksa önce signup ol)
do $$
declare
  v_user_id uuid;
  v_admin_user_id uuid;
  v_email text := 'nizamiye.dijital@gmail.com';  -- ⚠️ KENDİ EMAIL'İNİ YAZ
begin
  -- auth.users'dan user_id al
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    raise exception 'auth.users tablosunda % email yok. Önce uygulamadan kayıt ol.', v_email;
  end if;

  -- admin_users'a ekle (idempotent)
  insert into public.admin_users (user_id, status, notes)
  values (v_user_id, 'active', 'İlk owner — seed script ile eklendi')
  on conflict (user_id) do update set status = 'active'
  returning id into v_admin_user_id;

  if v_admin_user_id is null then
    select id into v_admin_user_id from public.admin_users where user_id = v_user_id;
  end if;

  -- owner rolü ver (idempotent)
  insert into public.admin_user_roles (admin_user_id, role, granted_by)
  values (v_admin_user_id, 'owner', v_user_id)
  on conflict (admin_user_id, role) do nothing;

  -- Audit log'a kaydet
  insert into public.audit_log (actor_id, actor_email, action, target_type, target_id, payload)
  values (
    v_user_id, v_email,
    'ADMIN_SEED_OWNER',
    'admin_user',
    v_admin_user_id::text,
    jsonb_build_object('source', 'seed_first_admin.sql')
  );

  raise notice 'OK: % artık owner. admin_user_id=%, user_id=%', v_email, v_admin_user_id, v_user_id;
end $$;

-- 2) Kontrol — owner gerçekten var mı?
select
  au.id as admin_user_id,
  u.email,
  au.status,
  array_agg(aur.role) as roles
from public.admin_users au
join auth.users u on u.id = au.user_id
left join public.admin_user_roles aur on aur.admin_user_id = au.id
group by au.id, u.email, au.status;
