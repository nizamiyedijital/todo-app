import { test, expect } from '@playwright/test';
import { getTestIds, deleteAllTestSubs, dbGet } from '../fixtures/db';

const ids = getTestIds();

test.describe('Admin → Subscriptions', () => {
  test.beforeEach(async () => {
    await deleteAllTestSubs(); // her test temiz başlasın
  });
  test.afterAll(async () => {
    await deleteAllTestSubs();
  });

  test('liste sayfası KPI + status filtreleri yükleniyor', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await expect(page.getByRole('heading', { name: 'Abonelikler' })).toBeVisible();
    // 3 KPI olmalı
    const kpiLabels = await page.locator('.text-xs.font-medium.uppercase').allTextContents();
    expect(kpiLabels).toEqual(expect.arrayContaining(['Aktif Abonelik', 'MRR (TL)', 'Toplam Abonelik']));
    // Status tabs
    for (const tab of ['Hepsi', 'Aktif', 'Deneme', 'Gecikmiş', 'İptal']) {
      await expect(page.getByRole('link', { name: tab })).toBeVisible();
    }
  });

  test('manuel abonelik oluşturma — RLS/admin client doğru kullanılıyor', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await page.getByRole('button', { name: /Manuel Abonelik/ }).click();
    await page.fill('input[name="user_id"]', ids.webUserId);
    // Pro Aylık seçeneğini bul ve value'sunu al
    const proValue = await page
      .locator('select[name="plan_id"] option')
      .filter({ hasText: 'Pro Aylık' })
      .first()
      .getAttribute('value');
    if (!proValue) throw new Error('Pro Aylık option bulunamadı');
    await page.selectOption('select[name="plan_id"]', proValue);
    await page.fill('input[name="period_days"]', '7');
    await page.getByRole('button', { name: 'Oluştur', exact: true }).click();
    // Form kapanır → liste yenilenir
    await page.waitForTimeout(1500);
    // DB'de gerçekten var mı?
    const rows = await dbGet<Array<{ status: string; metadata: Record<string, unknown> }>>(
      `/subscriptions?user_id=eq.${ids.webUserId}&select=status,metadata&order=created_at.desc&limit=1`,
    );
    expect(rows[0]?.status).toBe('active');
    expect(rows[0]?.metadata).toMatchObject({ source: 'admin_manual' });
  });

  test('iptal aksiyonu — period sonuna kadar aktif kalır (cancelled, ended değil)', async ({ page }) => {
    // Önce sub oluştur (REST ile — UI hızlandırma)
    const { createActiveSub } = await import('../fixtures/db');
    const sub = await createActiveSub(ids.webUserId, undefined, 30);
    // İçerik metadata'sını e2e_test olarak gönder ki cleanup yakalasın
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/subscriptions?id=eq.${sub.id}`, {
      method: 'PATCH',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata: { source: 'e2e_test' } }),
    });

    await page.goto('/admin/subscriptions');
    page.on('dialog', (d) => d.accept()); // confirm() onayı
    await page.getByRole('button', { name: /İptal/ }).first().click();
    await page.waitForTimeout(1500);

    const [row] = await dbGet<Array<{ status: string; cancelled_at: string | null }>>(
      `/subscriptions?id=eq.${sub.id}&select=status,cancelled_at`,
    );
    expect(row.status).toBe('cancelled');
    expect(row.cancelled_at).toBeTruthy();
  });
});
