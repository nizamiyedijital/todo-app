'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';
import { savePreset, deletePreset, type PresetFormState } from './actions';
import type {
  AutomationPreset,
  CronConfig,
  EventConfig,
  TriggerType,
  Audience,
  Weekday,
} from '@/lib/automation';

type Props = {
  preset?: AutomationPreset | null;
  eventOptions: { value: string; label: string }[];
  weekdays: { value: Weekday; label: string }[];
  conditionOptions: { key: string; label: string; description: string }[];
  audienceLabels: Record<Audience, string>;
};

const initialState: PresetFormState = { ok: false };

export default function PresetForm({
  preset,
  eventOptions,
  weekdays,
  conditionOptions,
  audienceLabels,
}: Props) {
  const isEdit = !!preset;
  const isBuiltIn = preset?.is_built_in ?? false;

  const [state, formAction, isPending] = useActionState(savePreset, initialState);

  // Tetikleyici seçimi (kontrollü, alt formları gizle/göster için)
  const [triggerType, setTriggerType] = useState<TriggerType>(
    preset?.trigger_type ?? 'cron',
  );

  // Mevcut değerler (edit modu)
  const cronCfg =
    preset?.trigger_type === 'cron'
      ? (preset.trigger_config as CronConfig)
      : null;
  const eventCfg =
    preset?.trigger_type === 'event'
      ? (preset.trigger_config as EventConfig)
      : null;
  const initialDays: Weekday[] = (cronCfg?.days as Weekday[]) ?? [];
  const initialHour = cronCfg?.hour ?? 9;
  const initialMinute = cronCfg?.minute ?? 0;
  const initialEvent = eventCfg?.event ?? 'login';

  const initialConditions = preset?.conditions
    ? Object.keys(preset.conditions).filter((k) => (preset.conditions as Record<string, unknown>)[k])
    : [];

  const action = preset?.action_config ?? {
    title: '',
    body: '',
    cta: '',
    deeplink: '',
  };

  // Field error helper
  const fe = (k: string) => state.fieldErrors?.[k]?.[0];

  const onDelete = async () => {
    if (!preset) return;
    if (!confirm(`"${preset.name}" preset'ini silmek istiyor musun? Bu işlem geri alınamaz.`)) return;
    const r = await deletePreset(preset.id);
    if (r.ok) {
      window.location.href = '/admin/automation';
    } else {
      alert(`Silinemedi: ${r.error}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/automation"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? 'Preset düzenle' : 'Yeni preset'}
        </h1>
        {isBuiltIn && (
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            built-in
          </span>
        )}
      </div>

      {state.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{state.error}</div>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        {preset?.id && <input type="hidden" name="id" value={preset.id} />}

        {/* Ad + açıklama */}
        <Section title="Tanım">
          <Field label="Ad" error={fe('name')}>
            <input
              name="name"
              defaultValue={preset?.name ?? ''}
              required
              maxLength={120}
              className={inputCls}
              placeholder="Tamamlanmayan Görevler"
            />
          </Field>
          <Field label="Açıklama" error={fe('description')}>
            <textarea
              name="description"
              defaultValue={preset?.description ?? ''}
              rows={2}
              maxLength={500}
              className={inputCls}
              placeholder="Bu preset ne yapar?"
            />
          </Field>
        </Section>

        {/* Tetikleyici */}
        <Section title="Tetikleyici">
          <div className="flex gap-2">
            {(['cron', 'event'] as TriggerType[]).map((t) => (
              <label
                key={t}
                className={`flex-1 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium text-center ${
                  triggerType === t
                    ? 'bg-[#12A3E3]/10 border-[#12A3E3] text-[#12A3E3]'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="trigger_type"
                  value={t}
                  checked={triggerType === t}
                  onChange={() => setTriggerType(t)}
                  className="sr-only"
                />
                {t === 'cron' ? 'Cron (zamanlı)' : 'Event (olay)'}
              </label>
            ))}
          </div>

          {triggerType === 'cron' && (
            <>
              <Field label="Günler" error={fe('cron_days')}>
                <div className="flex flex-wrap gap-2">
                  {weekdays.map((w) => (
                    <label
                      key={w.value}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-[#12A3E3] text-sm"
                    >
                      <input
                        type="checkbox"
                        name="cron_days"
                        value={w.value}
                        defaultChecked={initialDays.includes(w.value)}
                      />
                      {w.label}
                    </label>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Saat (0–23)" error={fe('cron_hour')}>
                  <input
                    type="number"
                    name="cron_hour"
                    min={0}
                    max={23}
                    defaultValue={initialHour}
                    className={inputCls}
                  />
                </Field>
                <Field label="Dakika (0–59)" error={fe('cron_minute')}>
                  <input
                    type="number"
                    name="cron_minute"
                    min={0}
                    max={59}
                    defaultValue={initialMinute}
                    className={inputCls}
                  />
                </Field>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saat dilimi: Europe/Istanbul (sabit). Yerel saatte tetiklenir.
              </p>
            </>
          )}

          {triggerType === 'event' && (
            <Field label="Event adı" error={fe('event_name')}>
              <select
                name="event_name"
                defaultValue={initialEvent}
                className={inputCls}
              >
                {eventOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.value})
                  </option>
                ))}
              </select>
            </Field>
          )}
        </Section>

        {/* Koşullar */}
        <Section
          title="Koşullar (opsiyonel)"
          subtitle="Tetikleyici çalıştığında ek filtre uygulanır. Birden fazla seçilirse hepsi sağlanmalı."
        >
          {conditionOptions.map((c) => (
            <label
              key={c.key}
              className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#12A3E3] cursor-pointer"
            >
              <input
                type="checkbox"
                name="conditions"
                value={c.key}
                defaultChecked={initialConditions.includes(c.key)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {c.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {c.description}
                </div>
              </div>
            </label>
          ))}
        </Section>

        {/* Bildirim */}
        <Section title="Bildirim metni">
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Placeholder kullanabilirsin: <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">{`{starred_count}`}</code>,{' '}
            <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">{`{tasks_completed_today}`}</code>,{' '}
            <code className="px-1 bg-slate-100 dark:bg-slate-800 rounded">{`{pomo_minutes_today}`}</code>
            …
          </p>
          <Field label="Başlık" error={fe('action_title')}>
            <input
              name="action_title"
              defaultValue={action.title}
              required
              maxLength={140}
              className={inputCls}
            />
          </Field>
          <Field label="Mesaj" error={fe('action_body')}>
            <textarea
              name="action_body"
              defaultValue={action.body}
              required
              rows={3}
              maxLength={500}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA metni (opsiyonel)" error={fe('action_cta')}>
              <input
                name="action_cta"
                defaultValue={action.cta ?? ''}
                maxLength={60}
                className={inputCls}
                placeholder="Plan yap"
              />
            </Field>
            <Field label="Deeplink (opsiyonel)" error={fe('action_deeplink')}>
              <input
                name="action_deeplink"
                defaultValue={action.deeplink ?? ''}
                maxLength={200}
                className={inputCls}
                placeholder="/weekly"
              />
            </Field>
          </div>
        </Section>

        {/* Hedef + etkin */}
        <Section title="Yayın">
          <Field label="Hedef kitle">
            <select
              name="audience"
              defaultValue={preset?.audience ?? 'all'}
              className={inputCls}
            >
              {(Object.keys(audienceLabels) as Audience[]).map((a) => (
                <option key={a} value={a}>
                  {audienceLabels[a]}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_enabled"
              defaultChecked={preset?.is_enabled ?? true}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Etkin
            </span>
          </label>
        </Section>

        {/* Submit + delete */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          {isEdit && !isBuiltIn ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" /> Sil
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Link
              href="/admin/automation"
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf] disabled:opacity-60"
            >
              {isPending ? 'Kaydediliyor…' : isEdit ? 'Kaydet' : 'Oluştur'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Küçük UI yardımcıları
// ----------------------------------------------------------------------------
const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:border-[#12A3E3] focus:outline-none focus:ring-1 focus:ring-[#12A3E3]';

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
        {label}
      </span>
      {children}
      {error && (
        <span className="block text-xs text-red-600 dark:text-red-400 mt-1">
          {error}
        </span>
      )}
    </label>
  );
}
