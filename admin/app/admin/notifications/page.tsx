import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Bell } from 'lucide-react';
import { listCampaigns, type CampaignStatus } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Taslak', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  scheduled: { label: 'Zamanlandı', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  sending: { label: 'Gönderiliyor', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  sent: { label: 'Gönderildi', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  cancelled: { label: 'İptal', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const TARGET_LABELS: Record<string, string> = {
  all: 'Hepsi',
  free: 'Free',
  pro: 'Pro',
  inactive_7d: '7 gün inaktif',
  inactive_30d: '30 gün inaktif',
  no_first_task: 'İlk görev yok',
  high_completion: 'Yüksek tamamlama',
  payment_failed: 'Ödeme fail',
  segment: 'Segment',
};

export default async function NotificationsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await props.searchParams;
  const status = (sp.status as 'all' | CampaignStatus) ?? 'all';
  const campaigns = await listCampaigns(status);
  await logAudit('USER_VIEWED', { targetType: 'notifications_list' });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Bildirim Kampanyaları
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kullanıcılara hedeflenmiş bildirimler. Toplam {campaigns.length}.
          </p>
        </div>
        <Link
          href="/admin/notifications/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf]"
        >
          <Plus className="w-4 h-4" />
          Yeni kampanya
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { key: 'all', label: 'Hepsi' },
          { key: 'draft', label: 'Taslaklar' },
          { key: 'scheduled', label: 'Zamanlanmış' },
          { key: 'sent', label: 'Gönderilmiş' },
          { key: 'cancelled', label: 'İptal' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/notifications' : `/admin/notifications?status=${tab.key}`}
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

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            Bu kategori için kampanya yok.
          </p>
          <Link
            href="/admin/notifications/new"
            className="inline-flex items-center gap-2 mt-3 text-sm text-[#12A3E3] hover:underline"
          >
            <Plus className="w-4 h-4" /> İlk kampanyayı oluştur
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium">Başlık & Mesaj</th>
                <th className="text-left p-3 font-medium">Hedef</th>
                <th className="text-left p-3 font-medium">Kanal</th>
                <th className="text-left p-3 font-medium">Durum</th>
                <th className="text-right p-3 font-medium">Performans</th>
                <th className="text-left p-3 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {campaigns.map((c) => {
                const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft;
                const openRate =
                  c.delivered_count > 0
                    ? Math.round((c.opened_count / c.delivered_count) * 100)
                    : 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3 max-w-xs">
                      <Link
                        href={`/admin/notifications/${c.id}`}
                        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-[#12A3E3] line-clamp-1"
                      >
                        {c.title}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {c.message}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {TARGET_LABELS[c.target_audience] ?? c.target_audience}
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {c.delivery_method}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {c.status === 'sent' ? (
                        <>
                          <div>{c.delivered_count}/{c.recipient_count}</div>
                          <div className="text-[10px] text-slate-400">{openRate}% açıldı</div>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {c.sent_at
                        ? format(new Date(c.sent_at), 'd MMM HH:mm', { locale: tr })
                        : c.scheduled_for
                          ? `→ ${format(new Date(c.scheduled_for), 'd MMM HH:mm', { locale: tr })}`
                          : format(new Date(c.created_at), 'd MMM', { locale: tr })}
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
