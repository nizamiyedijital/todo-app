import 'server-only';
import { createClient } from './supabase/server';

export interface SystemStatus {
  supabase: { ok: boolean; latency_ms: number | null; error?: string };
  migrations: Array<{ version: string; applied_at: string; description: string | null }>;
  posthog: { configured: boolean; host: string | null };
  serviceRole: boolean;
  appVersion: string;
  nodeVersion: string;
  nextVersion: string;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const supabase = await createClient();

  // Supabase ping — basit bir count sorgusu
  const t0 = performance.now();
  let supaOk = true;
  let supaErr: string | undefined;
  try {
    const { error } = await supabase
      .from('_migration_log')
      .select('version', { count: 'exact', head: true })
      .limit(1);
    if (error) {
      supaOk = false;
      supaErr = error.message;
    }
  } catch (e) {
    supaOk = false;
    supaErr = e instanceof Error ? e.message : 'unknown';
  }
  const latency = supaOk ? Math.round(performance.now() - t0) : null;

  // Migration log
  let migrations: SystemStatus['migrations'] = [];
  if (supaOk) {
    const { data } = await supabase
      .from('_migration_log')
      .select('version, applied_at, description')
      .order('version', { ascending: true });
    migrations = (data ?? []) as SystemStatus['migrations'];
  }

  return {
    supabase: { ok: supaOk, latency_ms: latency, error: supaErr },
    migrations,
    posthog: {
      configured: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? null,
    },
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    appVersion: '0.1.0',
    nodeVersion: process.version,
    nextVersion: '16.2.4',
  };
}
