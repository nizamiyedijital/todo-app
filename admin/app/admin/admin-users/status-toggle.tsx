'use client';

import { useTransition } from 'react';
import { setAdminStatus } from './actions';

export function StatusToggle({
  adminUserId,
  status,
  disabled,
}: {
  adminUserId: string;
  status: 'active' | 'suspended' | 'invited';
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isActive = status === 'active';

  const onToggle = () => {
    const next: 'active' | 'suspended' = isActive ? 'suspended' : 'active';
    if (!confirm(`Bu admin'i ${next === 'suspended' ? 'askıya al' : 'tekrar aktive et'}?`)) return;
    startTransition(async () => {
      const res = await setAdminStatus(adminUserId, next);
      if (!res.ok) alert(res.error);
    });
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || isPending}
      className={`text-xs px-2 py-1 rounded ${
        isActive
          ? 'text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20'
          : 'text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={disabled ? 'Kendini suspend edemezsin' : ''}
    >
      {isPending ? '…' : isActive ? 'Askıya al' : 'Aktive et'}
    </button>
  );
}
