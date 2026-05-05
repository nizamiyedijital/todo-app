'use client';

import { useTransition, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { ROLES, type Role } from '@/lib/rbac';
import { grantRole, revokeRole } from './actions';

export function RoleControls({
  adminUserId,
  currentRoles,
  isOwnerSelf,
  canManage,
}: {
  adminUserId: string;
  currentRoles: Role[];
  isOwnerSelf: boolean;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [picking, setPicking] = useState(false);

  const onAdd = (role: Role) => {
    setPicking(false);
    startTransition(async () => {
      const res = await grantRole(adminUserId, role);
      if (!res.ok) alert(res.error);
    });
  };

  const onRemove = (role: Role) => {
    if (role === 'owner' && currentRoles.length === 1) {
      alert('Son owner rolü kaldırılamaz');
      return;
    }
    if (!confirm(`'${role}' rolünü kaldır?`)) return;
    startTransition(async () => {
      const res = await revokeRole(adminUserId, role);
      if (!res.ok) alert(res.error);
    });
  };

  const available = ROLES.filter((r) => !currentRoles.includes(r));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {currentRoles.length === 0 && (
        <span className="text-xs text-amber-600">⚠ rol yok</span>
      )}
      {currentRoles.map((role) => (
        <span
          key={role}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[#12A3E3]/10 text-[#12A3E3]"
        >
          {role}
          {canManage && !(role === 'owner' && isOwnerSelf) && (
            <button
              onClick={() => onRemove(role)}
              disabled={isPending}
              className="text-[#12A3E3]/60 hover:text-red-600 disabled:opacity-50"
              aria-label={`${role} rolünü kaldır`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}

      {canManage && available.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setPicking((v) => !v)}
            disabled={isPending}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-[#12A3E3] hover:border-[#12A3E3]"
          >
            <Plus className="w-3 h-3" />
            Rol ekle
          </button>
          {picking && (
            <div className="absolute z-10 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
              {available.map((r) => (
                <button
                  key={r}
                  onClick={() => onAdd(r)}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 uppercase tracking-wider"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
