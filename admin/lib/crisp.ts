import 'server-only';

/**
 * Crisp REST API client — admin'in support cevabını Crisp chat'e push eder.
 *
 * Faz 4.B.2.2: Admin /admin/support'ta reply yazınca buradan Crisp'e push edilir,
 * kullanıcı Crisp widget'ında cevabı görür → iki yönlü senkron tamamlanır.
 *
 * Önkoşul (.env.local):
 *   CRISP_WEBSITE_ID=<dashboard'tan>
 *   CRISP_API_IDENTIFIER=<plugin token identifier>
 *   CRISP_API_KEY=<plugin token key>
 *
 * Plugin token nasıl alınır:
 *   https://marketplace.crisp.chat → "Create plugin" → workspace'i bağla → identifier+key
 *   (Personal API tokens DEPRECATED — plugin token kullanılır)
 */

const CRISP_WEBSITE_ID = process.env.CRISP_WEBSITE_ID;
const CRISP_API_IDENTIFIER = process.env.CRISP_API_IDENTIFIER;
const CRISP_API_KEY = process.env.CRISP_API_KEY;

const CRISP_API_BASE = 'https://api.crisp.chat/v1';

function authHeader(): string {
  if (!CRISP_API_IDENTIFIER || !CRISP_API_KEY) {
    throw new Error('Crisp API credentials .env.local\'da tanımlı değil (CRISP_API_IDENTIFIER + CRISP_API_KEY)');
  }
  const raw = `${CRISP_API_IDENTIFIER}:${CRISP_API_KEY}`;
  return 'Basic ' + Buffer.from(raw).toString('base64');
}

/**
 * Bir Crisp session'a operator (admin) mesajı gönder.
 * @param sessionId   — support_tickets.metadata.crisp_session_id'den alınır
 * @param body        — mesaj metni
 * @param adminEmail  — operator email (Crisp'te workspace'e tanımlı olmalı)
 */
export async function sendCrispMessage(
  sessionId: string,
  body: string,
  adminEmail?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!CRISP_WEBSITE_ID) {
    return { ok: false, error: 'CRISP_WEBSITE_ID tanımlı değil' };
  }
  try {
    const r = await fetch(
      `${CRISP_API_BASE}/website/${CRISP_WEBSITE_ID}/conversation/${sessionId}/message`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
          'X-Crisp-Tier': 'plugin',
        },
        body: JSON.stringify({
          type: 'text',
          from: 'operator',
          origin: 'chat',
          content: body,
          ...(adminEmail ? { user: { type: 'website', user_id: adminEmail } } : {}),
        }),
      },
    );
    if (!r.ok) {
      const errText = await r.text();
      return { ok: false, error: `Crisp API ${r.status}: ${errText}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Bir ticket Crisp kaynaklı mı kontrol et — replyToTicket'ta hangi cevabı push edeceğimizi bil */
export function getCrispSessionId(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const id = (metadata as { crisp_session_id?: string }).crisp_session_id;
  return id ?? null;
}
