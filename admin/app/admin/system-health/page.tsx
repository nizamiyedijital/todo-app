import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Activity, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getSystemStatus } from '@/lib/system-health';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic'; // her render'da fresh ping

export default async function SystemHealthPage() {
  const status = await getSystemStatus();
  await logAudit('USER_VIEWED', { targetType: 'system_health' });

  const allOk = status.supabase.ok && status.serviceRole && status.posthog.configured;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-[#12A3E3]" />
          Sistem Sağlığı
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Anlık servis durumu ve sistem bilgileri
        </p>
      </div>

      {/* Genel durum bar */}
      <div
        className={`rounded-xl border p-4 flex items-center gap-3 ${
          allOk
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20'
        }`}
      >
        {allOk ? (
          <>
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="font-medium text-emerald-900 dark:text-emerald-200">
                Tüm sistemler operasyonel
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                Supabase + Service-role + PostHog aktif
              </div>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-medium text-amber-900 dark:text-amber-200">
                Bazı bileşenler eksik konfigürasyonda
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                Aşağıdaki listede ⚠ işaretliler için .env.local'i kontrol et
              </div>
            </div>
          </>
        )}
      </div>

      {/* Servis durumu kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ServiceCard
          name="Supabase Database"
          ok={status.supabase.ok}
          detail={
            status.supabase.ok
              ? `Yanıt süresi: ${status.supabase.latency_ms}ms`
              : status.supabase.error ?? 'Bağlantı hatası'
          }
        />
        <ServiceCard
          name="Supabase Service Role"
          ok={status.serviceRole}
          detail={
            status.serviceRole
              ? 'Ayarlı — kullanıcı listesi ve admin SDK aktif'
              : '⚠ .env.local SUPABASE_SERVICE_ROLE_KEY boş'
          }
        />
        <ServiceCard
          name="PostHog Analytics"
          ok={status.posthog.configured}
          detail={
            status.posthog.configured
              ? `Host: ${status.posthog.host}`
              : '⚠ .env.local NEXT_PUBLIC_POSTHOG_KEY boş — event tracking yok'
          }
        />
        <ServiceCard
          name="Next.js Runtime"
          ok={true}
          detail={`Next ${status.nextVersion} · Node ${status.nodeVersion} · App v${status.appVersion}`}
        />
      </div>

      {/* Migration log */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
          Uygulanmış Migration'lar ({status.migrations.length})
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {status.migrations.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Henüz migration uygulanmamış (hatalı durum)
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left p-3 font-medium w-24">Versiyon</th>
                  <th className="text-left p-3 font-medium">Açıklama</th>
                  <th className="text-left p-3 font-medium w-44">Uygulandı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {status.migrations.map((m) => (
                  <tr key={m.version}>
                    <td className="p-3">
                      <code className="text-xs font-mono text-[#12A3E3]">{m.version}</code>
                    </td>
                    <td className="p-3 text-xs text-slate-700 dark:text-slate-300">
                      {m.description ?? '—'}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(m.applied_at), 'd MMM yyyy HH:mm', { locale: tr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-4 text-xs text-slate-500 dark:text-slate-400">
        <strong>Yakında (Faz 5+):</strong> Sentry hata oranı · Vercel deploy bilgisi ·
        Supabase storage kullanımı · Cron job durumları · Webhook event'leri.
      </div>
    </div>
  );
}

function ServiceCard({ name, ok, detail }: { name: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <XCircle className="w-4 h-4 text-amber-500" />
        )}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</h3>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 ml-6">{detail}</p>
    </div>
  );
}
