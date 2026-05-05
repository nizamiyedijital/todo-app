import { listSettings, listFlags } from '@/lib/settings';
import { SettingRow } from './setting-row';
import { FlagRow } from './flag-row';
import { logAudit } from '@/lib/audit';

export default async function SettingsPage() {
  const [settings, flags] = await Promise.all([listSettings(), listFlags()]);
  await logAudit('USER_VIEWED', { targetType: 'settings' });

  // Settings'i kategoriye böl (key prefix'ine göre)
  const groups: Record<string, typeof settings> = {
    'Plan Limitleri': [],
    'Genel': [],
    'Bakım': [],
  };
  for (const s of settings) {
    if (s.key.includes('max') || s.key.includes('limit') || s.key.startsWith('free_') || s.key.startsWith('pro_')) {
      groups['Plan Limitleri'].push(s);
    } else if (s.key.startsWith('maintenance')) {
      groups['Bakım'].push(s);
    } else {
      groups['Genel'].push(s);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Ayarlar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Uygulama genelinde ayarlar ve özellik bayrakları. Her değişiklik audit log'a yazılır.
        </p>
      </div>

      {/* App Settings — gruplanmış */}
      {Object.entries(groups).map(([groupName, items]) => {
        if (items.length === 0) return null;
        return (
          <section key={groupName} className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {groupName}
            </h2>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left p-3 font-medium w-1/3">Anahtar</th>
                    <th className="text-left p-3 font-medium">Değer</th>
                    <th className="text-right p-3 font-medium w-24">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((s) => (
                    <SettingRow
                      key={s.key}
                      settingKey={s.key}
                      value={s.value}
                      description={s.description}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {/* Feature Flags */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Özellik Bayrakları (Feature Flags)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Faz 5+ özellikleri kademeli açma için. Rollout %0 = kapalı, %100 = herkese.
          </p>
        </div>
        <div className="space-y-2">
          {flags.length === 0 ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
              Henüz feature flag yok.
            </div>
          ) : (
            flags.map((f) => (
              <FlagRow
                key={f.key}
                flagKey={f.key}
                enabled={f.enabled}
                description={f.description}
                rolloutPercent={f.rollout_percent}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
