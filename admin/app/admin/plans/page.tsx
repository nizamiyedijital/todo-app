import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Crown, AlertCircle } from 'lucide-react';
import { listPlans } from '@/lib/subscriptions';
import { logAudit } from '@/lib/audit';

export default async function PlansPage() {
  const plans = await listPlans();
  await logAudit('USER_VIEWED', { targetType: 'plans_list' });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Abonelik Planları
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Iyzico'ya bağlı abonelik planları. Plan oluşturma/düzenleme Faz 3'te (Iyzico API entegrasyonu).
        </p>
      </div>

      {/* Iyzico uyarısı */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-4 text-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium text-amber-900 dark:text-amber-200">
              Iyzico bağlantısı bekliyor
            </div>
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              Mevcut planlar seed ile DB'de tanımlı. Plan oluştur/düzenle/arşivle aksiyonları Faz 3'te
              eklenecek — Iyzico'da pricing plan oluşturma API'siyle senkron çalışacak.
            </p>
          </div>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-500">
          Henüz plan yok. <code>seed_default_settings.sql</code> ile 3 plan eklenmeli.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {p.code !== 'free' && <Crown className="w-4 h-4 text-[#12A3E3]" />}
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {p.name}
                    </h3>
                  </div>
                  <code className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {p.code}
                  </code>
                </div>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    p.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {p.status}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {p.amount}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {p.currency} / {p.interval === 'monthly' ? 'ay' : p.interval === 'yearly' ? 'yıl' : 'tek seferlik'}
                </span>
              </div>

              {p.description && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {p.description}
                </p>
              )}

              {p.trial_period_days > 0 && (
                <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                  ⏱ {p.trial_period_days} gün ücretsiz deneme
                </div>
              )}

              {Array.isArray(p.features) && p.features.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span>
                      <code>{f}</code>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 space-y-0.5">
                {p.iyzico_pricing_plan_reference_code ? (
                  <div>
                    Iyzico:{' '}
                    <code className="font-mono">
                      {p.iyzico_pricing_plan_reference_code.slice(0, 12)}…
                    </code>
                  </div>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400">
                    ⚠ Iyzico'ya bağlı değil
                  </div>
                )}
                <div>
                  Güncellendi: {format(new Date(p.updated_at), 'd MMM yyyy', { locale: tr })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
