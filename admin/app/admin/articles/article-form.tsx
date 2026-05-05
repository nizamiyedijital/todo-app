'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { saveArticle, type ArticleFormState } from './actions';
import { slugify, type Article } from '@/lib/articles-shared';

const initial: ArticleFormState = { ok: false };

export function ArticleForm({ article }: { article?: Article | null }) {
  const [state, action, isPending] = useActionState(saveArticle, initial);
  const isEdit = !!article;

  return (
    <form action={action} className="space-y-6 max-w-3xl">
      {article?.id && <input type="hidden" name="id" value={article.id} />}

      <Field
        label="Başlık *"
        error={state.fieldErrors?.title?.[0]}
      >
        <input
          name="title"
          required
          defaultValue={article?.title ?? ''}
          maxLength={200}
          onChange={(e) => {
            const slug = document.querySelector<HTMLInputElement>('input[name="slug"]');
            if (slug && !slug.dataset.touched) slug.value = slugify(e.target.value);
          }}
          className={inputCls}
          placeholder="Time Boxing: Zamanı doldurmayı bırak..."
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Slug" error={state.fieldErrors?.slug?.[0]} hint="URL kısmı, otomatik üretilir">
          <input
            name="slug"
            defaultValue={article?.slug ?? ''}
            onChange={(e) => (e.target.dataset.touched = '1')}
            maxLength={80}
            className={inputCls}
            placeholder="time-boxing"
          />
        </Field>
        <Field label="Kategori">
          <select name="category" defaultValue={article?.category ?? ''} className={inputCls}>
            <option value="">— Seç —</option>
            <option value="haftalik-disiplan">Haftalık Disiplan</option>
            <option value="ipucu">İpucu</option>
            <option value="duyuru">Duyuru</option>
          </select>
        </Field>
      </div>

      <Field label="Özet" hint="Bildirim merkezinde + listede görünür">
        <textarea
          name="summary"
          defaultValue={article?.summary ?? ''}
          maxLength={500}
          rows={2}
          className={`${inputCls} resize-none`}
          placeholder="Sorun, tarih, atasözü ve bilimle zaman yönetimi"
        />
      </Field>

      <Field
        label="İçerik (HTML)"
        hint="Tam HTML — başlıklar, paragraflar, listeler. CSS class'ları için index.html'in stilleri kullanılır."
      >
        <textarea
          name="content_html"
          defaultValue={article?.content_html ?? ''}
          rows={14}
          className={`${inputCls} font-mono text-xs resize-y`}
          placeholder="<h2>Sorun</h2>\n<p>...</p>"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Durum *">
          <select
            name="status"
            defaultValue={article?.status ?? 'draft'}
            className={inputCls}
            required
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
            <option value="archived">Arşivde</option>
          </select>
        </Field>
        <Field label="Hedef Kitle">
          <select
            name="target_audience"
            defaultValue={article?.target_audience ?? 'all'}
            className={inputCls}
          >
            <option value="all">Herkese</option>
            <option value="free">Sadece Free</option>
            <option value="pro">Sadece Pro</option>
            <option value="inactive_7d">7 gün inaktif</option>
          </select>
        </Field>
        <Field label="Okuma süresi (dk)">
          <input
            name="read_time_min"
            type="number"
            min="1"
            max="120"
            defaultValue={article?.read_time_min ?? ''}
            className={inputCls}
            placeholder="5"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Seri Adı">
          <input
            name="series_name"
            defaultValue={article?.series_name ?? ''}
            maxLength={80}
            className={inputCls}
            placeholder="Haftalık Disiplan"
          />
        </Field>
        <Field label="Seri Index">
          <input
            name="series_index"
            type="number"
            min="1"
            defaultValue={article?.series_index ?? ''}
            className={inputCls}
            placeholder="1"
          />
        </Field>
        <Field label="Kapak URL">
          <input
            name="cover_image_url"
            type="url"
            defaultValue={article?.cover_image_url ?? ''}
            className={inputCls}
            placeholder="https://..."
          />
        </Field>
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
          {isPending ? 'Kaydediliyor…' : isEdit ? 'Değişiklikleri kaydet' : 'Makaleyi oluştur'}
        </button>
        <Link
          href="/admin/articles"
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
