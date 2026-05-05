-- ============================================================================
-- Migration: 0002_articles_notifications
-- Faz: 0
-- Amaç: Sistem makaleleri (articles) + bildirim kampanyaları
-- Bağımlılık: 0001_admin_foundation (admin_users, helper functions, audit_log)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) ARTICLES — sistem makaleleri (Time Boxing, Pomodoro, vb.)
-- index.html'deki SYSTEM_ARTICLES JS sabitinin DB karşılığı
-- ----------------------------------------------------------------------------
create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  summary         text,
  content_html    text,                       -- ana HTML içerik
  content_md      text,                       -- opsiyonel markdown kaynağı
  cover_image_url text,
  category        text,                       -- 'haftalik-disiplan', 'ipucu', 'duyuru'
  series_name     text,                       -- 'Haftalık Disiplan'
  series_index    integer,                    -- #1, #2, ...
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  target_audience text not null default 'all' check (target_audience in ('all', 'free', 'pro', 'inactive_7d', 'segment')),
  target_segment_id uuid,                     -- Faz 2'de segments tablosu gelince FK
  published_at    timestamptz,
  scheduled_for   timestamptz,                -- yayın zamanlanmış ise
  read_time_min   integer,                    -- tahmini okuma süresi
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);

create index if not exists idx_articles_status on public.articles(status);
create index if not exists idx_articles_published on public.articles(published_at desc) where status = 'published';
create index if not exists idx_articles_category on public.articles(category);
create index if not exists idx_articles_series on public.articles(series_name, series_index);

-- updated_at otomatik
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_articles_touch on public.articles;
create trigger trg_articles_touch
  before update on public.articles
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2) NOTIFICATION CAMPAIGNS — admin'in oluşturduğu bildirim kampanyaları
-- ----------------------------------------------------------------------------
create table if not exists public.notification_campaigns (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  message         text not null,
  link_url        text,                       -- tıklanınca gidecek URL
  icon            text,                       -- emoji veya icon adı
  delivery_method text not null default 'in_app' check (delivery_method in ('in_app', 'push', 'email', 'all')),
  target_audience text not null default 'all' check (target_audience in (
    'all', 'free', 'pro', 'inactive_7d', 'inactive_30d',
    'no_first_task', 'high_completion', 'payment_failed', 'segment'
  )),
  target_segment_id uuid,                     -- Faz 2'de FK
  status          text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_for   timestamptz,
  sent_at         timestamptz,
  -- Performans metrikleri (gönderim sonrası doldurulur)
  recipient_count integer default 0,
  delivered_count integer default 0,
  opened_count    integer default 0,
  clicked_count   integer default 0,
  related_article_id uuid references public.articles(id) on delete set null,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now()
);

create index if not exists idx_notif_campaigns_status on public.notification_campaigns(status);
create index if not exists idx_notif_campaigns_scheduled on public.notification_campaigns(scheduled_for) where status = 'scheduled';
create index if not exists idx_notif_campaigns_sent on public.notification_campaigns(sent_at desc) where status = 'sent';

drop trigger if exists trg_notif_campaigns_touch on public.notification_campaigns;
create trigger trg_notif_campaigns_touch
  before update on public.notification_campaigns
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 3) NOTIFICATION DELIVERIES — kullanıcı bazlı gönderim kayıtları
-- Her kullanıcı için 1 satır: gönderildi mi, açıldı mı, tıklandı mı
-- ----------------------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id              bigserial primary key,
  campaign_id     uuid not null references public.notification_campaigns(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  delivery_method text not null check (delivery_method in ('in_app', 'push', 'email')),
  status          text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
  sent_at         timestamptz,
  delivered_at    timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  failure_reason  text,
  created_at      timestamptz not null default now()
);

create unique index if not exists uq_notif_delivery_campaign_user_method
  on public.notification_deliveries(campaign_id, user_id, delivery_method);

create index if not exists idx_notif_deliveries_user on public.notification_deliveries(user_id);
create index if not exists idx_notif_deliveries_campaign on public.notification_deliveries(campaign_id);
create index if not exists idx_notif_deliveries_status on public.notification_deliveries(status);

-- ----------------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- ARTICLES
alter table public.articles enable row level security;

-- Yayında olan makaleyi tüm authenticated kullanıcılar okuyabilir
drop policy if exists "articles_public_read" on public.articles;
create policy "articles_public_read" on public.articles
  for select
  using (status = 'published' or public.is_admin());

-- content_editor + admin + owner CRUD
drop policy if exists "articles_admin_insert" on public.articles;
create policy "articles_admin_insert" on public.articles
  for insert
  with check (public.has_any_admin_role(array['admin', 'content_editor']::admin_role[]));

drop policy if exists "articles_admin_update" on public.articles;
create policy "articles_admin_update" on public.articles
  for update
  using (public.has_any_admin_role(array['admin', 'content_editor']::admin_role[]));

drop policy if exists "articles_admin_delete" on public.articles;
create policy "articles_admin_delete" on public.articles
  for delete
  using (public.has_any_admin_role(array['admin']::admin_role[]));

-- NOTIFICATION_CAMPAIGNS — sadece admin'ler görür/yönetir
alter table public.notification_campaigns enable row level security;

drop policy if exists "notif_campaigns_admin_select" on public.notification_campaigns;
create policy "notif_campaigns_admin_select" on public.notification_campaigns
  for select
  using (public.is_admin());

drop policy if exists "notif_campaigns_editor_insert" on public.notification_campaigns;
create policy "notif_campaigns_editor_insert" on public.notification_campaigns
  for insert
  with check (public.has_any_admin_role(array['admin', 'content_editor']::admin_role[]));

drop policy if exists "notif_campaigns_editor_update" on public.notification_campaigns;
create policy "notif_campaigns_editor_update" on public.notification_campaigns
  for update
  using (public.has_any_admin_role(array['admin', 'content_editor']::admin_role[]));

drop policy if exists "notif_campaigns_admin_delete" on public.notification_campaigns;
create policy "notif_campaigns_admin_delete" on public.notification_campaigns
  for delete
  using (public.has_any_admin_role(array['admin']::admin_role[]));

-- NOTIFICATION_DELIVERIES — kullanıcı sadece kendi delivery'sini görür, admin hepsini
alter table public.notification_deliveries enable row level security;

drop policy if exists "notif_deliveries_user_select" on public.notification_deliveries;
create policy "notif_deliveries_user_select" on public.notification_deliveries
  for select
  using (user_id = auth.uid() or public.is_admin());

-- INSERT/UPDATE/DELETE sadece sunucu tarafı (service role) yapacak — politika YOK

-- ----------------------------------------------------------------------------
-- 5) GRANT'LER
-- ----------------------------------------------------------------------------
grant select on public.articles to authenticated;
grant insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.notification_campaigns to authenticated;
grant select on public.notification_deliveries to authenticated;
grant usage, select on sequence public.notification_deliveries_id_seq to authenticated;

-- ----------------------------------------------------------------------------
-- 6) MIGRATION LOG
-- ----------------------------------------------------------------------------
insert into public._migration_log (version, description)
values ('0002', 'Articles + notification campaigns + deliveries with RLS')
on conflict (version) do nothing;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- drop policy if exists "notif_deliveries_user_select" on public.notification_deliveries;
-- drop policy if exists "notif_campaigns_admin_delete" on public.notification_campaigns;
-- drop policy if exists "notif_campaigns_editor_update" on public.notification_campaigns;
-- drop policy if exists "notif_campaigns_editor_insert" on public.notification_campaigns;
-- drop policy if exists "notif_campaigns_admin_select" on public.notification_campaigns;
-- drop policy if exists "articles_admin_delete" on public.articles;
-- drop policy if exists "articles_admin_update" on public.articles;
-- drop policy if exists "articles_admin_insert" on public.articles;
-- drop policy if exists "articles_public_read" on public.articles;
-- drop trigger if exists trg_notif_campaigns_touch on public.notification_campaigns;
-- drop trigger if exists trg_articles_touch on public.articles;
-- drop function if exists public.touch_updated_at();
-- drop table if exists public.notification_deliveries;
-- drop table if exists public.notification_campaigns;
-- drop table if exists public.articles;
-- delete from public._migration_log where version = '0002';
