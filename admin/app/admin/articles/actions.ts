'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { slugify, type ArticleStatus } from '@/lib/articles';

const ArticleSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, { error: 'Başlık en az 3 karakter' }).max(200),
  slug: z.string().trim().max(80).optional(),
  summary: z.string().max(500).optional(),
  content_html: z.string().optional(),
  cover_image_url: z.union([z.url(), z.literal('')]).optional(),
  category: z.string().max(50).optional(),
  series_name: z.string().max(80).optional(),
  series_index: z.coerce.number().int().min(1).optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['draft', 'published', 'archived']),
  target_audience: z.enum(['all', 'free', 'pro', 'inactive_7d', 'segment']).default('all'),
  read_time_min: z.coerce.number().int().min(1).max(120).optional().or(z.literal('').transform(() => undefined)),
});

export type ArticleFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveArticle(
  _prev: ArticleFormState | undefined,
  formData: FormData,
): Promise<ArticleFormState> {
  const raw = {
    id: (formData.get('id') as string) || undefined,
    title: formData.get('title'),
    slug: formData.get('slug') || undefined,
    summary: formData.get('summary') || undefined,
    content_html: formData.get('content_html') || undefined,
    cover_image_url: formData.get('cover_image_url') || undefined,
    category: formData.get('category') || undefined,
    series_name: formData.get('series_name') || undefined,
    series_index: formData.get('series_index') || undefined,
    status: formData.get('status') as ArticleStatus,
    target_audience: formData.get('target_audience') || 'all',
    read_time_min: formData.get('read_time_min') || undefined,
  };

  const parsed = ArticleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const slug = data.slug?.trim() || slugify(data.title);
  const wasPublished = data.status === 'published';

  const payload: Record<string, unknown> = {
    title: data.title,
    slug,
    summary: data.summary ?? null,
    content_html: data.content_html ?? null,
    cover_image_url: data.cover_image_url || null,
    category: data.category ?? null,
    series_name: data.series_name ?? null,
    series_index: data.series_index ?? null,
    status: data.status,
    target_audience: data.target_audience,
    read_time_min: data.read_time_min ?? null,
    published_at: wasPublished ? new Date().toISOString() : null,
  };

  if (data.id) {
    // UPDATE
    const { error } = await supabase.from('articles').update(payload).eq('id', data.id);
    if (error) return { ok: false, error: error.message };
    await logAudit(wasPublished ? 'ARTICLE_PUBLISHED' : 'ARTICLE_UPDATED', {
      targetType: 'article',
      targetId: data.id,
      payload: { title: data.title, status: data.status },
    });
  } else {
    // INSERT
    const { data: inserted, error } = await supabase
      .from('articles')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    await logAudit('ARTICLE_CREATED', {
      targetType: 'article',
      targetId: (inserted as { id: string }).id,
      payload: { title: data.title, status: data.status },
    });
  }

  revalidatePath('/admin/articles');
  redirect('/admin/articles');
}

export async function deleteArticle(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (!error) {
    await logAudit('ARTICLE_DELETED', { targetType: 'article', targetId: id });
    revalidatePath('/admin/articles');
  }
  return { ok: !error, error: error?.message };
}

export async function archiveArticle(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('articles').update({ status: 'archived' }).eq('id', id);
  if (!error) {
    await logAudit('ARTICLE_ARCHIVED', { targetType: 'article', targetId: id });
    revalidatePath('/admin/articles');
  }
  return { ok: !error, error: error?.message };
}
