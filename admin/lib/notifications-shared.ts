/**
 * Client + server safe — `next/headers` import etmez.
 */

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
