import { test, expect } from '@playwright/test';
import { getTestIds, deleteTicketsByPrefix, dbGet } from '../fixtures/db';

const ids = getTestIds();
const PREFIX = 'E2E:';

test.describe('Admin → Support', () => {
  test.beforeAll(async () => {
    await deleteTicketsByPrefix(PREFIX);
  });
  test.afterAll(async () => {
    await deleteTicketsByPrefix(PREFIX);
  });

  test('liste sayfası KPI + filter tabs', async ({ page }) => {
    await page.goto('/admin/support');
    await expect(page.getByRole('heading', { name: 'Destek Talepleri' })).toBeVisible();
    const labels = await page.locator('.text-xs.font-medium.uppercase').allTextContents();
    expect(labels).toEqual(expect.arrayContaining(['Açık talep', 'Acil', 'Yüksek', 'Atanmamış']));
    // Status tabs
    await expect(page.getByRole('link', { name: 'Açık' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Çözüldü' })).toBeVisible();
  });

  test('admin ticket\'a reply → first_response_at + status auto-transition', async ({ page }) => {
    // Önce REST ile bir ticket oluştur
    const subject = `${PREFIX} test ticket ${Date.now()}`;
    const ticketRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/support_tickets`, {
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
        subject,
        category: 'bug',
        priority: 'normal',
        status: 'new',
        source: 'in_app',
      }),
    });
    const [ticket] = (await ticketRes.json()) as Array<{ id: string }>;
    expect(ticket.id).toBeTruthy();

    await page.goto(`/admin/support/${ticket.id}`);
    await expect(page.getByRole('heading', { name: subject })).toBeVisible();
    // Reply yaz
    await page.fill('textarea[name="body"]', 'E2E admin cevabı — Disiplan ekibi.');
    await page.getByRole('button', { name: /Gönder/ }).click();
    await page.waitForTimeout(1500);
    // DB doğrulama: status awaiting_user, first_response_at dolu, message sayısı 1
    const [row] = await dbGet<Array<{ status: string; first_response_at: string | null }>>(
      `/support_tickets?id=eq.${ticket.id}&select=status,first_response_at`,
    );
    expect(row.status).toBe('awaiting_user'); // 'new' → 'awaiting_user' otomatik
    expect(row.first_response_at).toBeTruthy();
    const messages = await dbGet<Array<{ author_type: string; body: string }>>(
      `/support_messages?ticket_id=eq.${ticket.id}&select=author_type,body&order=created_at.asc`,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].author_type).toBe('admin');
  });

  test('iç not — kullanıcıya gözükmez (is_internal_note=true)', async ({ page }) => {
    const subject = `${PREFIX} internal note test ${Date.now()}`;
    const ticketRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/support_tickets`, {
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
        subject,
        category: 'other',
        priority: 'normal',
        status: 'new',
        source: 'in_app',
      }),
    });
    const [ticket] = (await ticketRes.json()) as Array<{ id: string }>;

    await page.goto(`/admin/support/${ticket.id}`);
    await page.fill('textarea[name="body"]', 'İç not — sadece admin görür');
    await page.check('input[name="is_internal_note"]');
    await page.getByRole('button', { name: /Gönder/ }).click();
    await page.waitForTimeout(1000);

    const messages = await dbGet<Array<{ is_internal_note: boolean }>>(
      `/support_messages?ticket_id=eq.${ticket.id}&select=is_internal_note`,
    );
    expect(messages[0].is_internal_note).toBe(true);
    // İç not'ta first_response_at güncellemez (public cevap olmadığı için)
    const [row] = await dbGet<Array<{ first_response_at: string | null; status: string }>>(
      `/support_tickets?id=eq.${ticket.id}&select=first_response_at,status`,
    );
    expect(row.first_response_at).toBeNull();
    expect(row.status).toBe('new'); // değişmedi
  });
});
