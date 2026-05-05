/**
 * Client + server safe — `next/headers` import etmez.
 * Server data fetching: lib/articles.ts (sadece server component'lerde import edilebilir)
 */

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
