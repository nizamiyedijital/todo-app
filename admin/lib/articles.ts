import 'server-only';
import { createClient } from './supabase/server';
import type { Article } from './articles-shared';

// Re-export shared parts (her import noktasını kırmamak için)
export type { Article, ArticleStatus } from './articles-shared';
export { slugify } from './articles-shared';

export interface ListArticlesFilters {
  status?: 'all' | Article['status'];
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
