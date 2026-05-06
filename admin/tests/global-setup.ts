/**
 * Global setup — tüm testlerden önce 1 kez koşar.
 *
 * UI üzerinden login yapıp cookie/localStorage state'ini dosyaya kaydeder.
 * Programmatic Supabase auth + manuel cookie injection daha hızlı ama
 * @supabase/ssr kütüphanesinin chunk'lı cookie formatı kırılgan; UI login
 * tüm bu detayları doğru şekilde halleder (~5sn yatırım).
 *
 * Çıktı:
 *   tests/.auth/admin.json   — Next.js cookie state
 *   tests/.auth/web.json     — localStorage state (web app)
 *   tests/.auth/ids.json     — UID'ler (testler okur)
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const AUTH_DIR = 'tests/.auth';

export default async function globalSetup() {
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;
  const webEmail = process.env.TEST_WEB_EMAIL ?? adminEmail;
  const webPassword = process.env.TEST_WEB_PASSWORD ?? adminPassword;

  if (!adminEmail || !adminPassword) {
    throw new Error('TEST_ADMIN_EMAIL ve TEST_ADMIN_PASSWORD .env.local\'da tanımlı olmalı');
  }

  const browser = await chromium.launch();

  // ── Admin login (Next.js, /login form) ─────────────────────────────────
  console.log('[setup] admin login →', adminEmail);
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminPage.goto('http://localhost:3001/login');
  await adminPage.fill('input[name="email"]', adminEmail);
  await adminPage.fill('input[name="password"]', adminPassword);
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL(/\/admin(\/|$)/, { timeout: 10_000 });
  await adminCtx.storageState({ path: join(AUTH_DIR, 'admin.json') });
  // UID'i topbar avatar'dan veya doğrudan supabase getUser çağrısı ile al
  const adminUserId = await adminPage.evaluate(async () => {
    const r = await fetch('/api/whoami').catch(() => null);
    if (r?.ok) return (await r.json()).user_id;
    return null;
  });
  await adminCtx.close();

  // ── Web app login (index.html auth form) ──────────────────────────────
  console.log('[setup] web login →', webEmail);
  const webCtx = await browser.newContext();
  const webPage = await webCtx.newPage();
  await webPage.goto('http://localhost:8082/index.html');
  // Splash'ı bekle, auth box görünür olunca formu doldur
  await webPage.waitForSelector('#authBox:not([style*="display:none"]), #authBox[style*="display:flex"], #authBox[style*="display: flex"], #appBox:not([style*="display:none"])', { timeout: 10_000 }).catch(() => null);
  // appBox zaten görünüyorsa (cached session), atla
  const isAlreadyLoggedIn = await webPage.evaluate(() => {
    return document.getElementById('appBox')?.style.display === 'block';
  });
  if (!isAlreadyLoggedIn) {
    await webPage.fill('#authEmail', webEmail!);
    await webPage.fill('#authPassword', webPassword!);
    await webPage.click('#authBtn');
    // appBox görünür olana kadar bekle
    await webPage.waitForFunction(
      () => document.getElementById('appBox')?.style.display === 'block',
      { timeout: 15_000 },
    );
  }
  await webCtx.storageState({ path: join(AUTH_DIR, 'web.json') });
  const webUserId = await webPage.evaluate(() => {
    return (window as any).session?.user?.id ?? null;
  });
  await webCtx.close();
  await browser.close();

  if (!adminUserId || !webUserId) {
    console.warn('[setup] UID alınamadı — testler manuel UID ile çalışır');
  }

  writeFileSync(
    join(AUTH_DIR, 'ids.json'),
    JSON.stringify({
      adminUserId: adminUserId ?? null,
      webUserId: webUserId ?? null,
      adminEmail,
      webEmail,
    }, null, 2),
  );

  console.log('[setup] done. admin uid:', adminUserId, 'web uid:', webUserId);
}
