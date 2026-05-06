'use client';

import { useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { cancelSubscription } from './actions';

export function CancelButton({ subscriptionId }: { subscriptionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirm('Bu aboneliği iptal etmek istediğine emin misin? Period sonuna kadar aktif kalır.')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await cancelSubscription(subscriptionId, 'admin_panel');
      if (!res.ok) setError(res.error ?? 'Hata');
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        title="İptal et"
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
      >
        <X className="w-3 h-3" />
        {isPending ? '…' : 'İptal'}
      </button>
      {error && <span className="text-[10px] text-red-600 ml-1">{error}</span>}
    </>
  );
}
