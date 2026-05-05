'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

const SignInSchema = z.object({
  email: z.email({ error: 'Geçerli bir email girin' }).trim(),
  password: z.string().min(6, { error: 'Şifre en az 6 karakter olmalı' }),
});

export type SignInState = {
  ok: boolean;
  errors?: { email?: string[]; password?: string[]; form?: string[] };
};

export async function signInAction(
  _prev: SignInState | undefined,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return { ok: false, errors: flat.fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.session) {
    return {
      ok: false,
      errors: { form: [error?.message || 'Giriş başarısız oldu'] },
    };
  }

  // Admin mi kontrolü — RPC ile is_admin()
  const { data: isAdminRow } = await supabase.rpc('is_admin');
  if (!isAdminRow) {
    // Login açıldı ama admin değil — derhal logout + forbidden
    await supabase.auth.signOut();
    return {
      ok: false,
      errors: {
        form: ['Bu hesap admin paneline erişim yetkisine sahip değil'],
      },
    };
  }

  // Audit log — başarılı admin login
  await logAudit('ADMIN_LOGIN', {
    targetType: 'session',
    targetId: data.user?.id,
    payload: { email: data.user?.email },
  });

  const next = (formData.get('next') as string) || '/admin';
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function signOutAction() {
  const supabase = await createClient();
  await logAudit('ADMIN_LOGOUT');
  await supabase.auth.signOut();
  redirect('/login');
}
