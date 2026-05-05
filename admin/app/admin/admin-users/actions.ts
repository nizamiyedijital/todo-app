'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { ROLES, type Role } from '@/lib/rbac';

export async function grantRole(adminUserId: string, role: Role) {
  if (!ROLES.includes(role)) return { ok: false, error: 'Geçersiz rol' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('admin_user_roles').insert({
    admin_user_id: adminUserId,
    role,
    granted_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Rol zaten verilmiş' };
    return { ok: false, error: error.message };
  }

  await logAudit('ADMIN_ROLE_GRANTED', {
    targetType: 'admin_user',
    targetId: adminUserId,
    payload: { role },
  });
  revalidatePath('/admin/admin-users');
  return { ok: true };
}

export async function revokeRole(adminUserId: string, role: Role) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('admin_user_roles')
    .delete()
    .eq('admin_user_id', adminUserId)
    .eq('role', role);

  if (error) return { ok: false, error: error.message };

  await logAudit('ADMIN_ROLE_REVOKED', {
    targetType: 'admin_user',
    targetId: adminUserId,
    payload: { role },
  });
  revalidatePath('/admin/admin-users');
  return { ok: true };
}

export async function setAdminStatus(adminUserId: string, status: 'active' | 'suspended') {
  const supabase = await createClient();

  const { error } = await supabase
    .from('admin_users')
    .update({ status })
    .eq('id', adminUserId);

  if (error) return { ok: false, error: error.message };

  await logAudit(status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', {
    targetType: 'admin_user',
    targetId: adminUserId,
    payload: { status },
  });
  revalidatePath('/admin/admin-users');
  return { ok: true };
}
