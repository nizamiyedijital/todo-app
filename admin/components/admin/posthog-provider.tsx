'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog, dpEvent } from '@/lib/posthog';

const LOGIN_FIRED_KEY = 'dp_admin_login_fired_for';

/**
 * PostHog provider — admin app için.
 * - Mount'ta init
 * - Route change'de pageview
 * - Admin user bilgisini identify olarak gönder
 */
export function PostHogProvider({
  user,
  children,
}: {
  user?: { id: string; email: string; roles: string[] } | null;
  children: React.ReactNode;
}) {
  // Init bir kez
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify user (admin context) + user_logged_in event (tab başına bir kez per user.id)
  useEffect(() => {
    if (!user?.id) return;
    initPostHog();
    posthog.identify(user.id, {
      email: user.email,
      admin_roles: user.roles,
      surface: 'admin_panel',
    });

    if (typeof window !== 'undefined') {
      const lastFiredFor = window.sessionStorage.getItem(LOGIN_FIRED_KEY);
      if (lastFiredFor !== user.id) {
        dpEvent('user_logged_in', { method: 'email' });
        window.sessionStorage.setItem(LOGIN_FIRED_KEY, user.id);
      }
    }
  }, [user?.id, user?.email]);

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  );
}

/**
 * Route change'de pageview gönder.
 * Suspense ile sarılmış çünkü useSearchParams'ı static export uyarısını engellemek için.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    initPostHog();
    const url = sp?.toString() ? `${pathname}?${sp.toString()}` : pathname;
    posthog.capture('$pageview', {
      $current_url: typeof window !== 'undefined' ? window.location.origin + url : url,
      surface: 'admin_panel',
    });
  }, [pathname, sp]);

  return null;
}
