'use client';

/**
 * PostHog client-side init.
 * Server tarafında event göndermek için ayrı `lib/posthog-server.ts` (Faz 1A.4'te).
 */
import posthog from 'posthog-js';

let initialized = false;

export function initPostHog() {
  if (initialized) return posthog;
  if (typeof window === 'undefined') return posthog;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

  if (!key) {
    console.warn('[posthog] NEXT_PUBLIC_POSTHOG_KEY tanımlı değil — event gönderilmeyecek');
    return posthog;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: false, // Pageview'ı manuel tetikleyeceğiz (route change)
    capture_pageleave: true,
    autocapture: false, // Admin panelde gereksiz noise
  });

  initialized = true;
  return posthog;
}

/**
 * Admin event helper — taxonomy'deki standart property'leri otomatik ekler
 * (web `index.html`'deki `window.dpEvent` ile aynı kontrat).
 */
export function dpEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  initPostHog();
  posthog.capture(name, {
    platform: 'web',
    surface: 'admin_panel',
    app_version: '1.0.0',
    ...(properties ?? {}),
  });
}

export { posthog };
