import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Shield, Download, Trash2, AlertTriangle } from 'lucide-react';
import {
  listExportRequests,
  listDeletionRequests,
  getKvkkStats,
} from '@/lib/kvkk';
import {
  EXPORT_STATUS_LABELS,
  DELETION_STATUS_LABELS,
  isOverdue,
  daysUntilDue,
} from '@/lib/kvkk-shared';
import { logAudit } from '@/lib/audit';
import { ExportStatusButtons, DeletionStatusButtons } from './status-buttons';

export default async function KvkkPage(props: {
  searchParams: Promise<{ tab?: 'export' | 'deletion' }>;
}) {
  const sp = await props.searchParams;
  const tab = sp.tab ?? 'export';

  const [exports, deletions, stats] = await Promise.all([
    listExportRequests(),
    listDeletionRequests(),
    getKvkkStats(),
  ]);
  await logAudit('USER_VIEWED', { targetType: 'kvkk_requests' });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          KVKK Talepleri
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          KVKK Madde 11 kapsamında veri ihracı ve silme talepleri. Yasal yanıt süresi <strong>30 gün</strong>; süre aşımları kırmızı işaretli.
        </p>
      </div>

      {/* KPI'lar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi label="Bekleyen ihraç" value={stats.pending_exports} accent="blue" />
        <Kpi label="Bekleyen silme" value={stats.pending_deletions} accent="amber" />
        <Kpi
          label="Süre aşımı"
          value={stats.overdue}
          accent={stats.overdue > 0 ? 'red' : 'slate'}
          hint="30 gün geçmiş, yasal süre"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/admin/kvkk?tab=export"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-2 ${
            tab === 'export'
              ? 'border-[#12A3E3] text-[#12A3E3]'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          Veri ihracı ({exports.length})
        </Link>
        <Link
          href="/admin/kvkk?tab=deletion"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-2 ${
            tab === 'deletion'
              ? 'border-[#12A3E3] text-[#12A3E3]'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Veri silme ({deletions.length})
        </Link>
      </div>

      {tab === 'export' ? (
        <ExportTable exports={exports} />
      ) : (
        <DeletionTable deletions={deletions} />
      )}
    </div>
  );
}

function ExportTable({ exports }: { exports: Awaited<ReturnType<typeof listExportRequests>> }) {
  if (exports.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
        <Download className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Veri ihracı talebi yok.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <tr>
            <th className="text-left p-3 font-medium">Kullanıcı</th>
            <th className="text-left p-3 font-medium">Format</th>
            <th className="text-left p-3 font-medium">Durum</th>
            <th className="text-left p-3 font-medium">Talep edildi</th>
            <th className="text-left p-3 font-medium">Süre</th>
            <th className="text-right p-3 font-medium">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {exports.map((r) => {
            const st = EXPORT_STATUS_LABELS[r.status];
            const overdue = isOverdue(r.due_at, r.status);
            const days = daysUntilDue(r.due_at);
            return (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="p-3">
                  <Link
                    href={`/admin/users/${r.user_id}`}
                    className="text-sm text-slate-900 dark:text-slate-100 hover:text-[#12A3E3]"
                  >
                    {r.user_email}
                  </Link>
                </td>
                <td className="p-3 text-xs text-slate-600 dark:text-slate-400 uppercase">
                  {r.format}
                </td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}>
                    {st.label}
                  </span>
                  {r.download_count > 0 && (
                    <span className="ml-1.5 text-[10px] text-slate-500">{r.download_count}× indirildi</span>
                  )}
                </td>
                <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {format(new Date(r.requested_at), 'd MMM yyyy', { locale: tr })}
                </td>
                <td className={`p-3 text-xs whitespace-nowrap ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {overdue && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
                  {overdue
                    ? `${Math.abs(days)} gün gecikme`
                    : days >= 0
                      ? `${days} gün kaldı`
                      : '—'}
                </td>
                <td className="p-3 text-right">
                  <ExportStatusButtons id={r.id} currentStatus={r.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeletionTable({ deletions }: { deletions: Awaited<ReturnType<typeof listDeletionRequests>> }) {
  if (deletions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
        <Trash2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Veri silme talebi yok.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <tr>
            <th className="text-left p-3 font-medium">Kullanıcı</th>
            <th className="text-left p-3 font-medium">Sebep</th>
            <th className="text-left p-3 font-medium">Durum</th>
            <th className="text-left p-3 font-medium">Cayma süresi</th>
            <th className="text-left p-3 font-medium">Süre</th>
            <th className="text-right p-3 font-medium">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {deletions.map((r) => {
            const st = DELETION_STATUS_LABELS[r.status];
            const overdue = isOverdue(r.due_at, r.status);
            const days = daysUntilDue(r.due_at);
            const coolingActive =
              r.cooling_off_until &&
              new Date(r.cooling_off_until).getTime() > Date.now();
            const coolingDays = r.cooling_off_until
              ? daysUntilDue(r.cooling_off_until)
              : 0;
            return (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="p-3">
                  {r.user_id ? (
                    <Link
                      href={`/admin/users/${r.user_id}`}
                      className="text-sm text-slate-900 dark:text-slate-100 hover:text-[#12A3E3]"
                    >
                      {r.user_email}
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-700 dark:text-slate-300">{r.user_email}</span>
                  )}
                </td>
                <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={r.reason ?? ''}>
                  {r.reason ?? '—'}
                </td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}>
                    {st.label}
                  </span>
                </td>
                <td className="p-3 text-xs whitespace-nowrap">
                  {coolingActive ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      {coolingDays} gün cayma
                    </span>
                  ) : (
                    <span className="text-slate-400">— bitti</span>
                  )}
                </td>
                <td className={`p-3 text-xs whitespace-nowrap ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {overdue && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
                  {overdue
                    ? `${Math.abs(days)} gün gecikme`
                    : days >= 0
                      ? `${days} gün kaldı`
                      : '—'}
                </td>
                <td className="p-3 text-right">
                  {coolingActive && r.status === 'pending' ? (
                    <span className="text-[10px] text-slate-400">cayma süresi aktif</span>
                  ) : (
                    <DeletionStatusButtons id={r.id} currentStatus={r.status} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: 'blue' | 'red' | 'amber' | 'slate';
}) {
  const colors = {
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    slate: 'text-slate-600 dark:text-slate-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold ${colors[accent]}`}>{value}</div>
      {hint && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}
