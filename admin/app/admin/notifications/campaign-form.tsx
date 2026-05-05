'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { saveCampaign, type CampaignFormState } from './actions';
import type { NotificationCampaign } from '@/lib/notifications-shared';

const initial: CampaignFormState = { ok: false };

const TARGET_LABELS: Record<string, string> = {
  all: 'Tüm kullanıcılar',
  free: 'Sadece Free',
  pro: 'Sadece Pro',
  inactive_7d: '7 gün giriş yapmayanlar',
  inactive_30d: '30 gün giriş yapmayanlar',
  no_first_task: 'İlk görevini oluşturmayanlar',
  high_completion: 'Tamamlama oranı yüksek',
  payment_failed: 'Ödeme başarısız',
  segment: 'Özel segment (Faz 2)',
};

export function CampaignForm({ campaign }: { campaign?: NotificationCampaign | null }) {
  const [state, action, isPending] = useActionState(saveCampaign, initial);
  const [status, setStatus] = useState(campaign?.status ?? 'draft');
  const isEdit = !!campaign;

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {campaign?.id && <input type="hidden" name="id" value={campaign.id} />}

      <Field label="Başlık *" hint="Bildirim açıldığında üstte görünür" error={state.fieldErrors?.title?.[0]}>
        <input
          name="title"
          required
          defaultValue={campaign?.title ?? ''}
          maxLength={140}
          className={inputCls}
          placeholder="Hoş geldin!"
        />
      </Field>

      <Field label="Mesaj *" error={state.fieldErrors?.message?.[0]}>
        <textarea
          name="message"
          required
          defaultValue={campaign?.message ?? ''}
          maxLength={500}
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Disiplan'a hoş geldin. İlk görevini oluşturmaya hazır mısın?"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="İkon (emoji)" hint="🎯 ⏰ 🔥 vb.">
          <input
            name="icon"
            defaultValue={campaign?.icon ?? ''}
            maxLength={4}
            className={inputCls}
            placeholder="🎯"
          />
        </Field>
        <Field label="Tıklanma URL'i" hint="Boş bırakırsan in-app açılır">
          <input
            name="link_url"
            type="url"
            defaultValue={campaign?.link_url ?? ''}
            className={inputCls}
            placeholder="https://disiplan.app/ozellik"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Gönderim kanalı *">
          <select
            name="delivery_method"
            defaultValue={campaign?.delivery_method ?? 'in_app'}
            className={inputCls}
            required
          >
            <option value="in_app">Sadece uygulama içi</option>
            <option value="push">Browser/mobile push</option>
            <option value="email">Email</option>
            <option value="all">Hepsi (in-app + push + email)</option>
          </select>
        </Field>

        <Field label="Hedef kitle *">
          <select
            name="target_audience"
            defaultValue={campaign?.target_audience ?? 'all'}
            className={inputCls}
            required
          >
            {Object.entries(TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
        <Field label="Durum *">
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'scheduled' | 'cancelled')}
            className={inputCls}
            required
          >
            <option value="draft">Taslak (kaydet, gönderme)</option>
            <option value="scheduled">Zamanla (Faz 5'te otomatik gönderim aktif)</option>
            <option value="cancelled">İptal</option>
          </select>
        </Field>

        {status === 'scheduled' && (
          <Field label="Zamanlanmış tarih/saat">
            <input
              name="scheduled_for"
              type="datetime-local"
              defaultValue={campaign?.scheduled_for ? campaign.scheduled_for.slice(0, 16) : ''}
              className={inputCls}
            />
          </Field>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-300">
          <strong>Not:</strong> Faz 1'de gönderim yapılmaz — sadece kampanya kaydedilir.
          Otomatik gönderim altyapısı <strong>Faz 5</strong>'te aktif olacak (cron + push servisi).
        </div>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf] disabled:opacity-60"
        >
          {isPending ? 'Kaydediliyor…' : isEdit ? 'Değişiklikleri kaydet' : 'Kampanya oluştur'}
        </button>
        <Link
          href="/admin/notifications"
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Vazgeç
        </Link>
      </div>
    </form>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#12A3E3] focus:ring-2 focus:ring-[#12A3E3]/20 outline-none';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {hint && !error && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
