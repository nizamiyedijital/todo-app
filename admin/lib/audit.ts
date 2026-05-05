/**
 * Audit log servisi — her admin işlemi için çağrılır.
 * Supabase'deki log_admin_action() RPC'sini wrap eder.
 *
 * Kullanım:
 *   import { logAudit } from '@/lib/audit';
 *   await logAudit('USER_UPDATED', { targetType: 'user', targetId: id, payload: { from, to } });
 */
import { createClient as createServerClient } from './supabase/server';

export type AuditAction =
  // Auth & admin yönetimi
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_CREATED'
  | 'ADMIN_ROLE_GRANTED'
  | 'ADMIN_ROLE_REVOKED'
  | 'PERMISSION_DENIED'
  // Kullanıcılar
  | 'USER_VIEWED'
  | 'USER_UPDATED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'USER_NOTE_ADDED'
  // Makaleler
  | 'ARTICLE_CREATED'
  | 'ARTICLE_UPDATED'
  | 'ARTICLE_PUBLISHED'
  | 'ARTICLE_ARCHIVED'
  | 'ARTICLE_DELETED'
  // Bildirimler
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_SCHEDULED'
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_CANCELLED'
  // Abonelikler / Ödemeler
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'PAYMENT_REFUNDED'
  | 'PLAN_CHANGED'
  // Destek
  | 'TICKET_ASSIGNED'
  | 'TICKET_RESOLVED'
  | 'TICKET_REPLIED'
  // Ayarlar
  | 'SETTINGS_UPDATED'
  | 'FEATURE_FLAG_CHANGED'
  // KVKK
  | 'DATA_EXPORT_FULFILLED'
  | 'DATA_DELETION_APPROVED'
  | 'DATA_DELETION_REJECTED';

export interface AuditOptions {
  targetType?: string;
  targetId?: string | number;
  payload?: Record<string, unknown>;
}

/**
 * Audit log kaydı yazar. Hata olursa sessizce log'lar (asıl işlemi engellemez).
 */
export async function logAudit(
  action: AuditAction,
  options: AuditOptions = {},
): Promise<void> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.rpc('log_admin_action', {
      p_action: action,
      p_target_type: options.targetType ?? null,
      p_target_id: options.targetId ? String(options.targetId) : null,
      p_payload: options.payload ?? {},
    });

    if (error) {
      console.error('[audit] RPC hatası:', error.message, { action, options });
    }
  } catch (e) {
    console.error('[audit] Beklenmeyen hata:', e);
  }
}
