import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Wallet, AlertCircle } from 'lucide-react';
import { listPayments, getPaymentStats } from '@/lib/payments';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/lib/payments-shared';
import { logAudit } from '@/lib/audit';

const STATUS_TABS: Array<{ key: 'all' | PaymentStatus; label: string }> = [
  { key: 'all', label: 'Hepsi' },
  { key: 'succeeded', label: 'Başarılı' },
  { key: 'failed', label: 'Başarısız' },
  { key: 'refunded', label: 'İade' },
  { key: 'pending', label: 'İşleniyor' },
];

const formatAmount = (n: number, currency: string = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

export default async function PaymentsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await props.searchParams;
  const status = (sp.status as 'all' | PaymentStatus) ?? 'all';

  const [{ payments, hasServiceRole }, stats] = await Promise.all([
    listPayments({ status }),
    getPaymentStats(),
  ]);
  await logAudit('USER_VIEWED', { targetType: 'payments_list' });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          Ödemeler
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Iyzico üzerinden tahsil edilen ödemeler. Veri akışı Faz 3.B'de webhook ile başlayacak.
        </p>
      </div>

      {/* Iyzico bekliyor uyarısı */}
      {payments.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-4 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-900 dark:text-amber-200">
              Iyzico entegrasyonu beklemede
            </div>
            <div className="text-amber-700 dark:text-amber-300 text-xs mt-1">
              Tablo şu an boş. Kullanıcı checkout'tan ödeme yapınca burası dolacak.
              Faz 3.B'de <code>/api/iyzico/webhook</code> endpoint'i payments tablosuna
              kayıt yazacak — admin tarafında ek değişiklik gerekmiyor.
            </div>
          </div>
        </div>
      )}

      {/* KPI'lar (boşsa hepsi 0) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Başarılı (30g)" value={stats.succeeded_count_30d.toString()} accent="emerald" />
        <Kpi
          label="Tahsilat (30g)"
          value={formatAmount(stats.succeeded_amount_30d)}
          accent="blue"
        />
        <Kpi label="Başarısız (30g)" value={stats.failed_count_30d.toString()} accent="red" />
        <Kpi
          label="İade (30g)"
          value={formatAmount(stats.refunded_amount_30d)}
          accent="purple"
        />
      </div>

      {!hasServiceRole && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
          Service-role key eksik — kullanıcı email'leri görünmüyor.
        </div>
      )}

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/payments' : `/admin/payments?status=${tab.key}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              status === tab.key
                ? 'border-[#12A3E3] text-[#12A3E3]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Wallet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            {status === 'all' ? 'Henüz ödeme yok' : 'Bu durumda ödeme yok'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium">Kullanıcı</th>
                <th className="text-right p-3 font-medium">Tutar</th>
                <th className="text-left p-3 font-medium">Durum</th>
                <th className="text-left p-3 font-medium">Yöntem</th>
                <th className="text-left p-3 font-medium whitespace-nowrap">Tarih</th>
                <th className="text-left p-3 font-medium">Iyzico ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => {
                const st = PAYMENT_STATUS_LABELS[p.status];
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <Link
                        href={`/admin/users/${p.user_id}`}
                        className="text-sm text-slate-900 dark:text-slate-100 hover:text-[#12A3E3]"
                      >
                        {p.user_email ?? <code className="text-xs">{p.user_id.slice(0, 8)}…</code>}
                      </Link>
                    </td>
                    <td className="p-3 text-right text-sm text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatAmount(Number(p.amount), p.currency)}
                      {p.refund_amount && (
                        <div className="text-[10px] text-purple-600 dark:text-purple-400">
                          −{formatAmount(Number(p.refund_amount), p.currency)} iade
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}>
                        {st.label}
                      </span>
                      {p.failure_message && (
                        <div className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 truncate max-w-[200px]" title={p.failure_message}>
                          {p.failure_code} {p.failure_message}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {p.payment_method === 'card' && p.card_last4 ? (
                        <span>
                          {p.card_brand?.toUpperCase() ?? 'Kart'} •••• {p.card_last4}
                        </span>
                      ) : (
                        p.payment_method ?? '—'
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(p.paid_at ?? p.created_at), 'd MMM yyyy HH:mm', { locale: tr })}
                    </td>
                    <td className="p-3">
                      {p.iyzico_payment_id ? (
                        <code className="text-[10px] text-slate-600 dark:text-slate-400">
                          {p.iyzico_payment_id.slice(0, 12)}…
                        </code>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">— manual</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'emerald' | 'blue' | 'red' | 'purple';
}) {
  const colors = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-semibold ${colors[accent]} tabular-nums`}>{value}</div>
    </div>
  );
}
