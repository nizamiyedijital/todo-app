'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export function UsersFilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const status = sp.get('status') ?? 'all';
  const plan = sp.get('plan') ?? 'all';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    params.delete('page');
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get('q') ?? '') !== q) updateParam('q', q);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Arama */}
      <div className="relative flex-1 min-w-[220px] max-w-sm">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email ile ara…"
          className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#12A3E3] focus:ring-2 focus:ring-[#12A3E3]/20 outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Temizle"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Durum */}
      <select
        value={status}
        onChange={(e) => updateParam('status', e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-[#12A3E3]"
      >
        <option value="all">Tüm durumlar</option>
        <option value="active">Aktif</option>
        <option value="inactive">Pasif (30g+)</option>
        <option value="unconfirmed">Email doğrulanmamış</option>
      </select>

      {/* Plan */}
      <select
        value={plan}
        onChange={(e) => updateParam('plan', e.target.value)}
        className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-[#12A3E3]"
      >
        <option value="all">Tüm planlar</option>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>

      {isPending && (
        <span className="text-xs text-slate-500 dark:text-slate-400">Yükleniyor…</span>
      )}
    </div>
  );
}
