import { BarChart3, ExternalLink, TrendingUp, Users, Target, Activity, Award, Repeat } from 'lucide-react';

/**
 * Analitik sayfası — Faz 2.A/2.B/3.A insight'larına deep link.
 *
 * PostHog project + dashboard ID'leri Disiplan'a özel; PostHog projesi değişirse
 * şu env var'lar veya bu sabitler güncellenmeli.
 */
const POSTHOG_PROJECT_ID = '172948';
const POSTHOG_DASHBOARD_ID = '662334'; // 'Disiplan — Genel Bakış'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com';

const INSIGHTS = [
  // Faz 2.A
  { phase: '2.A', short_id: 'BOxzehvc', icon: Users, name: 'Yeni Kayıtlar', desc: 'Son 7 gün signup trendi' },
  { phase: '2.A', short_id: 'OavTv6ym', icon: Activity, name: 'Giriş Aktivitesi (Platform)', desc: 'Login pie chart by surface, son 30 gün' },
  { phase: '2.A', short_id: 'bt6jw92j', icon: TrendingUp, name: 'Haftalık Giriş Trendi', desc: 'user_logged_in son 7 gün' },
  { phase: '2.A', short_id: 'uzbVuXCM', icon: Activity, name: 'Günlük Aktif Kullanıcı (DAU)', desc: 'Unique pageview by day' },
  { phase: '2.A', short_id: 'BI3sZxhO', icon: Activity, name: 'Haftalık Aktif Kullanıcı (WAU)', desc: 'Unique pageview by week' },
  { phase: '2.A', short_id: 'BuUbMluZ', icon: Repeat, name: 'Büyüme Muhasebesi', desc: 'Yeni / Geri Dönen / Pasif' },
  { phase: '2.A', short_id: 'g26FAG9Z', icon: Repeat, name: 'Haftalık Kullanıcı Tutma', desc: 'Retention cohort table' },
  // Faz 2.B
  { phase: '2.B', short_id: 'igHjgGGm', icon: Award, name: 'En çok kullanılan özellikler', desc: 'feature_used breakdown' },
  { phase: '2.B', short_id: 'vg4rkSmL', icon: Target, name: 'Kullanıcı başı görev sayısı', desc: 'task_created avg/user' },
  { phase: '2.B', short_id: '2UQywO97', icon: Users, name: 'Mobile vs Web DAU', desc: 'breakdown by surface' },
  { phase: '2.B', short_id: 'uuPFibKr', icon: Target, name: 'İlk gün onboarding', desc: 'signed_up → first_task → balance' },
  { phase: '2.B', short_id: 'fk6LCqKi', icon: Repeat, name: 'Yeni kullanıcı 7 gün retention', desc: 'task_created cohort' },
  // Faz 3.A
  { phase: '3.A', short_id: 'zofMvE4y', icon: Award, name: 'Pro kullanıcı DAU', desc: 'subscription_status=active filter — Faz 3.B\'de dolacak' },
  { phase: '3.A', short_id: '5ur51HX9', icon: Target, name: 'Free → Pro dönüşüm funnel', desc: 'pricing → checkout → subscription_started' },
] as const;

const PHASE_GROUPS = {
  '2.A': { label: 'Faz 2.A — Auth & Pageview', color: 'blue' as const },
  '2.B': { label: 'Faz 2.B — Behavior & Lifecycle', color: 'emerald' as const },
  '3.A': { label: 'Faz 3.A — Subscription (Faz 3.B veri akışı bekliyor)', color: 'amber' as const },
};

export default function AnalyticsPage() {
  const posthogConfigured = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const dashboardUrl = `${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/dashboard/${POSTHOG_DASHBOARD_ID}`;

  const grouped = INSIGHTS.reduce<Record<string, typeof INSIGHTS[number][]>>(
    (acc, ins) => {
      (acc[ins.phase] ??= []).push(ins);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#12A3E3]" />
            Analitik
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kullanıcı davranışı PostHog Cloud'da takip ediliyor. Tüm insight'lar tek dashboard'da:
            <strong className="text-slate-700 dark:text-slate-200"> Disiplan — Genel Bakış</strong>.
          </p>
        </div>
        {posthogConfigured && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf]"
          >
            Dashboard'u aç
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {!posthogConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-4 text-sm">
          <div className="font-medium text-amber-900 dark:text-amber-200">
            PostHog yapılandırılmamış
          </div>
          <div className="text-amber-700 dark:text-amber-300 mt-1 text-xs">
            <code>NEXT_PUBLIC_POSTHOG_KEY</code> tanımlı değil; insight linkleri yine de
            açılır ama lokal'de event toplanmaz.
          </div>
        </div>
      )}

      {/* Insight grid by phase */}
      {(Object.keys(grouped) as Array<keyof typeof PHASE_GROUPS>).map((phase) => {
        const group = PHASE_GROUPS[phase];
        const items = grouped[phase];
        return (
          <section key={phase}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              {group.label}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((ins) => {
                const Icon = ins.icon;
                const url = `${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/insights/${ins.short_id}`;
                return (
                  <a
                    key={ins.short_id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-[#12A3E3] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        group.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        group.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                        'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1 justify-between">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-[#12A3E3] truncate">
                            {ins.name}
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-400 mt-1 shrink-0" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {ins.desc}
                        </p>
                        <code className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                          {ins.short_id}
                        </code>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Footer — taxonomy + dashboard link */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">Referans</div>
        <ul className="space-y-1">
          <li>
            • Event taxonomy: <code className="text-slate-700 dark:text-slate-300">docs/admin/EVENT_TAXONOMY.md</code>
          </li>
          <li>
            • Dashboard yapısı: <code className="text-slate-700 dark:text-slate-300">docs/admin/posthog-dashboards.md</code>
          </li>
          <li>
            • Yeni insight ekleme: PostHog UI'da oluştur, dashboard'a ekle, doc'a short_id'yi yaz.
          </li>
        </ul>
      </div>
    </div>
  );
}
