import { test, expect } from '@playwright/test';
import { getTestIds, deleteKvkkRequestsByUser, dbGet } from '../fixtures/db';

const ids = getTestIds();

test.describe('Admin → KVKK', () => {
  test.beforeAll(async () => {
    await deleteKvkkRequestsByUser(ids.webUserId);
  });
  test.afterAll(async () => {
    await deleteKvkkRequestsByUser(ids.webUserId);
  });

  test('liste sayfası tabs + KPI', async ({ page }) => {
    await page.goto('/admin/kvkk');
    await expect(page.getByRole('heading', { name: 'KVKK Talepleri' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Veri ihracı/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Veri silme/ })).toBeVisible();
  });

  test('export request — state machine: pending → processing', async ({ page }) => {
    // REST ile bir export request oluştur
    const reqRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/data_export_requests`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: ids.webUserId,
        user_email: ids.webEmail,
        status: 'pending',
        format: 'json',
      }),
    });
    const [req] = (await reqRes.json()) as Array<{ id: string }>;

    await page.goto('/admin/kvkk?tab=export');
    await page.getByRole('button', { name: /Hazırlamaya başla/ }).first().click();
    await page.waitForTimeout(1500);
    const [row] = await dbGet<Array<{ status: string; processed_at: string | null }>>(
      `/data_export_requests?id=eq.${req.id}&select=status,processed_at`,
    );
    expect(row.status).toBe('processing');
    expect(row.processed_at).toBeTruthy();
  });

  test('deletion request — cooling-off aktifken işlem butonu kilitli', async ({ page }) => {
    // 7 gün cayma süresi default; pending status
    const reqRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/data_deletion_requests`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: ids.webUserId,
        user_email: ids.webEmail,
        status: 'pending',
        reason: 'E2E test',
      }),
    });
    const [req] = (await reqRes.json()) as Array<{ id: string }>;

    await page.goto('/admin/kvkk?tab=deletion');
    // Bu satır için "cayma süresi aktif" görünmeli, "İncele" butonu görünmemeli
    const row = page.locator(`tr:has-text("${ids.webEmail}")`).first();
    await expect(row).toContainText('cayma süresi aktif');
    await expect(row.getByRole('button', { name: 'İncele' })).toHaveCount(0);

    // Cleanup için ayrı silme — beforeAll/afterAll kapsayacak ama referans için
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/data_deletion_requests?id=eq.${req.id}`, {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  });
});
