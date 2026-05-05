'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteArticle } from '../actions';

export function DeleteArticleButton({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    if (!confirm('Bu makaleyi silmek istediğine emin misin? Geri alınamaz.')) return;
    startTransition(async () => {
      const res = await deleteArticle(id);
      if (res.ok) {
        router.push('/admin/articles');
      } else {
        alert('Hata: ' + (res.error ?? 'silinemedi'));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-60"
    >
      {isPending ? 'Siliniyor…' : children}
    </button>
  );
}
