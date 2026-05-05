/**
 * Admin paneli sidebar nav konfigürasyonu.
 * Her item'ın ihtiyaç duyduğu rol/permission tanımlı — kullanıcının
 * yetkisine göre item'lar otomatik gizlenir.
 */
import type { Resource } from './rbac';

export interface NavItem {
  href: string;
  label: string;
  iconName: string; // lucide-react ikon adı, component'te dynamic import
  requires: Resource;
  badge?: string; // 'Yakında', 'Yeni' gibi
  faz?: number; // hangi fazda aktif olacak (UI'da disabled görünüm)
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Genel',
    items: [
      {
        href: '/admin',
        label: 'Genel Bakış',
        iconName: 'LayoutDashboard',
        requires: 'analytics',
      },
      {
        href: '/admin/users',
        label: 'Kullanıcılar',
        iconName: 'Users',
        requires: 'users',
        faz: 1,
      },
    ],
  },
  {
    label: 'İçerik',
    items: [
      {
        href: '/admin/articles',
        label: 'Makaleler',
        iconName: 'FileText',
        requires: 'articles',
        faz: 1,
      },
      {
        href: '/admin/notifications',
        label: 'Bildirimler',
        iconName: 'Bell',
        requires: 'notification_campaigns',
        faz: 1,
      },
    ],
  },
  {
    label: 'Para',
    items: [
      {
        href: '/admin/subscriptions',
        label: 'Abonelikler',
        iconName: 'CreditCard',
        requires: 'subscriptions',
        faz: 1,
        badge: 'Mock',
      },
      {
        href: '/admin/payments',
        label: 'Ödemeler',
        iconName: 'Wallet',
        requires: 'payments',
        faz: 3,
        badge: 'Faz 3',
      },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      {
        href: '/admin/support',
        label: 'Destek',
        iconName: 'LifeBuoy',
        requires: 'support_tickets',
        faz: 4,
        badge: 'Faz 4',
      },
      {
        href: '/admin/analytics',
        label: 'Analitik',
        iconName: 'BarChart3',
        requires: 'analytics',
        faz: 1, // placeholder sayfası Faz 1C.4'te eklendi, gerçek içerik Faz 2'de
        badge: 'Hazırlık',
      },
      {
        href: '/admin/system-health',
        label: 'Sistem Sağlığı',
        iconName: 'Activity',
        requires: 'app_settings',
        faz: 1,
      },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      {
        href: '/admin/settings',
        label: 'Ayarlar',
        iconName: 'Settings',
        requires: 'app_settings',
        faz: 1,
      },
      {
        href: '/admin/admin-users',
        label: 'Admin Kullanıcıları',
        iconName: 'ShieldCheck',
        requires: 'admin_users',
        faz: 1,
      },
      {
        href: '/admin/audit-log',
        label: 'Audit Log',
        iconName: 'ScrollText',
        requires: 'audit_log',
        faz: 1,
      },
    ],
  },
];
