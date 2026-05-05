import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { listArticles } from '@/lib/articles';
import { logAudit } from '@/lib/audit';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Taslak', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  published: { label: 'Yayında', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  archived: { label: 'Arşivde', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

export default async function ArticlesPage(props: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await props.searchParams;
  const status = (sp.status as 'all' | 'draft' | 'published' | 'archived') ?? 'all';
  const articles = await listArticles({ status, q: sp.q });
  await logAudit('USER_VIEWED', { targetType: 'articles_list' });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Makaleler
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sistem makaleleri (Haftalık Disiplan, ipuçları, duyurular) — toplam {articles.length}
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf]"
        >
          <Plus className="w-4 h-4" />
          Yeni makale
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'all', label: 'Hepsi' },
          { key: 'draft', label: 'Taslaklar' },
          { key: 'published', label: 'Yayında' },
          { key: 'archived', label: 'Arşiv' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'all' ? '/admin/articles' : `/admin/articles?status=${tab.key}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              status === tab.key
                ? 'border-[#12A3E3] text-[#12A3E3]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {articles.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Henüz makale yok.
            </p>
            <Link
              href="/admin/articles/new"
              className="inline-flex items-center gap-2 mt-3 text-sm text-[#12A3E3] hover:underline"
            >
              <Plus className="w-4 h-4" /> İlk makaleyi oluştur
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium">Başlık</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-left p-3 font-medium">Durum</th>
                <th className="text-left p-3 font-medium">Hedef</th>
                <th className="text-left p-3 font-medium">Yayın</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {articles.map((a) => {
                const st = STATUS_LABELS[a.status] ?? STATUS_LABELS.draft;
                return (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <Link
                        href={`/admin/articles/${a.id}`}
                        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-[#12A3E3]"
                      >
                        {a.title}
                      </Link>
                      {a.series_name && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {a.series_name} #{a.series_index ?? '?'}
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">/{a.slug}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {a.category ?? '—'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {a.target_audience}
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {a.published_at
                        ? format(new Date(a.published_at), 'd MMM yyyy', { locale: tr })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
