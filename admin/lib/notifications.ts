import { createClient } from './supabase/server';

export interface NotificationCampaign {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  icon: string | null;
  delivery_method: 'in_app' | 'push' | 'email' | 'all';
  target_audience: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  related_article_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = NotificationCampaign['status'];

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
