'use client';

import { useState, useTransition } from 'react';
import { changeTicketStatus, changeTicketPriority, assignTicket } from '../actions';
import type { TicketStatus, TicketPriority } from '@/lib/support-shared';
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from '@/lib/support-shared';

const STATUS_OPTIONS: TicketStatus[] = [
  'new',
  'in_progress',
  'awaiting_user',
  'escalated',
  'resolved',
  'closed',
];

const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

export function StatusControls({
  ticketId,
  currentStatus,
  currentPriority,
  currentAssignee,
  currentUserId,
  currentUserEmail,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
  currentPriority: TicketPriority;
  currentAssignee: string | null;
  currentUserId: string;
  currentUserEmail: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as TicketStatus;
    setError(null);
    startTransition(async () => {
      const r = await changeTicketStatus(ticketId, newStatus);
      if (!r.ok) setError(r.error ?? 'Hata');
    });
  }

  function onPriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newPriority = e.target.value as TicketPriority;
    setError(null);
    startTransition(async () => {
      const r = await changeTicketPriority(ticketId, newPriority);
      if (!r.ok) setError(r.error ?? 'Hata');
    });
  }

  function onAssignSelf() {
    setError(null);
    startTransition(async () => {
      const r = await assignTicket(ticketId, currentUserId);
      if (!r.ok) setError(r.error ?? 'Hata');
    });
  }

  function onUnassign() {
    setError(null);
    startTransition(async () => {
      const r = await assignTicket(ticketId, null);
      if (!r.ok) setError(r.error ?? 'Hata');
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
          Durum
        </label>
        <select
          value={currentStatus}
          onChange={onStatusChange}
          disabled={isPending}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_LABELS[s].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
          Öncelik
        </label>
        <select
          value={currentPriority}
          onChange={onPriorityChange}
          disabled={isPending}
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {TICKET_PRIORITY_LABELS[p].label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
          Atama
        </label>
        {currentAssignee === currentUserId ? (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
            ✓ Sana atandı ({currentUserEmail})
          </div>
        ) : currentAssignee ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
            Atandı: <code className="text-[10px]">{currentAssignee.slice(0, 8)}…</code>
          </div>
        ) : (
          <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">
            Atanmamış
          </div>
        )}
        <div className="flex gap-1.5">
          {currentAssignee !== currentUserId && (
            <button
              type="button"
              onClick={onAssignSelf}
              disabled={isPending}
              className="flex-1 px-2 py-1.5 text-xs rounded-md bg-[#12A3E3] text-white hover:bg-[#0e87bf] disabled:opacity-60"
            >
              Bana ata
            </button>
          )}
          {currentAssignee && (
            <button
              type="button"
              onClick={onUnassign}
              disabled={isPending}
              className="flex-1 px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              Boşalt
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
}
