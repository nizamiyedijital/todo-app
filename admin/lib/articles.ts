import { createClient } from './supabase/server';

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content_html: string | null;
  cover_image_url: string | null;
  category: string | null;
  series_name: string | null;
  series_index: number | null;
  status: 'draft' | 'published' | 'archived';
  target_audience: string;
  read_time_min: number | null;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export type ArticleStatus = Article['status'];

export interface ListArticlesFilters {
  status?: 'all' | ArticleStatus;
  q?: string;
}

export async function listArticles(filters: ListArticlesFilters = {}) {
  const supabase = await createClient();

  let query = supabase
    .from('articles')
    .select(
      'id, slug, title, summary, category, series_name, series_index, status, target_audience, published_at, created_at, updated_at',
    )
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.q?.trim()) {
    query = query.or(`title.ilike.%${filters.q.trim()}%,slug.ilike.%${filters.q.trim()}%`);
  }

  const { data, error } = await query.limit(200);
  if (error) {
    console.error('[articles] list:', error.message);
    return [];
  }
  return (data ?? []) as Pick<
    Article,
    | 'id'
    | 'slug'
    | 'title'
    | 'summary'
    | 'category'
    | 'series_name'
    | 'series_index'
    | 'status'
    | 'target_audience'
    | 'published_at'
    | 'created_at'
    | 'updated_at'
  >[];
}

export async function getArticle(id: string): Promise<Article | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('[articles] get:', error.message);
    return null;
  }
  return data as Article | null;
}

/** Slug oluşturucu (Türkçe karakter destekli) */
export function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr')
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
