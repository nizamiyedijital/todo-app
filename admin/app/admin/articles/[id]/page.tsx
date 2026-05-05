import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { getArticle } from '@/lib/articles';
import { ArticleForm } from '../article-form';
import { DeleteArticleButton } from './delete-button';

export default async function EditArticlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const article = await getArticle(id);
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/articles"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Makalelere dön
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Makaleyi Düzenle
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{article.title}</p>
        </div>
        <DeleteArticleButton id={article.id}>
          <Trash2 className="w-4 h-4" />
          Sil
        </DeleteArticleButton>
      </div>

      <ArticleForm article={article} />
    </div>
  );
}
