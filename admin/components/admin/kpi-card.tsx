import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number | string | null;
  hint?: string;
  delta?: { value: number; positive: boolean };
  loading?: boolean;
}

export function KpiCard({ label, value, hint, delta, loading }: KpiCardProps) {
  const display = value === null || value === undefined ? '—' : value.toLocaleString('tr-TR');
  const empty = value === null || value === undefined;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div
          className={cn(
            'text-2xl font-semibold',
            empty
              ? 'text-slate-400 dark:text-slate-600'
              : 'text-slate-900 dark:text-slate-100',
            loading && 'opacity-50',
          )}
        >
          {display}
        </div>
        {delta && (
          <span
            className={cn(
              'text-xs font-medium',
              delta.positive ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {delta.positive ? '↑' : '↓'} {delta.value}%
          </span>
        )}
      </div>
      {hint && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
          {hint}
        </div>
      )}
    </div>
  );
}
