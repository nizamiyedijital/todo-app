'use client';

import { useState, useTransition } from 'react';
import { setExportStatus, setDeletionStatus } from './actions';
import type { ExportStatus, DeletionStatus } from '@/lib/kvkk-shared';

export function ExportStatusButtons({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: ExportStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function transition(next: ExportStatus) {
    setError(null);
    startTransition(async () => {
      const r = await setExportStatus(id, next);
      if (!r.ok) setError(r.error ?? 'Hata');
    });
  }

  // Sırayla bir sonraki adıma geçiş butonları
  const next: Record<ExportStatus, { to: ExportStatus; label: string }[]> = {
    pending: [{ to: 'processing', label: 'Hazırlamaya başla' }],
    processing: [{ to: 'ready', label: 'Hazır işaretle' }],
    ready: [{ to: 'delivered', label: 'İletildi işaretle' }],
    delivered: [],
    expired: [],
    cancelled: [],
  };
  const actions = next[currentStatus];

  if (actions.length === 0) {
    return <span className="text-[10px] text-slate-400">— işlem yok</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {actions.map((a) => (
        <button
          key={a.to}
          type="button"
          onClick={() => transition(a.to)}
          disabled={isPending}
          className="px-2 py-1 text-[11px] rounded-md bg-[#12A3E3] text-white hover:bg-[#0e87bf] disabled:opacity-60 whitespace-nowrap"
        >
          {isPending ? '…' : a.label}
        </button>
      ))}
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  );
}

export function DeletionStatusButtons({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: DeletionStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function transition(next: DeletionStatus) {
    if (next === 'completed') {
      if (!confirm('Bu kullanıcının VERİSİ KALICI SİLİNECEK — devam et?')) return;
    }
    if (next === 'rejected') {
      const reason = prompt('Reddetme sebebi (yasal gerekçe):');
      if (!reason) return;
      setError(null);
      startTransition(async () => {
        const r = await setDeletionStatus(id, next, { rejection_reason: reason });
        if (!r.ok) setError(r.error ?? 'Hata');
      });
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await setDeletionStatus(id, next);
      if (!r.ok) setError(r.error ?? 'Hata');
    });
  }

  const next: Record<DeletionStatus, { to: DeletionStatus; label: string; danger?: boolean }[]> = {
    pending: [
      { to: 'review', label: 'İncele' },
      { to: 'rejected', label: 'Reddet' },
    ],
    review: [
      { to: 'approved', label: 'Onayla' },
      { to: 'rejected', label: 'Reddet' },
    ],
    approved: [{ to: 'completed', label: 'Verileri sil', danger: true }],
    completed: [],
    rejected: [],
    cancelled: [],
  };
  const actions = next[currentStatus];

  if (actions.length === 0) {
    return <span className="text-[10px] text-slate-400">— işlem yok</span>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {actions.map((a) => (
        <button
          key={a.to}
          type="button"
          onClick={() => transition(a.to)}
          disabled={isPending}
          className={`px-2 py-1 text-[11px] rounded-md whitespace-nowrap disabled:opacity-60 ${
            a.danger
              ? 'bg-red-600 text-white hover:bg-red-700'
              : a.to === 'rejected'
                ? 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                : 'bg-[#12A3E3] text-white hover:bg-[#0e87bf]'
          }`}
        >
          {isPending ? '…' : a.label}
        </button>
      ))}
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  );
}
