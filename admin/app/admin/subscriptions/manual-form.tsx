'use client';

import { useActionState, useState } from 'react';
import { Plus } from 'lucide-react';
import { createManualSubscription, type CreateSubscriptionState } from './actions';
import type { SubscriptionPlan } from '@/lib/subscriptions-shared';

const initialState: CreateSubscriptionState = { ok: false };

/**
 * Manuel subscription oluşturma formu — açılır panel.
 * Iyzico-bypass: comp hesap, support case, manuel onay.
 */
export function ManualSubscriptionForm({ plans }: { plans: SubscriptionPlan[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    createManualSubscription,
    initialState,
  );

  if (state.ok && open) {
    // Başarıyla eklendiyse formu kapat — sayfa revalidate olur
    setTimeout(() => setOpen(false), 100);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf]"
      >
        <Plus className="w-4 h-4" />
        Manuel Abonelik
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Manuel Abonelik Oluştur
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Iyzico bypass — comp hesap, support case veya pilot kullanıcı için. Iyzico ref code'ları boş kalır.
            </p>
          </div>

          <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Kullanıcı UUID
              </label>
              <input
                name="user_id"
                type="text"
                required
                placeholder="00000000-0000-0000-0000-000000000000"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Kullanıcılar sayfasından kopyala
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Plan
              </label>
              <select
                name="plan_id"
                required
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">— Plan seç —</option>
                {plans
                  .filter((p) => p.code !== 'free')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.amount} {p.currency} / {p.interval}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Dönem (gün)
              </label>
              <input
                name="period_days"
                type="number"
                min="1"
                max="3650"
                defaultValue="30"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Trial gün (opsiyonel)
              </label>
              <input
                name="trial_days"
                type="number"
                min="0"
                max="365"
                defaultValue="0"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            {state.error && (
              <div className="md:col-span-2 rounded-md border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 p-2.5 text-xs text-red-700 dark:text-red-300">
                {state.error}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 rounded-md bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf] disabled:opacity-60"
              >
                {isPending ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
