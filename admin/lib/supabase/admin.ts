/**
 * Service-role Supabase client — sadece sunucu tarafında kullanılır.
 * Bu client TÜM RLS'i bypass eder. ASLA client component'te import etme.
 *
 * Kullanım örnekleri:
 * - Webhook handler'lar (Iyzico, vb.)
 * - Admin'in kullanıcı silme/plan değiştirme gibi yetki gerektiren işlemleri
 * - Cron job'lar
 */
import { createClient } from '@supabase/supabase-js';

let cached: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      '[supabase/admin] NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY tanımlı değil',
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
