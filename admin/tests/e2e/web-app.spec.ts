import { test, expect } from '@playwright/test';
import { getTestIds, createActiveSub, deleteAllTestSubs, deleteTicketsByPrefix, deleteKvkkRequestsByUser, dbGet } from '../fixtures/db';

const ids = getTestIds();
const PREFIX = 'E2E:';

test.describe('Web app', () => {
  test.beforeAll(async () => {
    await deleteAllTestSubs();
    await deleteTicketsByPrefix(PREFIX);
    await deleteKvkkRequestsByUser(ids.webUserId);
  });
  test.afterAll(async () => {
    await deleteAllTestSubs();
    await deleteTicketsByPrefix(PREFIX);
    await deleteKvkkRequestsByUser(ids.webUserId);
  });

  test('login sonrası ana app yüklenir + dpSubscription state setlenir', async ({ page }) => {
    await page.goto('/index.html');
    // initApp yüklenene kadar bekle
    await page.waitForFunction(() => (window as any).dpSubscription !== undefined, { timeout: 10_000 });
    const sub = await page.evaluate(() => (window as any).dpSubscription);
    expect(sub).toBeTruthy();
    expect(sub.plan_code).toBe('free'); // henüz active sub yok
    expect(sub.is_pro).toBe(false);
  });

  test('Pro user: PRO rozeti görünür, "Pro\'ya Geç" gizli', async ({ page }) => {
    // Önce active sub oluştur
    await createActiveSub(ids.webUserId);
    await page.goto('/index.html');
    await page.waitForFunction(() => (window as any).dpSubscription?.is_pro === true, { timeout: 10_000 });
    // Profil menüsünü aç
    await page.evaluate(() => (window as any).toggleProfileMenu(new MouseEvent('click')));
    await page.waitForTimeout(200);
    const badge = await page.locator('#pmPlanBadge').textContent();
    expect(badge?.trim()).toBe('PRO');
    const upgradeRow = page.locator('#pmUpgradeRow');
    await expect(upgradeRow).toBeHidden();
    // Cleanup
    await deleteAllTestSubs();
  });

  test('Free user: PRO rozeti gizli, "Pro\'ya Geç" satırı görünür', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => (window as any).dpSubscription?.is_pro === false, { timeout: 10_000 });
    await page.evaluate(() => (window as any).toggleProfileMenu(new MouseEvent('click')));
    await page.waitForTimeout(200);
    await expect(page.locator('#pmPlanBadge')).toBeHidden();
    await expect(page.locator('#pmUpgradeRow')).toBeVisible();
    // Link checkout'a gitmeli
    const href = await page.locator('#pmUpgradeRow').getAttribute('href');
    expect(href).toContain('landing/checkout.html?plan=pro_monthly_try');
  });

  test('in-app destek formu — ticket oluşturur + önceki taleplerim listesi', async ({ page }) => {
    const subject = `${PREFIX} web app test ${Date.now()}`;
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof (window as any).openSupportModal === 'function', { timeout: 10_000 });
    await page.evaluate(() => (window as any).openSupportModal());
    await page.waitForTimeout(500);
    await page.fill('#supportSubject', subject);
    await page.selectOption('#supportCategory', 'bug');
    await page.fill('#supportBody', 'E2E test mesajı');
    await page.evaluate(() => (document.getElementById('supportForm') as HTMLFormElement).requestSubmit());
    await page.waitForTimeout(2000);
    // DB doğrulama
    const tickets = await dbGet<Array<{ subject: string; status: string }>>(
      `/support_tickets?user_id=eq.${ids.webUserId}&select=subject,status&order=created_at.desc&limit=1`,
    );
    expect(tickets[0].subject).toBe(subject);
    expect(tickets[0].status).toBe('new');
    // Modal kapandı, yeniden aç → önceki taleplerim'de görünmeli
    await page.evaluate(() => (window as any).openSupportModal());
    await page.waitForFunction(
      () => document.getElementById('supportPrevWrap')?.style.display !== 'none',
      { timeout: 5000 },
    );
    const items = await page.locator('#supportPrevList > div').count();
    expect(items).toBeGreaterThan(0);
  });

  test('KVKK self-service — export request DB\'ye yazar', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => typeof (window as any).requestKvkkExport === 'function', { timeout: 10_000 });
    // confirm'i otomatik onayla
    page.on('dialog', (d) => d.accept());
    await page.evaluate(() => (window as any).requestKvkkExport());
    await page.waitForTimeout(1500);
    const rows = await dbGet<Array<{ status: string; format: string }>>(
      `/data_export_requests?user_id=eq.${ids.webUserId}&select=status,format`,
    );
    expect(rows[0]).toMatchObject({ status: 'pending', format: 'json' });
  });
});
