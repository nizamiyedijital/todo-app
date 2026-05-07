/**
 * Crisp Webhook → Disiplan support_tickets
 *
 * Crisp dashboard → Settings → Plugins → Webhook ile kayıtlı URL'e
 * her chat eventi POST edilir. Burada `message:send` (kullanıcı mesajı)
 * eventlerini yakalayıp support_tickets/support_messages tablolarına yazıyoruz.
 *
 * Akış:
 *   1) Crisp'te kullanıcı mesaj atar → bu endpoint'e POST gelir
 *   2) Aynı user_email için OPEN bir ticket varsa → ona yeni message ekle
 *   3) Yoksa yeni ticket aç (status=new, source=crisp, kategori=other)
 *   4) Disiplan admin /admin/support'ta görür ve cevap yazar
 *
 * Faz 4.B.2.2'de eklenecek: admin reply → Crisp message push (admin server action).
 *
 * Deploy:
 *   supabase functions deploy crisp-webhook --no-verify-jwt
 *   supabase secrets set CRISP_WEBHOOK_SECRET=<crisp panel'inden al>
 *   # URL: https://<proj>.supabase.co/functions/v1/crisp-webhook
 *   # → Crisp Dashboard → Settings → Plugins → Webhook → URL'i ekle
 *
 * Test:
 *   curl -X POST https://<proj>.supabase.co/functions/v1/crisp-webhook \
 *     -H 'X-Crisp-Signature: <hmac>' \
 *     -d '{"event":"message:send","data":{...}}'
 */

// @ts-expect-error -- Deno runtime, Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRISP_WEBHOOK_SECRET = Deno.env.get('CRISP_WEBHOOK_SECRET') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Crisp event payload (https://docs.crisp.chat/guides/rest-api/webhooks/)
interface CrispEvent {
  event: string; // 'message:send' | 'session:set_email' | ...
  website_id: string;
  data: {
    session_id: string;
    website_id: string;
    type?: 'text' | 'file' | 'animation' | 'audio' | 'picker' | 'field' | 'note' | 'event';
    from?: 'user' | 'operator';
    origin?: string;
    content?: string | { name?: string; url?: string };
    user?: {
      user_id?: string;
      nickname?: string;
      avatar?: string | null;
    };
    fingerprint?: number;
    timestamp?: number;
    // session:set_email, set_data vb. için
    email?: string;
    nickname?: string;
    data?: Record<string, unknown>;
  };
  timestamp: number;
}

/** HMAC-SHA256 signature verify (Crisp X-Crisp-Signature header) */
async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!CRISP_WEBHOOK_SECRET) {
    console.warn('[crisp-webhook] CRISP_WEBHOOK_SECRET tanımlı değil — signature check atlanıyor');
    return true; // dev mode — prod'da zorunlu
  }
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(CRISP_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex === signature;
}

/** Crisp session_id ↔ ticket mapping. Aynı session için tek ticket. */
async function findOpenTicket(crispSessionId: string): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('metadata->>crisp_session_id', crispSessionId)
    .not('status', 'in', '(resolved,closed)')
    .limit(1)
    .maybeSingle();
  return data as { id: string } | null;
}

async function lookupUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data?.users?.find((u: any) => u.email === email)?.id ?? null;
}

/**
 * Yeni ticket oluştur veya mevcuda message ekle.
 *
 * - `from='user'`: kullanıcının yazdığı mesaj. Eşleşen ticket yoksa yeni
 *   ticket açılır; varsa o ticket'a `author_type='user'` ile yazılır.
 * - `from='operator'`: admin Crisp dashboard'tan yazdığı yanıt. **Sadece
 *   mevcut ticket'a** yazılır (`author_type='admin'`); eşleşen ticket
 *   yoksa drop edilir (orphan operator mesajı tutarsız olurdu).
 */
async function handleMessageSend(event: CrispEvent): Promise<{ ok: boolean; ticket_id?: string; error?: string }> {
  if (event.data.type !== 'text') return { ok: true }; // text dışı (file/animation/...) atla
  if (event.data.from !== 'user' && event.data.from !== 'operator') return { ok: true };

  const sessionId = event.data.session_id;
  const body = typeof event.data.content === 'string' ? event.data.content : '';
  if (!body) return { ok: true };

  // Operator (admin Crisp'ten yanıtladı) — sadece mevcut ticket'a yaz
  if (event.data.from === 'operator') {
    const ticket = await findOpenTicket(sessionId);
    if (!ticket) {
      console.warn('[crisp-webhook] operator mesajı eşleşen ticket yok, drop:', sessionId);
      return { ok: true };
    }
    const { error: msgErr } = await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      author_id: null,         // Crisp operator'ü Disiplan auth.users'a bağlı değil
      author_type: 'admin',
      author_email: null,
      body,
      is_internal_note: false,
    });
    if (msgErr) return { ok: false, error: msgErr.message };
    return { ok: true, ticket_id: ticket.id };
  }

  // User — mevcut akış (yeni ticket aç ya da mevcuda ekle)
  const userEmail = event.data.user?.user_id?.includes('@')
    ? event.data.user.user_id
    : (event.data as any).email_address || event.data.user?.nickname || 'anonymous@crisp';
  const userName = event.data.user?.nickname ?? null;
  const userId = userEmail.includes('@') ? await lookupUserIdByEmail(userEmail) : null;

  let ticket = await findOpenTicket(sessionId);

  if (!ticket) {
    const subject = body.length <= 60 ? body : body.slice(0, 57) + '…';
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        subject,
        category: 'other',
        priority: 'normal',
        status: 'new',
        source: 'crisp',
        metadata: { crisp_session_id: sessionId, crisp_website_id: event.website_id },
      })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'insert failed' };
    ticket = data as { id: string };
  }

  const { error: msgErr } = await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    author_id: userId,
    author_type: 'user',
    author_email: userEmail,
    body,
    is_internal_note: false,
  });
  if (msgErr) return { ok: false, error: msgErr.message };

  return { ok: true, ticket_id: ticket.id };
}

// @ts-expect-error -- Deno.serve
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('X-Crisp-Signature');
  if (!(await verifySignature(rawBody, signature))) {
    return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 });
  }

  let event: CrispEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 });
  }

  // Şu an sadece message:send'i işliyoruz (chat ingestion)
  // Diğer event'ler (session:set_email, session:set_data vb.) için ileride
  if (event.event === 'message:send') {
    const r = await handleMessageSend(event);
    if (!r.ok) {
      console.error('[crisp-webhook] handleMessageSend error:', r.error);
      return new Response(JSON.stringify(r), { status: 500 });
    }
    return new Response(JSON.stringify(r), { status: 200 });
  }

  // Bilinmeyen event → 200 OK (Crisp retry yapmasın)
  return new Response(JSON.stringify({ ok: true, ignored: event.event }), { status: 200 });
});
