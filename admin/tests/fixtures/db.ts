/**
 * Test data fixture'ları — Supabase REST üzerinden service-role key ile.
 * Her test kendi temizliğini yapar (afterEach veya afterAll).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  throw new Error('Test DB için NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY gerekli');
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

async function rest<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!r.ok) {
    throw new Error(`REST ${init?.method ?? 'GET'} ${path} → ${r.status}: ${await r.text()}`);
  }
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

// ── Subscription helpers ─────────────────────────────────────────────────────

export async function getProMonthlyPlanId(): Promise<string> {
  const rows = await rest<Array<{ id: string }>>('/subscription_plans?code=eq.pro_monthly_try&select=id');
  if (!rows[0]) throw new Error('pro_monthly_try plan yok — seed_subscription_plans.sql çalıştırılmalı');
  return rows[0].id;
}

export async function createActiveSub(userId: string, planId?: string, periodDays = 30): Promise<{ id: string }> {
  const pid = planId ?? (await getProMonthlyPlanId());
  const now = new Date();
  const end = new Date(now.getTime() + periodDays * 86400_000);
  const [row] = await rest<Array<{ id: string }>>('/subscriptions', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      plan_id: pid,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      amount_at_signup: 99.0,
      currency_at_signup: 'TRY',
      metadata: { source: 'e2e_test' },
    }),
  });
  return row;
}

export async function deleteAllTestSubs(): Promise<void> {
  // E2E test ya da manuel admin testi sırasında oluşturulan tüm sub'lar
  await rest("/subscriptions?metadata->>source=in.(e2e_test,admin_manual,admin_manual_seed)", {
    method: 'DELETE',
  });
}

export async function deleteSubsForUser(userId: string): Promise<void> {
  await rest(`/subscriptions?user_id=eq.${userId}`, { method: 'DELETE' });
}

// ── Coupon helpers ───────────────────────────────────────────────────────────

export async function deleteCouponByCode(code: string): Promise<void> {
  await rest(`/coupons?code=eq.${encodeURIComponent(code)}`, { method: 'DELETE' });
}

// ── Support helpers ──────────────────────────────────────────────────────────

export async function deleteTicketsByPrefix(prefix: string): Promise<void> {
  // Test ticket'ları metadata.source='e2e_test' ile işaretlenir (PostgREST ilike % URL
  // encoding Supabase Cloudflare worker'da 500 atıyor, daha güvenli filter)
  // Önce kayıt yapılırken metadata zaten e2e_test olarak set ediliyor varsayıyoruz.
  // Eski subject prefix yaklaşımı yerine, hem prefix hem metadata source ile sil.
  void prefix; // backward-compat parametre
  await rest("/support_tickets?metadata->>source=eq.e2e_test", { method: 'DELETE' });
}

export async function deleteTicketsForUser(userId: string): Promise<void> {
  await rest(`/support_tickets?user_id=eq.${userId}`, { method: 'DELETE' });
}

// ── KVKK helpers ─────────────────────────────────────────────────────────────

export async function deleteKvkkRequestsByUser(userId: string): Promise<void> {
  await rest(`/data_export_requests?user_id=eq.${userId}`, { method: 'DELETE' });
  await rest(`/data_deletion_requests?user_id=eq.${userId}`, { method: 'DELETE' });
}

// ── Generic ──────────────────────────────────────────────────────────────────

export async function dbGet<T = unknown>(path: string): Promise<T> {
  return rest<T>(path);
}

// ── ID'leri dosyadan oku ─────────────────────────────────────────────────────

import { readFileSync } from 'fs';

export function getTestIds(): { adminUserId: string; webUserId: string; adminEmail: string; webEmail: string } {
  return JSON.parse(readFileSync('tests/.auth/ids.json', 'utf-8'));
}
