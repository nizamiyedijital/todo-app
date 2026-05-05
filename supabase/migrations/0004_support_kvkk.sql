-- ============================================================================
-- Migration: 0004_support_kvkk
-- Faz: 0
-- Amaç: Destek talepleri + KVKK (veri ihracı/silme talepleri)
-- Bağımlılık: 0001_admin_foundation
-- Not: Faz 4'te aktif kullanılacak — şimdilik schema hazır, UI sonra
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) SUPPORT TICKETS — destek talepleri
-- ----------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,  -- silinen kullanıcı için ticket korunur
  user_email      text not null,                                       -- snapshot, kullanıcı silinse de cevap verilebilir
  user_name       text,

  subject         text not null,
  category        text not null default 'other' check (category in (
    'bug', 'feature_request', 'billing', 'account', 'data', 'other'
  )),
  priority        text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),

  status          text not null default 'new' check (status in (
    'new',                  -- Yeni
    'in_progress',          -- İnceleniyor
    'awaiting_user',        -- Kullanıcıdan cevap bekleniyor
    'escalated',            -- Teknik ekibe aktarıldı
    'resolved',             -- Çözüldü
    'closed'                -- Kapatıldı
  )),

  -- Atama
  assigned_to     uuid references auth.users(id) on delete set null,
  assigned_at     timestamptz,

  -- Kapanış
  resolved_at     timestamptz,
  closed_at       timestamptz,

  -- Memnuniyet (Faz 4'te aktif)
  satisfaction_rating integer check (satisfaction_rating between 1 and 5),
  satisfaction_comment text,

  -- Bağlam
  source          text default 'in_app' check (source in ('in_app', 'email', 'crisp', 'manual')),
  related_url     text,                                                -- hata oluştuğu sayfa
  app_version     text,
  platform        text check (platform in ('web', 'mobile_ios', 'mobile_android')),
  metadata        jsonb default '{}'::jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  first_response_at timestamptz                                        -- ilk admin cevabı (SLA için)
);

create index if not exists idx_tickets_user on public.support_tickets(user_id);
create index if not exists idx_tickets_status on public.support_tickets(status);
create index if not exists idx_tickets_category on public.support_tickets(category);
create index if not exists idx_tickets_priority on public.support_tickets(priority);
create index if not exists idx_tickets_assigned on public.support_tickets(assigned_to);
create index if not exists idx_tickets_created on public.support_tickets(created_at desc);
create index if not exists idx_tickets_open on public.support_tickets(status, priority desc) where status not in ('resolved', 'closed');

drop trigger if exists trg_tickets_touch on public.support_tickets;
create trigger trg_tickets_touch
  before update on public.support_tickets
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 2) SUPPORT MESSAGES — ticket içindeki mesajlar (kullanıcı + admin)
-- ----------------------------------------------------------------------------
create table if not exists public.support_messages (
  id              bigserial primary key,
  ticket_id       uuid not null references public.support_tickets(id) on delete cascade,
  author_id       uuid references auth.users(id) on delete set null,
  author_type     text not null check (author_type in ('user', 'admin', 'system')),
  author_email    text,                                                -- snapshot

  body            text not null,
  body_html       text,                                                -- formatted version (opsiyonel)
  is_internal_note boolean not null default false,                     -- sadece admin'ler görür (iç not)
  attachments     jsonb default '[]'::jsonb,                           -- [{url, name, size}, ...]

  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_ticket on public.support_messages(ticket_id, created_at);
create index if not exists idx_messages_author on public.support_messages(author_id);

-- ----------------------------------------------------------------------------
-- 3) ADMIN USER NOTES — admin'in kullanıcı hakkında tuttuğu notlar
-- (ticket'lardan ayrı, kullanıcı detay sayfasında görünür)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_user_notes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  author_id       uuid not null references auth.users(id) on delete set null,
  body            text not null,
  pinned          boolean not null default false,                      -- öne çıkar
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_user_notes_user on public.admin_user_notes(user_id, created_at desc);

drop trigger if exists trg_user_notes_touch on public.admin_user_notes;
create trigger trg_user_notes_touch
  before update on public.admin_user_notes
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4) DATA EXPORT REQUESTS — KVKK Madde 11: veri talep etme hakkı
-- ----------------------------------------------------------------------------
create table if not exists public.data_export_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  user_email      text not null,

  status          text not null default 'pending' check (status in (
    'pending',              -- Yeni talep
    'processing',           -- Hazırlanıyor
    'ready',                -- İndirilebilir
    'delivered',            -- Kullanıcıya gönderildi
    'expired',              -- Link süresi doldu
    'cancelled'             -- İptal
  )),

  format          text not null default 'json' check (format in ('json', 'csv', 'zip')),
  download_url    text,                                                -- Supabase Storage signed URL
  download_expires_at timestamptz,
  download_count  integer default 0,

  requested_at    timestamptz not null default now(),
  processed_at    timestamptz,
  delivered_at    timestamptz,
  notes           text,                                                -- admin notu

  -- KVKK 30 günlük yanıt süresi takibi (default ile, generated değil — immutable kısıtı)
  due_at          timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_export_requests_user on public.data_export_requests(user_id);
create index if not exists idx_export_requests_status on public.data_export_requests(status);
create index if not exists idx_export_requests_due on public.data_export_requests(due_at) where status in ('pending', 'processing');

-- ----------------------------------------------------------------------------
-- 5) DATA DELETION REQUESTS — KVKK silme hakkı
-- ----------------------------------------------------------------------------
create table if not exists public.data_deletion_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,  -- silinme sonrası null kalır
  user_email      text not null,                                       -- snapshot

  reason          text,                                                -- kullanıcı sebebi yazdıysa
  status          text not null default 'pending' check (status in (
    'pending',              -- Yeni talep
    'review',               -- Admin inceliyor (şüpheli aktivite vb.)
    'approved',             -- Onaylandı, silinmeyi bekliyor
    'completed',            -- Silme tamamlandı
    'rejected',             -- Reddedildi (yasal sebep vb.)
    'cancelled'             -- Kullanıcı vazgeçti
  )),

  -- Bekletme süresi (kullanıcıya 7 gün cayma hakkı)
  cooling_off_until timestamptz default (now() + interval '7 days'),

  requested_at    timestamptz not null default now(),
  processed_at    timestamptz,
  processed_by    uuid references auth.users(id) on delete set null,
  rejection_reason text,
  admin_notes     text,

  due_at          timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_deletion_requests_user on public.data_deletion_requests(user_id);
create index if not exists idx_deletion_requests_status on public.data_deletion_requests(status);
create index if not exists idx_deletion_requests_due on public.data_deletion_requests(due_at) where status in ('pending', 'review', 'approved');

-- ----------------------------------------------------------------------------
-- 6) APP SETTINGS — admin tarafından değiştirilebilen genel ayarlar
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key             text primary key,                                    -- 'free_max_lists', 'maintenance_mode', vb.
  value           jsonb not null,
  description     text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);

drop trigger if exists trg_app_settings_touch on public.app_settings;
create trigger trg_app_settings_touch
  before update on public.app_settings
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 7) FEATURE FLAGS — özellik aç/kapat
-- ----------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key             text primary key,                                    -- 'new_dashboard', 'ai_assistant', vb.
  enabled         boolean not null default false,
  description     text,
  rollout_percent integer default 100 check (rollout_percent between 0 and 100),
  target_segments text[] default '{}',                                 -- ['pro', 'beta_users']
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);

drop trigger if exists trg_feature_flags_touch on public.feature_flags;
create trigger trg_feature_flags_touch
  before update on public.feature_flags
  for each row
  execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 8) ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- support_tickets: kullanıcı kendininkini, admin/support hepsini
alter table public.support_tickets enable row level security;

drop policy if exists "tickets_select" on public.support_tickets;
create policy "tickets_select" on public.support_tickets
  for select
  using (user_id = auth.uid() or public.has_any_admin_role(array['admin', 'support', 'analyst']::admin_role[]));

drop policy if exists "tickets_user_insert" on public.support_tickets;
create policy "tickets_user_insert" on public.support_tickets
  for insert
  with check (user_id = auth.uid());

drop policy if exists "tickets_admin_update" on public.support_tickets;
create policy "tickets_admin_update" on public.support_tickets
  for update
  using (public.has_any_admin_role(array['admin', 'support']::admin_role[]));

-- support_messages: ticket'a erişimi olan görür; iç notları sadece admin
alter table public.support_messages enable row level security;

drop policy if exists "messages_select" on public.support_messages;
create policy "messages_select" on public.support_messages
  for select
  using (
    -- Admin her şeyi görür
    public.has_any_admin_role(array['admin', 'support']::admin_role[])
    or
    -- Kullanıcı: kendi ticket'ının sadece public mesajları
    (
      not is_internal_note
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.user_id = auth.uid()
      )
    )
  );

drop policy if exists "messages_insert" on public.support_messages;
create policy "messages_insert" on public.support_messages
  for insert
  with check (
    -- Admin/support yazar, ya da ticket sahibi kullanıcı
    public.has_any_admin_role(array['admin', 'support']::admin_role[])
    or
    (
      author_type = 'user'
      and not is_internal_note
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.user_id = auth.uid()
      )
    )
  );

-- admin_user_notes: sadece admin/support
alter table public.admin_user_notes enable row level security;

drop policy if exists "user_notes_admin_all" on public.admin_user_notes;
create policy "user_notes_admin_all" on public.admin_user_notes
  for all
  using (public.has_any_admin_role(array['admin', 'support']::admin_role[]))
  with check (public.has_any_admin_role(array['admin', 'support']::admin_role[]));

-- data_export_requests: kullanıcı kendi talebi, admin hepsi
alter table public.data_export_requests enable row level security;

drop policy if exists "export_select" on public.data_export_requests;
create policy "export_select" on public.data_export_requests
  for select
  using (user_id = auth.uid() or public.has_any_admin_role(array['admin', 'support']::admin_role[]));

drop policy if exists "export_user_insert" on public.data_export_requests;
create policy "export_user_insert" on public.data_export_requests
  for insert
  with check (user_id = auth.uid());

drop policy if exists "export_admin_update" on public.data_export_requests;
create policy "export_admin_update" on public.data_export_requests
  for update
  using (public.has_any_admin_role(array['admin', 'support']::admin_role[]));

-- data_deletion_requests: aynı pattern
alter table public.data_deletion_requests enable row level security;

drop policy if exists "deletion_select" on public.data_deletion_requests;
create policy "deletion_select" on public.data_deletion_requests
  for select
  using (user_id = auth.uid() or public.has_any_admin_role(array['admin']::admin_role[]));

drop policy if exists "deletion_user_insert" on public.data_deletion_requests;
create policy "deletion_user_insert" on public.data_deletion_requests
  for insert
  with check (user_id = auth.uid());

drop policy if exists "deletion_admin_update" on public.data_deletion_requests;
create policy "deletion_admin_update" on public.data_deletion_requests
  for update
  using (public.has_any_admin_role(array['admin']::admin_role[]));

-- app_settings: herkes okur, admin yazar
alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings
  for select
  using (true);  -- public read (maintenance mode için client'tan da okumalı)

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write" on public.app_settings
  for all
  using (public.has_any_admin_role(array['admin']::admin_role[]))
  with check (public.has_any_admin_role(array['admin']::admin_role[]));

-- feature_flags: herkes okur, admin yazar
alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags_read" on public.feature_flags;
create policy "feature_flags_read" on public.feature_flags
  for select
  using (true);

drop policy if exists "feature_flags_admin_write" on public.feature_flags;
create policy "feature_flags_admin_write" on public.feature_flags
  for all
  using (public.has_any_admin_role(array['admin']::admin_role[]))
  with check (public.has_any_admin_role(array['admin']::admin_role[]));

-- ----------------------------------------------------------------------------
-- 9) GRANT'LER
-- ----------------------------------------------------------------------------
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;
grant usage, select on sequence public.support_messages_id_seq to authenticated;
grant select, insert, update, delete on public.admin_user_notes to authenticated;
grant select, insert, update on public.data_export_requests to authenticated;
grant select, insert, update on public.data_deletion_requests to authenticated;
grant select on public.app_settings to authenticated;
grant insert, update, delete on public.app_settings to authenticated;
grant select on public.feature_flags to authenticated;
grant insert, update, delete on public.feature_flags to authenticated;

-- anon kullanıcı app_settings ve feature_flags okuyabilsin (login öncesi maintenance mode kontrolü)
grant select on public.app_settings to anon;
grant select on public.feature_flags to anon;

-- ----------------------------------------------------------------------------
-- 10) MIGRATION LOG
-- ----------------------------------------------------------------------------
insert into public._migration_log (version, description)
values ('0004', 'Support tickets/messages, KVKK requests, app_settings, feature_flags')
on conflict (version) do nothing;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- drop policy if exists "feature_flags_admin_write" on public.feature_flags;
-- drop policy if exists "feature_flags_read" on public.feature_flags;
-- drop policy if exists "app_settings_admin_write" on public.app_settings;
-- drop policy if exists "app_settings_read" on public.app_settings;
-- drop policy if exists "deletion_admin_update" on public.data_deletion_requests;
-- drop policy if exists "deletion_user_insert" on public.data_deletion_requests;
-- drop policy if exists "deletion_select" on public.data_deletion_requests;
-- drop policy if exists "export_admin_update" on public.data_export_requests;
-- drop policy if exists "export_user_insert" on public.data_export_requests;
-- drop policy if exists "export_select" on public.data_export_requests;
-- drop policy if exists "user_notes_admin_all" on public.admin_user_notes;
-- drop policy if exists "messages_insert" on public.support_messages;
-- drop policy if exists "messages_select" on public.support_messages;
-- drop policy if exists "tickets_admin_update" on public.support_tickets;
-- drop policy if exists "tickets_user_insert" on public.support_tickets;
-- drop policy if exists "tickets_select" on public.support_tickets;
-- drop trigger if exists trg_feature_flags_touch on public.feature_flags;
-- drop trigger if exists trg_app_settings_touch on public.app_settings;
-- drop trigger if exists trg_user_notes_touch on public.admin_user_notes;
-- drop trigger if exists trg_tickets_touch on public.support_tickets;
-- drop table if exists public.feature_flags;
-- drop table if exists public.app_settings;
-- drop table if exists public.data_deletion_requests;
-- drop table if exists public.data_export_requests;
-- drop table if exists public.admin_user_notes;
-- drop table if exists public.support_messages;
-- drop table if exists public.support_tickets;
-- delete from public._migration_log where version = '0004';
