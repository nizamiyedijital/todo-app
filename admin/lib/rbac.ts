/**
 * Role-Based Access Control — client + server tarafında permission kontrolü.
 *
 * RBAC matrisi: docs/admin/RBAC_MATRIX.md
 *
 * Kullanım:
 *   import { hasPermission, ROLES } from '@/lib/rbac';
 *   if (!hasPermission(userRoles, 'subscriptions', 'refund')) { ... }
 */

export const ROLES = ['owner', 'admin', 'support', 'content_editor', 'analyst'] as const;
export type Role = (typeof ROLES)[number];

export type Resource =
  | 'users'
  | 'users.notes'
  | 'articles'
  | 'notification_campaigns'
  | 'notification_campaigns.send'
  | 'subscriptions'
  | 'subscriptions.refund'
  | 'payments'
  | 'support_tickets'
  | 'audit_log'
  | 'admin_users'
  | 'app_settings'
  | 'feature_flags'
  | 'data_export_requests'
  | 'data_deletion_requests'
  | 'analytics';

export type Action = 'read' | 'write' | 'delete';

// Her rol için resource × action izinleri
const PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
  owner: {
    // Owner her şeyi yapar — wildcard yerine açık liste güvenli
    users: ['read', 'write', 'delete'],
    'users.notes': ['read', 'write', 'delete'],
    articles: ['read', 'write', 'delete'],
    notification_campaigns: ['read', 'write', 'delete'],
    'notification_campaigns.send': ['write'],
    subscriptions: ['read', 'write', 'delete'],
    'subscriptions.refund': ['write'],
    payments: ['read'],
    support_tickets: ['read', 'write', 'delete'],
    audit_log: ['read'], // delete bilinçli olarak yok
    admin_users: ['read', 'write', 'delete'],
    app_settings: ['read', 'write'],
    feature_flags: ['read', 'write'],
    data_export_requests: ['read', 'write'],
    data_deletion_requests: ['read', 'write'],
    analytics: ['read'],
  },
  admin: {
    users: ['read', 'write', 'delete'],
    'users.notes': ['read', 'write', 'delete'],
    articles: ['read', 'write', 'delete'],
    notification_campaigns: ['read', 'write', 'delete'],
    'notification_campaigns.send': ['write'],
    subscriptions: ['read', 'write'],
    'subscriptions.refund': ['write'],
    payments: ['read'],
    support_tickets: ['read', 'write', 'delete'],
    audit_log: ['read'],
    admin_users: ['read'],
    app_settings: ['read', 'write'],
    feature_flags: ['read', 'write'],
    data_export_requests: ['read', 'write'],
    data_deletion_requests: ['read', 'write'],
    analytics: ['read'],
  },
  support: {
    users: ['read', 'write'],
    'users.notes': ['read', 'write'],
    articles: ['read'],
    notification_campaigns: ['read'],
    subscriptions: ['read'],
    payments: ['read'],
    support_tickets: ['read', 'write'],
    audit_log: ['read'],
    data_export_requests: ['read', 'write'],
    analytics: ['read'],
  },
  content_editor: {
    articles: ['read', 'write'],
    notification_campaigns: ['read', 'write'],
    'notification_campaigns.send': ['write'],
    analytics: ['read'],
  },
  analyst: {
    users: ['read'], // PII maskeleme uygulama katmanında yapılır
    'users.notes': ['read'],
    articles: ['read'],
    notification_campaigns: ['read'],
    subscriptions: ['read'],
    payments: ['read'],
    support_tickets: ['read'],
    audit_log: ['read'],
    admin_users: ['read'],
    app_settings: ['read'],
    feature_flags: ['read'],
    analytics: ['read'],
  },
};

/**
 * Bir veya daha fazla role sahip kullanıcının verilen kaynak+aksiyon kombinasyonu için
 * yetkisi var mı? Çoklu rolde permission'lar UNION'lanır.
 */
export function hasPermission(
  userRoles: Role[],
  resource: Resource,
  action: Action,
): boolean {
  if (!userRoles?.length) return false;
  // Owner her şeye yetkili (kısa devre)
  if (userRoles.includes('owner')) return true;

  return userRoles.some((role) => {
    const allowed = PERMISSIONS[role]?.[resource];
    return Array.isArray(allowed) && allowed.includes(action);
  });
}

/**
 * Bir kullanıcının belirli bir role sahip olup olmadığını kontrol eder.
 * Owner her zaman true döner (god-mode).
 */
export function hasRole(userRoles: Role[], required: Role): boolean {
  if (!userRoles?.length) return false;
  if (userRoles.includes('owner')) return true;
  return userRoles.includes(required);
}

/**
 * Sidebar/menü için: kullanıcı bu kaynağa erişebiliyor mu?
 * (en az read yetkisi var mı)
 */
export function canAccessResource(userRoles: Role[], resource: Resource): boolean {
  return hasPermission(userRoles, resource, 'read');
}
