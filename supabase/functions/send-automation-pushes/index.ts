/**
 * Faz 5.B.3 — Otomasyon push dispatcher.
 *
 * pg_cron her dakika bu endpoint'i POST'lar (pg_net üzerinden).
 * Akış:
 *   1. push_sent_at IS NULL ve seen_at IS NULL automation_executions çek (limit 100)
 *   2. Her execution için user'ın aktif push_tokens kayıtlarını al
 *   3. Expo Push API'a [{ to, title, body, data: { execution_id, deeplink } }] POST
 *   4. Başarılı response → push_sent_at = now() update
 *
 * Auth: service_role (header'da Authorization: Bearer <key>)
 *
 * Deploy:
 *   supabase functions deploy send-automation-pushes --no-verify-jwt
 *
 * Test:
 *   curl -X POST https://<proj>.supabase.co/functions/v1/send-automation-pushes \
 *     -H 'Authorization: Bearer <SERVICE_ROLE_KEY>'
 */

// @ts-expect-error -- Deno runtime, Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PendingExecution {
  id: number;
  user_id: string;
  preset_id: string;
  title_snapshot: string;
  body_snapshot: string;
  cta_snapshot: string | null;
  deeplink_snapshot: string | null;
}

interface PushToken {
  user_id: string;
  token: string;
  platform: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

async function fetchPending(limit = 100): Promise<PendingExecution[]> {
  const { data, error } = await supabase
    .from('automation_executions')
    .select(
      'id, user_id, preset_id, title_snapshot, body_snapshot, cta_snapshot, deeplink_snapshot',
    )
    .is('push_sent_at', null)
    .is('seen_at', null)
    .order('id', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('[push-dispatcher] fetch pending:', error.message);
    return [];
  }
  return (data ?? []) as PendingExecution[];
}

async function fetchTokensForUsers(userIds: string[]): Promise<Map<string, PushToken[]>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('push_tokens')
    .select('user_id, token, platform')
    .in('user_id', userIds);
  if (error) {
    console.error('[push-dispatcher] fetch tokens:', error.message);
    return new Map();
  }
  const map = new Map<string, PushToken[]>();
  for (const t of (data ?? []) as PushToken[]) {
    const arr = map.get(t.user_id) ?? [];
    arr.push(t);
    map.set(t.user_id, arr);
  }
  return map;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  channelId?: string;
}

async function sendExpoPush(messages: ExpoMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];
  // Expo Push API max 100 message per request
  const chunks: ExpoMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  const all: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      const r = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      if (!r.ok) {
        const text = await r.text();
        console.error('[push-dispatcher] expo error:', r.status, text);
        for (let i = 0; i < chunk.length; i++) {
          all.push({ status: 'error', message: `HTTP ${r.status}` });
        }
        continue;
      }
      const json = (await r.json()) as { data: ExpoPushTicket[] };
      if (Array.isArray(json.data)) all.push(...json.data);
    } catch (e) {
      console.error('[push-dispatcher] fetch error:', (e as Error).message);
      for (let i = 0; i < chunk.length; i++) {
        all.push({ status: 'error', message: (e as Error).message });
      }
    }
  }
  return all;
}

async function markSent(executionIds: number[]): Promise<void> {
  if (executionIds.length === 0) return;
  const { error } = await supabase
    .from('automation_executions')
    .update({ push_sent_at: new Date().toISOString() })
    .in('id', executionIds);
  if (error) console.error('[push-dispatcher] mark sent:', error.message);
}

// @ts-expect-error -- Deno.serve
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
  }

  try {
    const pending = await fetchPending(100);
    if (pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userIds = [...new Set(pending.map(p => p.user_id))];
    const tokenMap = await fetchTokensForUsers(userIds);

    const messages: ExpoMessage[] = [];
    const sentExecutionIds: number[] = [];

    for (const exec of pending) {
      const tokens = tokenMap.get(exec.user_id) ?? [];
      if (tokens.length === 0) {
        // Bu kullanıcının push token'ı yok — yine de "sent" işaretle (sonsuz tekrar etmesin)
        sentExecutionIds.push(exec.id);
        continue;
      }
      for (const t of tokens) {
        messages.push({
          to: t.token,
          title: exec.title_snapshot || '',
          body: exec.body_snapshot || '',
          sound: 'default',
          channelId: 'automation',
          data: {
            execution_id: exec.id,
            preset_id: exec.preset_id,
            deeplink: exec.deeplink_snapshot,
          },
        });
      }
      sentExecutionIds.push(exec.id);
    }

    const tickets = await sendExpoPush(messages);
    const okCount = tickets.filter(t => t.status === 'ok').length;
    const errorCount = tickets.length - okCount;

    await markSent(sentExecutionIds);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: pending.length,
        push_messages: messages.length,
        ok_count: okCount,
        error_count: errorCount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[push-dispatcher] fatal:', (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
