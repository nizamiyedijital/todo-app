import 'server-only';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import type {
  SupportTicket,
  SupportMessage,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from './support-shared';

export type {
  SupportTicket,
  SupportMessage,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from './support-shared';

export interface TicketListFilters {
  status?: 'all' | 'open' | TicketStatus; // 'open' = resolved/closed dışı
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: 'me' | 'unassigned' | string;
}

/**
 * Ticket listesi — filtre + son 200 kayıt + mesaj sayısı (kabaca, ayrı sorgu).
 */
export async function listTickets(filters: TicketListFilters = {}): Promise<{
  tickets: SupportTicket[];
  hasServiceRole: boolean;
}> {
  const supabase = await createClient();
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let query = supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'open') {
      query = query.not('status', 'in', '(resolved,closed)');
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.assigned_to) {
    if (filters.assigned_to === 'unassigned') query = query.is('assigned_to', null);
    else if (filters.assigned_to !== 'me') query = query.eq('assigned_to', filters.assigned_to);
    // 'me' → page'de kontrol et (current admin user_id'si gerek)
  }

  const { data, error } = await query;
  if (error) {
    console.error('[support] list:', error.message);
    return { tickets: [], hasServiceRole };
  }

  const tickets = (data ?? []) as SupportTicket[];

  // Mesaj sayıları — tek sorguda count grouping
  if (tickets.length > 0) {
    const ids = tickets.map((t) => t.id);
    const { data: msgRows } = await supabase
      .from('support_messages')
      .select('ticket_id')
      .in('ticket_id', ids);
    const counts = new Map<string, number>();
    for (const r of (msgRows ?? []) as Array<{ ticket_id: string }>) {
      counts.set(r.ticket_id, (counts.get(r.ticket_id) ?? 0) + 1);
    }
    for (const t of tickets) t.message_count = counts.get(t.id) ?? 0;
  }

  // Atanan admin email'leri — service-role gerek
  if (hasServiceRole) {
    const assignedIds = [
      ...new Set(tickets.map((t) => t.assigned_to).filter((x): x is string => !!x)),
    ];
    if (assignedIds.length) {
      try {
        const adminDb = createAdminClient();
        const { data: usersResp } = await adminDb.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const emails = new Map<string, string>();
        for (const u of usersResp?.users ?? []) {
          if (assignedIds.includes(u.id) && u.email) emails.set(u.id, u.email);
        }
        for (const t of tickets) {
          if (t.assigned_to) t.assigned_to_email = emails.get(t.assigned_to) ?? null;
        }
      } catch (e) {
        console.error('[support] assigned email lookup:', e);
      }
    }
  }

  return { tickets, hasServiceRole };
}

/**
 * Ticket detay — mesajlarla beraber.
 */
export async function getTicket(id: string): Promise<{
  ticket: SupportTicket | null;
  messages: SupportMessage[];
}> {
  const supabase = await createClient();
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase.from('support_tickets').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
  ]);

  return {
    ticket: (ticket ?? null) as SupportTicket | null,
    messages: (messages ?? []) as SupportMessage[],
  };
}

/**
 * Açık ticket sayısı — dashboard KPI'ı için.
 */
export async function getOpenTicketStats(): Promise<{
  total: number;
  by_priority: Record<TicketPriority, number>;
  unassigned: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('priority, assigned_to, status')
    .not('status', 'in', '(resolved,closed)');

  if (error || !data) {
    return {
      total: 0,
      by_priority: { low: 0, normal: 0, high: 0, urgent: 0 },
      unassigned: 0,
    };
  }

  const stats = {
    total: data.length,
    by_priority: { low: 0, normal: 0, high: 0, urgent: 0 } as Record<TicketPriority, number>,
    unassigned: 0,
  };
  for (const r of data as Array<{ priority: TicketPriority; assigned_to: string | null }>) {
    stats.by_priority[r.priority] = (stats.by_priority[r.priority] ?? 0) + 1;
    if (!r.assigned_to) stats.unassigned += 1;
  }
  return stats;
}
