'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { LogOut, Moon, Sun, ChevronDown, User } from 'lucide-react';
import { signOutAction } from '@/app/login/actions';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils';

export function Topbar({ email, roles }: { email: string; roles: string[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { theme, toggle } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  // Outside click → close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const initials = email
    .split('@')[0]
    .split(/[._-]/)
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <header className="h-14 border-b border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 flex items-center justify-end gap-2 px-4 sticky top-0 z-10">
      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggle}
        title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        className="w-9 h-9 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#12A3E3] text-white flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <span className="text-sm text-slate-700 dark:text-slate-300 hidden sm:inline truncate max-w-[160px]">
            {email}
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-slate-400 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <div className="absolute right-0 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#12A3E3] text-white flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {email}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-1">
                    {roles.length ? (
                      roles.map((r) => (
                        <span
                          key={r}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 uppercase tracking-wider"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-amber-600">rol yok</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="py-1">
              <button
                type="button"
                disabled
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                title="Faz 1A.4'te eklenecek"
              >
                <User className="w-4 h-4" />
                Profil
                <span className="ml-auto text-[9px] uppercase tracking-wider text-slate-400">
                  Yakında
                </span>
              </button>

              <form
                action={() =>
                  startTransition(async () => {
                    await signOutAction();
                  })
                }
              >
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {isPending ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
