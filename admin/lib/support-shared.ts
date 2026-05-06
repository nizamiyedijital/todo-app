/**
 * Client + server safe — destek talepleri tipleri ve durum yardımcıları.
 */

export type TicketStatus =
  | 'new'
  | 'in_progress'
  | 'awaiting_user'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type TicketCategory =
  | 'bug'
  | 'feature_request'
  | 'billing'
  | 'account'
  | 'data'
  | 'other';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketSource = 'in_app' | 'email' | 'crisp' | 'manual';

export type MessageAuthorType = 'user' | 'admin' | 'system';

export interface SupportTicket {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  assigned_to_email?: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  satisfaction_rating: number | null;
  source: TicketSource;
  related_url: string | null;
  app_version: string | null;
  platform: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  message_count?: number;
}

export interface SupportMessage {
  id: number;
  ticket_id: string;
  author_id: string | null;
  author_type: MessageAuthorType;
  author_email: string | null;
  body: string;
  body_html: string | null;
  is_internal_note: boolean;
  attachments: Array<{ url: string; name: string; size?: number }>;
  created_at: string;
}

// ── UI Labels ────────────────────────────────────────────────────────────────

export const TICKET_STATUS_LABELS: Record<
  TicketStatus,
  { label: string; cls: string }
> = {
  new: { label: 'Yeni', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  in_progress: { label: 'İnceleniyor', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  awaiting_user: { label: 'Cevap bekliyor', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  escalated: { label: 'Yönlendirildi', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  resolved: { label: 'Çözüldü', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  closed: { label: 'Kapalı', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Hata',
  feature_request: 'Özellik isteği',
  billing: 'Faturalandırma',
  account: 'Hesap',
  data: 'Veri/KVKK',
  other: 'Diğer',
};

export const TICKET_PRIORITY_LABELS: Record<
  TicketPriority,
  { label: string; cls: string }
> = {
  low: { label: 'Düşük', cls: 'text-slate-500' },
  normal: { label: 'Normal', cls: 'text-slate-700 dark:text-slate-300' },
  high: { label: 'Yüksek', cls: 'text-amber-600 dark:text-amber-400 font-medium' },
  urgent: { label: 'Acil', cls: 'text-red-600 dark:text-red-400 font-semibold' },
};

export function isOpenStatus(s: TicketStatus): boolean {
  return s !== 'resolved' && s !== 'closed';
}
