import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Tag } from 'lucide-react';
import { listCoupons, getCouponStats } from '@/lib/coupons';
import {
  COUPON_STATUS_LABELS,
  formatDiscount,
  isCurrentlyValid,
  type CouponStatus,
} from '@/lib/coupons-shared';
import { logAudit } from '@/lib/audit';
import { CreateCouponForm } from './create-form';
import { StatusToggle } from './status-toggle';

const STATUS_TABS: Array<{ key: 'all' | CouponStatus; label: string }> = [
  { key: 'all', label: 'Hepsi' },
  { key: 'active', label: 'Aktif' },
  { key: 'paused', label: 'Duraklatıldı' },
  { key: 'expired', label: 'Süresi Doldu' },
];

export default async function CouponsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await props.searchParams;
  const status = (sp.status as 'all' | CouponStatus) ?? 'all';

  const [coupons, stats] = await Promise.all([
    listCoupons({ status }),
    getCouponStats(),
  ]);
  await logAudit('USER_VIEWED', { targetType: 'coupons_list' });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-6 h-6" />
            Kuponlar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            İndirim kodları. Faz 3.B'de Iyzico checkout akışına bağlanacak — şu an
            DB'de tanımlı kalıyor, kullanıcılar henüz uygulayamıyor.
          </p>
        </div>
        <CreateCouponForm />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi label="Aktif kupon" value={stats.active} accent="emerald" />
        <Kpi label="Toplam kullanım" value={stats.total_redemptions} accent="blue" />
        <Kpi
          label="Toplam kupon"
          value={coupons.length}
          accent="slate"
          hint="bu listede"
        />
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/coupons' : `/admin/coupons?status=${tab.key}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              status === tab.key
                ? 'border-[#12A3E3] text-[#12A3E3]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Tag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            Henüz kupon yok
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            "Yeni Kupon" butonuyla başla
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium">Kod</th>
                <th className="text-left p-3 font-medium">İndirim</th>
                <th className="text-left p-3 font-medium">Kullanım</th>
                <th className="text-left p-3 font-medium">Durum</th>
                <th className="text-left p-3 font-medium">Bitiş</th>
                <th className="text-right p-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {coupons.map((c) => {
                const st = COUPON_STATUS_LABELS[c.status];
                const valid = isCurrentlyValid(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <code className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        {c.code}
                      </code>
                      {c.description && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {formatDiscount(c)}
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {c.redeemed_count} / {c.max_redemptions ?? '∞'}
                      {c.per_user_limit !== 1 && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({c.per_user_limit}/kişi)
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}
                      >
                        {st.label}
                      </span>
                      {!valid && c.status === 'active' && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                          {c.expires_at && new Date(c.expires_at).getTime() < Date.now()
                            ? 'Süre doldu'
                            : 'Henüz başlamadı'}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {c.expires_at
                        ? format(new Date(c.expires_at), 'd MMM yyyy', { locale: tr })
                        : '∞'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <StatusToggle id={c.id} currentStatus={c.status} />
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
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: 'emerald' | 'blue' | 'slate';
}) {
  const colors = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
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
