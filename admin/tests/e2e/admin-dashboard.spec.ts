import { test, expect } from '@playwright/test';

test.describe('Admin → Genel Bakış', () => {
  test('8 KPI kartı render edilir + tüm sayılar gerçek (— olmaz)', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Genel Bakış' })).toBeVisible();

    // 8 KPI label'ı
    const expected = [
      'Toplam Kullanıcı',
      'Yeni (7 gün)',
      'Toplam Görev',
      'Bugün Tamamlanan',
      'Pro Aboneler',
      'Açık Ticket',
      'KVKK Talepleri',
      'KVKK Süre Aşımı',
    ];
    const labels = await page.locator('.text-xs.font-medium.uppercase').allTextContents();
    for (const e of expected) {
      expect(labels).toContain(e);
    }

    // Hiçbir KPI değeri "—" olmamalı (service-role + tablo adları doğru)
    // Bu testi geçirmek için: tasks→todos fix kalıcı, service role mevcut
    const values = await page.locator('.grid .text-xl.font-semibold').allTextContents();
    expect(values, 'KPI değerleri gerçek sayı olmalı').not.toContain('—');
  });

  test('analytics sayfası 14 PostHog insight\'a deep link verir', async ({ page }) => {
    await page.goto('/admin/analytics');
    await expect(page.getByRole('heading', { name: 'Analitik' })).toBeVisible();
    const links = await page.locator('a[href*="posthog.com"][href*="/insights/"]').count();
    expect(links).toBe(14);
    // Phase grupları
    await expect(page.getByText(/Faz 2\.A/)).toBeVisible();
    await expect(page.getByText(/Faz 2\.B/)).toBeVisible();
    await expect(page.getByText(/Faz 3\.A/)).toBeVisible();
  });
});
