import 'server-only';
import { createClient } from './supabase/server';
import type {
  DataExportRequest,
  DataDeletionRequest,
  ExportStatus,
  DeletionStatus,
} from './kvkk-shared';

export type {
  DataExportRequest,
  DataDeletionRequest,
  ExportStatus,
  DeletionStatus,
} from './kvkk-shared';

export async function listExportRequests(filters: {
  status?: 'all' | ExportStatus;
} = {}): Promise<DataExportRequest[]> {
  const supabase = await createClient();
  let query = supabase
    .from('data_export_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(200);
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  const { data, error } = await query;
  if (error) {
    console.error('[kvkk] list exports:', error.message);
    return [];
  }
  return (data ?? []) as DataExportRequest[];
}

export async function listDeletionRequests(filters: {
  status?: 'all' | DeletionStatus;
} = {}): Promise<DataDeletionRequest[]> {
  const supabase = await createClient();
  let query = supabase
    .from('data_deletion_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(200);
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  const { data, error } = await query;
  if (error) {
    console.error('[kvkk] list deletions:', error.message);
    return [];
  }
  return (data ?? []) as DataDeletionRequest[];
}

export async function getKvkkStats(): Promise<{
  pending_exports: number;
  pending_deletions: number;
  overdue: number;
}> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [exports, deletions, overdueExports, overdueDeletions] = await Promise.all([
    supabase
      .from('data_export_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']),
    supabase
      .from('data_deletion_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'review', 'approved']),
    supabase
      .from('data_export_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing'])
      .lt('due_at', now),
    supabase
      .from('data_deletion_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'review', 'approved'])
      .lt('due_at', now),
  ]);

  return {
    pending_exports: exports.count ?? 0,
    pending_deletions: deletions.count ?? 0,
    overdue: (overdueExports.count ?? 0) + (overdueDeletions.count ?? 0),
  };
}
