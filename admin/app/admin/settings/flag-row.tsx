'use client';

import { useTransition } from 'react';
import { toggleFlag, updateFlagRollout } from './actions';

export function FlagRow({
  flagKey,
  enabled,
  description,
  rolloutPercent,
}: {
  flagKey: string;
  enabled: boolean;
  description: string | null;
  rolloutPercent: number;
}) {
  const [isPending, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      await toggleFlag(flagKey, !enabled);
    });
  };

  const onRolloutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    startTransition(async () => {
      await updateFlagRollout(flagKey, v);
    });
  };

  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
            {flagKey}
          </code>
          {enabled ? (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">
              Aktif
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
              Kapalı
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        )}
        {enabled && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-slate-600 dark:text-slate-400">
              Rollout: <strong className="tabular-nums">{rolloutPercent}%</strong>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              defaultValue={rolloutPercent}
              onChange={onRolloutChange}
              disabled={isPending}
              className="flex-1 max-w-xs accent-[#12A3E3]"
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-[#12A3E3]' : 'bg-slate-300 dark:bg-slate-700'
        } disabled:opacity-50`}
        aria-label={enabled ? 'Kapat' : 'Aç'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
