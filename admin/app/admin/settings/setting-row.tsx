'use client';

import { useState, useTransition } from 'react';
import { Save, X } from 'lucide-react';
import { updateSetting } from './actions';

export function SettingRow({
  settingKey,
  value,
  description,
}: {
  settingKey: string;
  value: unknown;
  description: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(JSON.stringify(value));
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateSetting(settingKey, draft);
      if (res.ok) setEditing(false);
      else setError(res.error ?? 'Hata');
    });
  };

  const onCancel = () => {
    setDraft(JSON.stringify(value));
    setError(null);
    setEditing(false);
  };

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
      <td className="p-3">
        <code className="text-xs font-mono text-slate-700 dark:text-slate-300">
          {settingKey}
        </code>
        {description && (
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </div>
        )}
      </td>
      <td className="p-3">
        {editing ? (
          <div className="space-y-1">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isPending}
              className="w-full px-2 py-1 text-xs font-mono rounded border border-[#12A3E3] focus:ring-2 focus:ring-[#12A3E3]/20 outline-none bg-white dark:bg-slate-900"
              autoFocus
            />
            {error && <div className="text-[10px] text-red-600">{error}</div>}
          </div>
        ) : (
          <code className="text-xs font-mono text-slate-700 dark:text-slate-300">
            {JSON.stringify(value)}
          </code>
        )}
      </td>
      <td className="p-3 text-right whitespace-nowrap">
        {editing ? (
          <div className="inline-flex items-center gap-1">
            <button
              onClick={onSave}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded bg-[#12A3E3] text-white hover:bg-[#0e87bf] disabled:opacity-60 inline-flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              {isPending ? '…' : 'Kaydet'}
            </button>
            <button
              onClick={onCancel}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-2 py-1 text-xs rounded text-[#12A3E3] hover:bg-[#12A3E3]/10"
          >
            Düzenle
          </button>
        )}
      </td>
    </tr>
  );
}
