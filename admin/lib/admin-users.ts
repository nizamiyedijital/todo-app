import 'server-only';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { ROLES, type Role } from './rbac';

export interface AdminUserRow {
  id: string; // admin_users.id
  user_id: string;
  email: string | null;
  status: 'active' | 'suspended' | 'invited';
  roles: Role[];
  created_at: string;
  last_login_at: string | null;
  notes: string | null;
}

export async function listAdminUsers(): Promise<{
  admins: AdminUserRow[];
  hasServiceRole: boolean;
}> {
  const supabase = await createClient();
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const { data: adminsData, error } = await supabase
    .from('admin_users')
    .select('id, user_id, status, created_at, last_login_at, notes, admin_user_roles(role)')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin-users] list:', error.message);
    return { admins: [], hasServiceRole };
  }

  const rows = (adminsData ?? []) as Array<{
    id: string;
    user_id: string;
    status: 'active' | 'suspended' | 'invited';
    created_at: string;
    last_login_at: string | null;
    notes: string | null;
    admin_user_roles?: Array<{ role: string }> | null;
  }>;

  // Email lookup — service-role gerekli
  const userIds = rows.map((r) => r.user_id);
  const emails = new Map<string, string>();
  if (hasServiceRole && userIds.length) {
    try {
      const adminDb = createAdminClient();
      const { data } = await adminDb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of data?.users ?? []) {
        if (userIds.includes(u.id) && u.email) emails.set(u.id, u.email);
      }
    } catch (e) {
      console.error('[admin-users] email lookup:', e);
    }
  }

  const admins: AdminUserRow[] = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    email: emails.get(r.user_id) ?? null,
    status: r.status,
    roles: (r.admin_user_roles ?? [])
      .map((x) => x.role as Role)
      .filter((r): r is Role => ROLES.includes(r as Role)),
    created_at: r.created_at,
    last_login_at: r.last_login_at,
    notes: r.notes,
  }));

  return { admins, hasServiceRole };
}
