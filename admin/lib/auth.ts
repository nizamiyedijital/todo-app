/**
 * Auth & admin helpers — server-side.
 * Login olmuş kullanıcının admin durumunu ve rollerini sorgular.
 */
import { cache } from 'react';
import { createClient } from './supabase/server';
import { ROLES, type Role } from './rbac';

export interface AdminUserInfo {
  userId: string;
  email: string;
  adminUserId: string;
  status: 'active' | 'suspended' | 'invited';
  roles: Role[];
}

/**
 * Şu an oturumdaki admin kullanıcının bilgilerini döner.
 * Admin değilse null döner. React `cache` ile aynı request içinde tek sorgu.
 */
export const getAdminUser = cache(async (): Promise<AdminUserInfo | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  // admin_users + admin_user_roles join
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, status, admin_user_roles(role)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[auth] admin_users sorgu hatası:', error.message);
    return null;
  }
  if (!data) return null;
  if (data.status !== 'active') return null;

  const roles = (data.admin_user_roles ?? [])
    .map((r) => r.role as Role)
    .filter((r): r is Role => ROLES.includes(r as Role));

  return {
    userId: user.id,
    email: user.email,
    adminUserId: data.id,
    status: data.status as AdminUserInfo['status'],
    roles,
  };
});

/**
 * Sadece kontrol — admin mi değil mi.
 */
export async function isAdmin(): Promise<boolean> {
  const info = await getAdminUser();
  return info !== null;
}
