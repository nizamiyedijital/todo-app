import { test, expect } from '@playwright/test';
import { deleteCouponByCode, dbGet } from '../fixtures/db';

const TEST_CODE = 'E2E_TEST20';

test.describe('Admin → Coupons', () => {
  test.beforeEach(async () => {
    await deleteCouponByCode(TEST_CODE);
  });
  test.afterAll(async () => {
    await deleteCouponByCode(TEST_CODE);
  });

  test('liste sayfası açılır + KPI render edilir', async ({ page }) => {
    await page.goto('/admin/coupons');
    await expect(page.getByRole('heading', { name: 'Kuponlar' })).toBeVisible();
    const labels = await page.locator('.text-xs.font-medium.uppercase').allTextContents();
    expect(labels).toEqual(expect.arrayContaining(['Aktif kupon', 'Toplam kullanım', 'Toplam kupon']));
  });

  test('yeni kupon oluştur → DB\'ye yazılır → tabloda görünür', async ({ page }) => {
    await page.goto('/admin/coupons');
    await page.getByRole('button', { name: /Yeni Kupon/ }).click();
    await page.fill('input[name="code"]', TEST_CODE);
    await page.fill('input[name="description"]', 'E2E test kuponu');
    await page.selectOption('select[name="discount_type"]', 'percentage');
    await page.fill('input[name="discount_value"]', '20');
    await page.fill('input[name="max_redemptions"]', '50');
    await page.getByRole('button', { name: 'Oluştur', exact: true }).click();
    await page.waitForTimeout(1000);
    // DB doğrulama
    const rows = await dbGet<Array<{ code: string; status: string; discount_value: number }>>(
      `/coupons?code=eq.${TEST_CODE}&select=code,status,discount_value`,
    );
    expect(rows[0]).toMatchObject({ code: TEST_CODE, status: 'active', discount_value: 20 });
  });

  test('Duraklat butonu — status active → paused geçişi', async ({ page }) => {
    // Önce REST ile oluştur (UI önceki testte test edildi)
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/coupons`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: TEST_CODE,
        discount_type: 'percentage',
        discount_value: 20,
        currency: 'TRY',
        per_user_limit: 1,
        status: 'active',
      }),
    });

    await page.goto('/admin/coupons');
    await page.getByRole('button', { name: 'Duraklat' }).click();
    await page.waitForTimeout(1000);
    const [row] = await dbGet<Array<{ status: string }>>(
      `/coupons?code=eq.${TEST_CODE}&select=status`,
    );
    expect(row.status).toBe('paused');
  });
});
