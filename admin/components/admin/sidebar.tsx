'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { NAV_GROUPS } from '@/lib/nav';
import { canAccessResource, type Role } from '@/lib/rbac';
import { cn } from '@/lib/utils';

type IconName = keyof typeof Icons;

export function Sidebar({ roles }: { roles: Role[] }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-[#12A3E3] text-white flex items-center justify-center font-bold text-sm">
          D
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Disiplan</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5">Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            canAccessResource(roles, item.requires),
          );
          if (!visibleItems.length) return null;

          return (
            <div key={group.label}>
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = (Icons[item.iconName as IconName] ?? Icons.Square) as React.ComponentType<{
                    className?: string;
                  }>;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));
                  const isFuture = (item.faz ?? 0) > 1;

                  return (
                    <li key={item.href}>
                      <Link
                        href={isFuture ? '#' : item.href}
                        aria-disabled={isFuture}
                        onClick={isFuture ? (e) => e.preventDefault() : undefined}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                          isActive
                            ? 'bg-[#12A3E3]/10 text-[#12A3E3] font-medium'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                          isFuture && 'opacity-40 cursor-not-allowed',
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider',
                              isFuture
                                ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 text-[10px] text-slate-400 dark:text-slate-500">
        v0.1.0 · Faz 1A
      </div>
    </aside>
  );
}
