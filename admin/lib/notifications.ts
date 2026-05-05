import 'server-only';
import { createClient } from './supabase/server';
import type { NotificationCampaign, CampaignStatus } from './notifications-shared';

// Re-export shared parts
export type { NotificationCampaign, CampaignStatus } from './notifications-shared';

export async function listCampaigns(filterStatus?: 'all' | CampaignStatus) {
  const supabase = await createClient();

  let query = supabase
    .from('notification_campaigns')
    .select(
      'id, title, message, delivery_method, target_audience, status, scheduled_for, sent_at, recipient_count, delivered_count, opened_count, clicked_count, created_at',
    )
    .order('created_at', { ascending: false });

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }

  const { data, error } = await query.limit(100);
  if (error) {
    console.error('[notifications] list:', error.message);
    return [];
  }
  return (data ?? []) as Pick<
    NotificationCampaign,
    | 'id'
    | 'title'
    | 'message'
    | 'delivery_method'
    | 'target_audience'
    | 'status'
    | 'scheduled_for'
    | 'sent_at'
    | 'recipient_count'
    | 'delivered_count'
    | 'opened_count'
    | 'clicked_count'
    | 'created_at'
  >[];
}

export async function getCampaign(id: string): Promise<NotificationCampaign | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notification_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return data as NotificationCampaign | null;
}
