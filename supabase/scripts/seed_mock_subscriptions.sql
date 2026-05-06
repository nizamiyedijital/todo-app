-- ============================================================================
-- SEED: Mock subscriptions (Faz 3.A — sadece test/development)
--
-- Bu script BELİRLİ kullanıcıları manuel "Pro Aktif" yapar — Iyzico bypass.
-- Faz 3.B'de gerçek Iyzico webhook'u çalışmaya başlayınca bu script GEREKMEZ.
--
-- KULLANIM:
--   1) target_emails listesini kendi test hesaplarınla güncelle (production'a girmesin)
--   2) seed_subscription_plans.sql ÖNCE çalıştırılmış olmalı
--   3) Bu script idempotent — aynı user için zaten active sub varsa atlar
--
-- TEMİZLİK:
--   delete from public.subscriptions where metadata->>'source' = 'admin_manual_seed';
-- ============================================================================

do $$
declare
  -- ⬇ Buraya kendi test e-postalarını ekle (var olan auth.users.email)
  target_emails text[] := array['nizamiye.dijital@gmail.com'];
  v_email text;
  v_user_id uuid;
  v_plan_id uuid;
  v_existing uuid;
begin
  -- pro_monthly_try plan_id'yi bul
  select id into v_plan_id
    from public.subscription_plans
    where code = 'pro_monthly_try'
    limit 1;

  if v_plan_id is null then
    raise exception 'pro_monthly_try plan bulunamadı — seed_subscription_plans.sql çalıştırıldı mı?';
  end if;

  foreach v_email in array target_emails loop
    -- Email'den user_id bul
    select id into v_user_id
      from auth.users
      where email = v_email
      limit 1;

    if v_user_id is null then
      raise notice 'Kullanıcı bulunamadı, atlanıyor: %', v_email;
      continue;
    end if;

    -- Zaten aktif sub var mı?
    select id into v_existing
      from public.subscriptions
      where user_id = v_user_id
        and status in ('trialing', 'active', 'past_due')
      limit 1;

    if v_existing is not null then
      raise notice 'Zaten aktif sub var (%): %', v_email, v_existing;
      continue;
    end if;

    -- 30 gün aktif sub oluştur
    insert into public.subscriptions
      (user_id, plan_id, status, current_period_start, current_period_end,
       amount_at_signup, currency_at_signup, metadata)
    values
      (v_user_id, v_plan_id, 'active', now(), now() + interval '30 days',
       99.00, 'TRY', '{"source":"admin_manual_seed"}'::jsonb);

    raise notice 'Pro abonelik oluşturuldu: % → 30 gün aktif', v_email;
  end loop;
end $$;

-- Kontrol
select
  u.email,
  p.code as plan_code,
  s.status,
  s.current_period_end::date as period_end,
  (s.metadata->>'source') as source
from public.subscriptions s
join public.subscription_plans p on p.id = s.plan_id
join auth.users u on u.id = s.user_id
where (s.metadata->>'source') = 'admin_manual_seed'
order by s.created_at desc;
