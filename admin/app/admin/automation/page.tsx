import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Workflow } from 'lucide-react';
import {
  listAutomationPresets,
  summarizeTrigger,
  AUDIENCE_LABELS,
} from '@/lib/automation';
import { logAudit } from '@/lib/audit';
import { ToggleEnabledButton } from './toggle-button';

export default async function AutomationPage() {
  const presets = await listAutomationPresets();
  await logAudit('USER_VIEWED', { targetType: 'automation_list' });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Otomasyon Presetleri
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Belirli zaman veya olaylarda kullanıcılara otomatik bildirim
            tetikler. Toplam {presets.length}.
          </p>
        </div>
        <Link
          href="/admin/automation/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf]"
        >
          <Plus className="w-4 h-4" />
          Yeni preset
        </Link>
      </div>

      {presets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Workflow className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
            Henüz preset yok. (Migration apply edilmemiş olabilir.)
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left p-3 font-medium">Ad / Açıklama</th>
                <th className="text-left p-3 font-medium">Tetikleyici</th>
                <th className="text-left p-3 font-medium">Hedef</th>
                <th className="text-center p-3 font-medium">Etkin</th>
                <th className="text-right p-3 font-medium">Tetiklenme</th>
                <th className="text-left p-3 font-medium">Son</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {presets.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                >
                  <td className="p-3 max-w-md">
                    <Link
                      href={`/admin/automation/${p.id}`}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-[#12A3E3] line-clamp-1"
                    >
                      {p.name}
                      {p.is_built_in && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 align-middle">
                          built-in
                        </span>
                      )}
                    </Link>
                    {p.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider mr-2 ${
                        p.trigger_type === 'cron'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      }`}
                    >
                      {p.trigger_type}
                    </span>
                    {summarizeTrigger(p)}
                  </td>
                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {AUDIENCE_LABELS[p.audience] ?? p.audience}
                  </td>
                  <td className="p-3 text-center">
                    <ToggleEnabledButton id={p.id} enabled={p.is_enabled} />
                  </td>
                  <td className="p-3 text-right text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                    {p.trigger_count > 0 ? p.trigger_count : '—'}
                  </td>
                  <td className="p-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {p.last_triggered_at
                      ? format(new Date(p.last_triggered_at), 'd MMM HH:mm', {
                          locale: tr,
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-slate-400 dark:text-slate-600 italic">
        Not: Çalıştırma altyapısı (cron / event listener / bildirim gönderimi)
        Faz 5.B'de eklenecek. Şu an sadece kuralları tanımlıyorsun.
      </div>
    </div>
  );
}
