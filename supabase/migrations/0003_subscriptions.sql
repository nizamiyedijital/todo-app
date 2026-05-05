-- ============================================================================
-- Migration: 0003_subscriptions
-- Faz: 0
-- Amaç: Plan + Subscription + Payment yönetimi (Iyzico provider-aware)
-- Bağımlılık: 0001_admin_foundation
-- Provider: Iyzico (TR-first), schema diğer provider'lara da açık
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) SUBSCRIPTION PLANS — admin tanımlı planlar
-- Her plan Iyzico'da bir "pricing plan"a denk gelir
-- ----------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,                -- 'pro_monthly_try', 'pro_yearly_try'
  name               text not null,                       -- 'Disiplan Pro Aylık'
  description        text,
  amount             numeric(10,2) not null,              -- 49.90
  currency           text not null default 'TRY' check (currency in ('TRY', 'USD', 'EUR')),
  interval           text not null check (interval in ('monthly', 'yearly', 'lifetime')),
  trial_period_days  integer default 0,
  features           jsonb default '[]'::jsonb,           -- ['unlimited_lists', 'cloud_sync', ...]
  status             text not null default 'active' check (status in ('active', 'archived')),
  display_order      integer default 0,                   -- pricing page sıralaması

  -- Iyzico tarafı
  iyzico_pricing_plan_reference_code text unique,         -- Iyzico'dan dönen ref code
  iyzico_product_reference_code      text,                -- bağlı olduğu Iyzico product

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_plans_status on public.subscription_plans(status);
create index if not exists idx_plans_code on public.subscription_plans(code);

drop trigger if exists trg_plans_touch on public.subscription_plans;
create trigger trg_plans_touch
  before update on public.subscription_plans
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2) SUBSCRIPTIONS — kullanıcı abonelikleri
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  plan_id         uuid not null references public.subscription_plans(id),

  status          text not null check (status in (
    'trialing',           -- deneme süresinde
    'active',             -- aktif, ödendi
    'past_due',           -- son ödeme başarısız, retry'da
    'cancelled',          -- iptal edildi (period sonuna kadar aktif kalabilir)
    'expired',            -- iptal sonrası period bitti
    'pending'             -- ilk ödeme bekleniyor
  )),

  current_period_start timestamptz not null,
  current_period_end   timestamptz not null,
  trial_ends_at        timestamptz,
  cancelled_at         timestamptz,
  cancel_reason        text,
  cancel_feedback      text,                              -- kullanıcının yazdığı geri bildirim
  ended_at             timestamptz,                       -- expired olunca dolduruluyor

  -- Iyzico tarafı
  iyzico_subscription_reference_code text unique,
  iyzico_customer_reference_code     text,
  iyzico_card_token                  text,                -- saklanan kart token (Iyzico tarafında)

  -- Snapshot fields (raporlamada plan değişse bile bu sub'ın orijinal değeri)
  amount_at_signup    numeric(10,2),
  currency_at_signup  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  metadata        jsonb default '{}'::jsonb              -- referral_code, campaign_id, vb.
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_period_end on public.subscriptions(current_period_end);
create index if not exists idx_subscriptions_iyzico_ref on public.subscriptions(iyzico_subscription_reference_code);

-- Bir kullanıcının aynı anda birden fazla active subscription'ı olamaz
create unique index if not exists uq_subscriptions_user_active
  on public.subscriptions(user_id)
  where status in ('trialing', 'active', 'past_due');

drop trigger if exists trg_subscriptions_touch on public.subscriptions;
create trigger trg_subscriptions_touch
  before update on public.subscriptions
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 3) PAYMENTS — her ödeme denemesi (başarılı/başarısız)
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  user_id         uuid not null references auth.users(id) on delete cascade,

  amount          numeric(10,2) not null,
  currency        text not null default 'TRY',

  status          text not null check (status in (
    'succeeded',          -- başarılı tahsilat
    'failed',             -- başarısız (kart reddi vb.)
    'refunded',           -- iade edildi (tam)
    'partially_refunded', -- kısmi iade
    'pending',            -- işleniyor
    'requires_action'     -- 3D-Secure vb. ek aksiyon
  )),

  payment_method  text,                                  -- 'card', 'bank_transfer'
  card_last4      text,
  card_brand      text,                                  -- 'visa', 'mastercard', 'troy'

  -- Iyzico tarafı
  iyzico_payment_id        text unique,                  -- Iyzico paymentId
  iyzico_payment_transaction_id text,                    -- Iyzico paymentTransactionId
  iyzico_conversation_id   text,                         -- bizim çağrı ID
  iyzico_response          jsonb,                        -- ham response (debug için)

  failure_code    text,                                  -- '10051', 'INSUFFICIENT_FUNDS'
  failure_message text,
  retry_count     integer default 0,                     -- past_due retry sayacı

  refund_amount   numeric(10,2),
  refund_reason   text,
  refunded_at     timestamptz,

  paid_at         timestamptz,                           -- başarılı ise tarih
  created_at      timestamptz not null default now()
);

create index if not exists idx_payments_subscription on public.payments(subscription_id);
create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_paid_at on public.payments(paid_at desc) where status = 'succeeded';
create index if not exists idx_payments_iyzico_id on public.payments(iyzico_payment_id);

-- ----------------------------------------------------------------------------
-- 4) COUPONS — kupon ve promosyon kodları (Faz 3'te aktif kullanılacak)
-- ----------------------------------------------------------------------------
create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,                  -- 'WELCOME20', 'YILSONU50'
  description     text,
  discount_type   text not null check (discount_type in ('percentage', 'fixed_amount', 'trial_extension')),
  discount_value  numeric(10,2) not null,                -- 20 (% veya TL)
  currency        text default 'TRY',
  applies_to_plan_ids uuid[] default '{}',               -- boş = tüm planlar
  max_redemptions integer,                               -- null = sınırsız
  redeemed_count  integer default 0,
  per_user_limit  integer default 1,
  starts_at       timestamptz default now(),
  expires_at      timestamptz,
  status          text not null default 'active' check (status in ('active', 'paused', 'expired')),
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null
);

create index if not exists idx_coupons_status on public.coupons(status);
create index if not exists idx_coupons_expires on public.coupons(expires_at) where expires_at is not null;

-- Kupon kullanım kayıtları
create table if not exists public.coupon_redemptions (
  id              bigserial primary key,
  coupon_id       uuid not null references public.coupons(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_id      uuid references public.payments(id) on delete set null,
  redeemed_at     timestamptz not null default now()
);

create index if not exists idx_coupon_redemptions_user on public.coupon_redemptions(user_id);
create index if not exists idx_coupon_redemptions_coupon on public.coupon_redemptions(coupon_id);

-- ----------------------------------------------------------------------------
-- 5) ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- subscription_plans: herkes okuyabilir (pricing page için), admin yazar
alter table public.subscription_plans enable row level security;

drop policy if exists "plans_public_read" on public.subscription_plans;
create policy "plans_public_read" on public.subscription_plans
  for select
  using (status = 'active' or public.is_admin());

drop policy if exists "plans_admin_write" on public.subscription_plans;
create policy "plans_admin_write" on public.subscription_plans
  for all
  using (public.has_any_admin_role(array['admin']::admin_role[]))
  with check (public.has_any_admin_role(array['admin']::admin_role[]));

-- subscriptions: kullanıcı kendi sub'ını görür, admin/support hepsini
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions
  for select
  using (user_id = auth.uid() or public.has_any_admin_role(array['admin', 'support', 'analyst']::admin_role[]));

drop policy if exists "subscriptions_admin_update" on public.subscriptions;
create policy "subscriptions_admin_update" on public.subscriptions
  for update
  using (public.has_any_admin_role(array['admin']::admin_role[]));

-- INSERT/DELETE service role only (webhook handler) — politika YOK

-- payments: kullanıcı kendi ödemesini, admin/support hepsini
alter table public.payments enable row level security;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select
  using (user_id = auth.uid() or public.has_any_admin_role(array['admin', 'support', 'analyst']::admin_role[]));

-- INSERT/UPDATE service role only

-- coupons: admin yönetir, herkes okuyabilir (kod doğrulama için)
alter table public.coupons enable row level security;

drop policy if exists "coupons_authenticated_read" on public.coupons;
create policy "coupons_authenticated_read" on public.coupons
  for select
  using (status = 'active' or public.is_admin());

drop policy if exists "coupons_admin_write" on public.coupons;
create policy "coupons_admin_write" on public.coupons
  for all
  using (public.has_any_admin_role(array['admin']::admin_role[]))
  with check (public.has_any_admin_role(array['admin']::admin_role[]));

-- coupon_redemptions: kullanıcı kendi kullanımını, admin hepsini
alter table public.coupon_redemptions enable row level security;

drop policy if exists "coupon_redemptions_select" on public.coupon_redemptions;
create policy "coupon_redemptions_select" on public.coupon_redemptions
  for select
  using (user_id = auth.uid() or public.has_any_admin_role(array['admin', 'analyst']::admin_role[]));

-- ----------------------------------------------------------------------------
-- 6) GRANT'LER
-- ----------------------------------------------------------------------------
grant select on public.subscription_plans to authenticated;
grant insert, update, delete on public.subscription_plans to authenticated;
grant select on public.subscriptions to authenticated;
grant update on public.subscriptions to authenticated;
grant select on public.payments to authenticated;
grant select on public.coupons to authenticated;
grant insert, update, delete on public.coupons to authenticated;
grant select on public.coupon_redemptions to authenticated;
grant usage, select on sequence public.coupon_redemptions_id_seq to authenticated;

-- ----------------------------------------------------------------------------
-- 7) MIGRATION LOG
-- ----------------------------------------------------------------------------
insert into public._migration_log (version, description)
values ('0003', 'Subscription plans, subscriptions, payments, coupons (Iyzico-aware)')
on conflict (version) do nothing;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- drop policy if exists "coupon_redemptions_select" on public.coupon_redemptions;
-- drop policy if exists "coupons_admin_write" on public.coupons;
-- drop policy if exists "coupons_authenticated_read" on public.coupons;
-- drop policy if exists "payments_select" on public.payments;
-- drop policy if exists "subscriptions_admin_update" on public.subscriptions;
-- drop policy if exists "subscriptions_select" on public.subscriptions;
-- drop policy if exists "plans_admin_write" on public.subscription_plans;
-- drop policy if exists "plans_public_read" on public.subscription_plans;
-- drop trigger if exists trg_subscriptions_touch on public.subscriptions;
-- drop trigger if exists trg_plans_touch on public.subscription_plans;
-- drop table if exists public.coupon_redemptions;
-- drop table if exists public.coupons;
-- drop table if exists public.payments;
-- drop table if exists public.subscriptions;
-- drop table if exists public.subscription_plans;
-- delete from public._migration_log where version = '0003';
