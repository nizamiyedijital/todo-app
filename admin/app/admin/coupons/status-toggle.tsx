'use client';

import { useState, useTransition } from 'react';
import { setCouponStatus } from './actions';
import type { CouponStatus } from '@/lib/coupons-shared';

export function StatusToggle({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: CouponStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next: CouponStatus = currentStatus === 'active' ? 'paused' : 'active';
    setError(null);
    startTransition(async () => {
      const r = await setCouponStatus(id, next);
      if (!r.ok) setError(r.error ?? 'Hata');
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending || currentStatus === 'expired'}
        className={`px-2 py-1 text-[11px] rounded-md font-medium disabled:opacity-50 ${
          currentStatus === 'active'
            ? 'border border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {isPending ? '…' : currentStatus === 'active' ? 'Duraklat' : 'Aktive et'}
      </button>
      {error && <div className="text-[10px] text-red-600 mt-1">{error}</div>}
    </>
  );
}
