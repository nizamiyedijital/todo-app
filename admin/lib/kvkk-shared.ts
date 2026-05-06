/**
 * Client + server safe — KVKK talep tipleri (veri ihracı + silme).
 */

export type ExportStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'delivered'
  | 'expired'
  | 'cancelled';

export type ExportFormat = 'json' | 'csv' | 'zip';

export type DeletionStatus =
  | 'pending'
  | 'review'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface DataExportRequest {
  id: string;
  user_id: string;
  user_email: string;
  status: ExportStatus;
  format: ExportFormat;
  download_url: string | null;
  download_expires_at: string | null;
  download_count: number;
  requested_at: string;
  processed_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  due_at: string;
}

export interface DataDeletionRequest {
  id: string;
  user_id: string | null;
  user_email: string;
  reason: string | null;
  status: DeletionStatus;
  cooling_off_until: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  due_at: string;
}

export const EXPORT_STATUS_LABELS: Record<ExportStatus, { label: string; cls: string }> = {
  pending: { label: 'Yeni', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  processing: { label: 'Hazırlanıyor', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  ready: { label: 'Hazır', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  delivered: { label: 'İletildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  expired: { label: 'Süresi doldu', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  cancelled: { label: 'İptal', cls: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
};

export const DELETION_STATUS_LABELS: Record<DeletionStatus, { label: string; cls: string }> = {
  pending: { label: 'Yeni', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  review: { label: 'İnceleniyor', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  approved: { label: 'Onaylandı', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  completed: { label: 'Silindi', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  rejected: { label: 'Reddedildi', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  cancelled: { label: 'İptal', cls: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
};

export function isOverdue(dueAt: string, status: string): boolean {
  if (status === 'completed' || status === 'delivered' || status === 'cancelled' || status === 'rejected' || status === 'expired') {
    return false;
  }
  return new Date(dueAt).getTime() < Date.now();
}

export function daysUntilDue(dueAt: string): number {
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.ceil(ms / 86400_000);
}
