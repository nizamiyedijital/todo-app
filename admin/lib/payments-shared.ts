/**
 * Client + server safe — payment tipleri ve durum yardımcıları.
 */

export type PaymentStatus =
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'pending'
  | 'requires_action';

export interface Payment {
  id: string;
  subscription_id: string | null;
  user_id: string;
  user_email?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  card_last4: string | null;
  card_brand: string | null;
  iyzico_payment_id: string | null;
  iyzico_payment_transaction_id: string | null;
  iyzico_conversation_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  retry_count: number;
  refund_amount: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export const PAYMENT_STATUS_LABELS: Record<
  PaymentStatus,
  { label: string; cls: string }
> = {
  succeeded: { label: 'Başarılı', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  failed: { label: 'Başarısız', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  refunded: { label: 'İade', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  partially_refunded: { label: 'Kısmi iade', cls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  pending: { label: 'İşleniyor', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  requires_action: { label: '3D-Secure', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};
