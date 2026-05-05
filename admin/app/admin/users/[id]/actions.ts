'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

const NoteSchema = z.object({
  userId: z.uuid(),
  body: z.string().min(1, { error: 'Not boş olamaz' }).max(2000),
  pinned: z.boolean().default(false),
});

export type NoteState = {
  ok: boolean;
  error?: string;
};

export async function addUserNote(
  _prev: NoteState | undefined,
  formData: FormData,
): Promise<NoteState> {
  const parsed = NoteSchema.safeParse({
    userId: formData.get('userId'),
    body: formData.get('body'),
    pinned: formData.get('pinned') === 'on',
  });

  if (!parsed.success) {
    return { ok: false, error: z.flattenError(parsed.error).fieldErrors.body?.[0] ?? 'Geçersiz' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Oturum yok' };

  const { error } = await supabase.from('admin_user_notes').insert({
    user_id: parsed.data.userId,
    author_id: user.id,
    body: parsed.data.body,
    pinned: parsed.data.pinned,
  });

  if (error) return { ok: false, error: error.message };

  await logAudit('USER_NOTE_ADDED', {
    targetType: 'user',
    targetId: parsed.data.userId,
    payload: { note_length: parsed.data.body.length },
  });

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { ok: true };
}

export async function deleteUserNote(noteId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('admin_user_notes').delete().eq('id', noteId);

  if (!error) {
    await logAudit('USER_NOTE_ADDED', {
      targetType: 'admin_user_notes',
      targetId: noteId,
      payload: { action: 'delete' },
    });
    revalidatePath(`/admin/users/${userId}`);
  }
  return { ok: !error, error: error?.message };
}
