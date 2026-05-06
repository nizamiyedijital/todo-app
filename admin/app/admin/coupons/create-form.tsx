'use client';

import { useActionState, useState } from 'react';
import { Plus } from 'lucide-react';
import { createCoupon, type CreateCouponState } from './actions';
import { DISCOUNT_TYPE_LABELS } from '@/lib/coupons-shared';

const initialState: CreateCouponState = { ok: false };

export function CreateCouponForm() {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(createCoupon, initialState);

  if (state.ok && open) {
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
        Yeni Kupon
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Yeni Kupon</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Iyzico'ya bağlı değil — Faz 3.B'de checkout akışında uygulanacak.
            </p>
          </div>

          <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Kod (büyük harf)
              </label>
              <input
                name="code"
                type="text"
                required
                placeholder="WELCOME20"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono uppercase"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Açıklama
              </label>
              <input
                name="description"
                type="text"
                placeholder="Hoş geldin indirimi"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                İndirim tipi
              </label>
              <select
                name="discount_type"
                required
                defaultValue="percentage"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {(Object.entries(DISCOUNT_TYPE_LABELS) as Array<[string, string]>).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Değer (% / ₺ / gün)
              </label>
              <input
                name="discount_value"
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="20"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Maks. kullanım (boş = sınırsız)
              </label>
              <input
                name="max_redemptions"
                type="number"
                min="1"
                placeholder="100"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Kişi başı limit
              </label>
              <input
                name="per_user_limit"
                type="number"
                min="1"
                max="100"
                defaultValue="1"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Bitiş tarihi (opsiyonel)
              </label>
              <input
                name="expires_at"
                type="datetime-local"
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
