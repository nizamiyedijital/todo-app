import { BarChart3, ExternalLink } from 'lucide-react';

export default function AnalyticsPage() {
  const posthogConfigured = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#12A3E3]" />
          Analitik
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kullanıcı davranışı, funnel, cohort, retention — Faz 2'de aktif olacak.
        </p>
      </div>

      {/* Phase 2 placeholder */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-6">
        <div className="font-medium text-amber-900 dark:text-amber-200 mb-2">
          Faz 2 — Kullanıcı Davranışı & Segmentasyon
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
          Bu sayfada DAU/WAU/MAU, retention, funnel, cohort analizleri olacak. Şu an
          PostHog Cloud üzerinde event topluyoruz (PostHog kurulduysa).
        </p>

        {posthogConfigured ? (
          <a
            href={posthogHost}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf]"
          >
            PostHog Dashboard'a git
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <div className="text-xs text-amber-700 dark:text-amber-300">
            ⚠ <code>NEXT_PUBLIC_POSTHOG_KEY</code> ayarlanmadı. Faz 0 sonu kurulumu için
            <code> docs/admin/EVENT_TAXONOMY.md</code>'a bak.
          </div>
        )}
      </div>

      {/* Faz 2'de gelecek özellikler — placeholder grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeaturePreview
          icon="📊"
          title="DAU / WAU / MAU"
          desc="Günlük, haftalık, aylık aktif kullanıcı sayıları + trend grafikleri"
        />
        <FeaturePreview
          icon="🔁"
          title="Retention Cohorts"
          desc="Hangi haftada kayıt olanların kaçı 1, 7, 30 gün sonra hala aktif"
        />
        <FeaturePreview
          icon="🎯"
          title="Conversion Funnel"
          desc="Ziyaretçi → Kayıt → İlk Görev → Aktif → Pro"
        />
        <FeaturePreview
          icon="🏷️"
          title="Segment Builder"
          desc="Özel segmentler oluştur (örn: 7gün inaktif Pro), kullanıcılara etiket ata"
        />
        <FeaturePreview
          icon="📈"
          title="Feature Usage"
          desc="Hangi özellikler ne kadar kullanılıyor — DTP, drag-drop, pomodoro vb."
        />
        <FeaturePreview
          icon="📰"
          title="İçerik Performansı"
          desc="Makaleler ve bildirimlerin açılma/tıklanma oranları"
        />
      </div>
    </div>
  );
}

function FeaturePreview({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 opacity-70">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
      <div className="mt-2 text-[10px] text-slate-400 uppercase tracking-wider">Faz 2</div>
    </div>
  );
}
