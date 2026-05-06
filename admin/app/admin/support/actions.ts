'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import type { TicketStatus, TicketPriority } from '@/lib/support-shared';

const ReplySchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().trim().min(1, { error: 'Mesaj boş olamaz' }).max(20000),
  is_internal_note: z.preprocess((v) => v === 'on' || v === true, z.boolean()).default(false),
});

export type ReplyState = {
  ok: boolean;
  error?: string;
};

/**
 * Ticket'a admin cevap veya iç not ekle.
 * Public mesajda first_response_at ilk kez set edilirse SLA için işaretlenir.
 */
export async function replyToTicket(
  _prev: ReplyState | undefined,
  formData: FormData,
): Promise<ReplyState> {
  const parsed = ReplySchema.safeParse({
    ticket_id: formData.get('ticket_id'),
    body: formData.get('body'),
    is_internal_note: formData.get('is_internal_note'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Oturum bulunamadı' };

  const { error: msgErr } = await supabase.from('support_messages').insert({
    ticket_id: parsed.data.ticket_id,
    author_id: user.id,
    author_type: 'admin',
    author_email: user.email,
    body: parsed.data.body,
    is_internal_note: parsed.data.is_internal_note,
  });
  if (msgErr) return { ok: false, error: msgErr.message };

  // Public cevapsa first_response_at güncelle (yalnızca null'sa) + status awaiting_user
  if (!parsed.data.is_internal_note) {
    const { data: t } = await supabase
      .from('support_tickets')
      .select('first_response_at, status')
      .eq('id', parsed.data.ticket_id)
      .maybeSingle();

    const updates: Record<string, unknown> = {};
    if (t && !t.first_response_at) updates.first_response_at = new Date().toISOString();
    // Status'u sadece 'new' ise güncelle — admin manuel başka status seçmiş olabilir
    if (t?.status === 'new') updates.status = 'awaiting_user';
    if (Object.keys(updates).length) {
      await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', parsed.data.ticket_id);
    }
  }

  await logAudit('TICKET_REPLIED', {
    targetType: 'support_ticket',
    targetId: parsed.data.ticket_id,
    payload: { is_internal_note: parsed.data.is_internal_note },
  });

  revalidatePath(`/admin/support/${parsed.data.ticket_id}`);
  revalidatePath('/admin/support');
  return { ok: true };
}

/**
 * Ticket durumunu değiştir + uygun timestamp'leri set et.
 */
export async function changeTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === 'resolved') updates.resolved_at = now;
  if (status === 'closed') updates.closed_at = now;

  const { error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);

  if (error) return { ok: false, error: error.message };

  await logAudit(status === 'resolved' ? 'TICKET_RESOLVED' : 'SETTINGS_UPDATED', {
    targetType: 'support_ticket',
    targetId: ticketId,
    payload: { new_status: status },
  });

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath('/admin/support');
  return { ok: true };
}

/**
 * Ticket'ı kendine ata veya başka admin'e ata (userId boş = unassigned).
 */
export async function assignTicket(
  ticketId: string,
  assigneeId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('support_tickets')
    .update({
      assigned_to: assigneeId,
      assigned_at: assigneeId ? new Date().toISOString() : null,
    })
    .eq('id', ticketId);

  if (error) return { ok: false, error: error.message };

  await logAudit('TICKET_ASSIGNED', {
    targetType: 'support_ticket',
    targetId: ticketId,
    payload: { assignee_id: assigneeId },
  });

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath('/admin/support');
  return { ok: true };
}

/**
 * Ticket önceliğini değiştir.
 */
export async function changeTicketPriority(
  ticketId: string,
  priority: TicketPriority,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('support_tickets')
    .update({ priority })
    .eq('id', ticketId);

  if (error) return { ok: false, error: error.message };

  await logAudit('SETTINGS_UPDATED', {
    targetType: 'support_ticket',
    targetId: ticketId,
    payload: { priority },
  });

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath('/admin/support');
  return { ok: true };
}
