'use client';

import { useActionState } from 'react';
import { Send, Lock } from 'lucide-react';
import { replyToTicket, type ReplyState } from '../actions';

const initialState: ReplyState = { ok: false };

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, isPending] = useActionState(replyToTicket, initialState);

  return (
    <form action={action} className="space-y-3" key={state.ok ? 'reset' : 'edit'}>
      <input type="hidden" name="ticket_id" value={ticketId} />
      <textarea
        name="body"
        required
        rows={5}
        placeholder="Cevabını yaz… Markdown henüz desteklenmiyor."
        className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 resize-y"
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" name="is_internal_note" className="rounded border-slate-300" />
          <Lock className="w-3 h-3" />
          İç not (sadece admin görür)
        </label>
        {state.error && (
          <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf] disabled:opacity-60 ml-auto"
        >
          <Send className="w-4 h-4" />
          {isPending ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </div>
    </form>
  );
}
