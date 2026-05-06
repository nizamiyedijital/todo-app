'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import type { ExportStatus, DeletionStatus } from '@/lib/kvkk-shared';

// ── Export requests ──────────────────────────────────────────────────────────

export async function setExportStatus(
  id: string,
  status: ExportStatus,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === 'processing' || status === 'ready') updates.processed_at = now;
  if (status === 'delivered') updates.delivered_at = now;
  if (notes) updates.notes = notes;

  const { error } = await supabase
    .from('data_export_requests')
    .update(updates)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  await logAudit('DATA_EXPORT_FULFILLED', {
    targetType: 'data_export_request',
    targetId: id,
    payload: { new_status: status },
  });

  revalidatePath('/admin/kvkk');
  return { ok: true };
}

// ── Deletion requests ────────────────────────────────────────────────────────

export async function setDeletionStatus(
  id: string,
  status: DeletionStatus,
  options?: { rejection_reason?: string; admin_notes?: string },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const updates: Record<string, unknown> = { status };
  const now = new Date().toISOString();

  if (status === 'completed' || status === 'rejected') {
    updates.processed_at = now;
    if (user?.id) updates.processed_by = user.id;
  }
  if (options?.rejection_reason) updates.rejection_reason = options.rejection_reason;
  if (options?.admin_notes) updates.admin_notes = options.admin_notes;

  const { error } = await supabase
    .from('data_deletion_requests')
    .update(updates)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  await logAudit(
    status === 'rejected' ? 'DATA_DELETION_REJECTED' : 'DATA_DELETION_APPROVED',
    {
      targetType: 'data_deletion_request',
      targetId: id,
      payload: { new_status: status },
    },
  );

  revalidatePath('/admin/kvkk');
  return { ok: true };
}
