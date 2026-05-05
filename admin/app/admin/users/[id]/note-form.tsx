'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addUserNote, type NoteState } from './actions';

const initialState: NoteState = { ok: false };

export function NoteForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(addUserNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <textarea
        name="body"
        required
        maxLength={2000}
        rows={3}
        disabled={isPending}
        placeholder="Bu kullanıcı hakkında bir not ekle…"
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#12A3E3] focus:ring-2 focus:ring-[#12A3E3]/20 outline-none resize-none"
      />
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" name="pinned" className="accent-[#12A3E3]" />
          Sabitle (üstte göster)
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#12A3E3] text-white hover:bg-[#0e87bf] disabled:opacity-60"
        >
          {isPending ? 'Ekleniyor…' : 'Not ekle'}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
