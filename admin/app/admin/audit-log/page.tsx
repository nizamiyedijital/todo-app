import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export default async function AuditLogPage() {
  // Bu sayfayı görmek de bir admin işlemi — log düş
  await logAudit('USER_VIEWED', { targetType: 'audit_log' });

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('audit_log')
    .select('id, actor_email, action, target_type, target_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Audit Log
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Son 100 admin işlemi. Bu kayıtlar silinemez.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          Hata: {error.message}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left p-3 font-medium">Tarih</th>
              <th className="text-left p-3 font-medium">Kim</th>
              <th className="text-left p-3 font-medium">İşlem</th>
              <th className="text-left p-3 font-medium">Hedef</th>
              <th className="text-left p-3 font-medium">Detay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {!rows?.length ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                  Henüz audit kaydı yok. İlk login işlemi vb. burada görünecek.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="p-3 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">
                    {format(new Date(r.created_at), 'd MMM yyyy HH:mm:ss', { locale: tr })}
                  </td>
                  <td className="p-3 text-xs text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                    {r.actor_email ?? '—'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#12A3E3]/10 text-[#12A3E3] uppercase tracking-wider">
                      {r.action}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                    {r.target_type ? (
                      <>
                        {r.target_type}
                        {r.target_id && (
                          <span className="text-slate-400 ml-1">
                            #{String(r.target_id).slice(0, 8)}
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-500 dark:text-slate-500 max-w-[300px]">
                    {r.payload && Object.keys(r.payload as object).length > 0 ? (
                      <code className="text-[10px] truncate block">
                        {JSON.stringify(r.payload)}
                      </code>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
