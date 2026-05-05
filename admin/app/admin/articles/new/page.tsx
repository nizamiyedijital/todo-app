import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ArticleForm } from '../article-form';

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/articles"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Makalelere dön
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Yeni Makale
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Taslak olarak başlat, hazır olunca yayına al.
        </p>
      </div>

      <ArticleForm />
    </div>
  );
}
