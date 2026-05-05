import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getCampaign } from '@/lib/notifications';
import { CampaignForm } from '../campaign-form';

export default async function EditCampaignPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/notifications"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeft className="w-4 h-4" /> Kampanyalara dön
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Kampanyayı Düzenle
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{campaign.title}</p>
      </div>

      {campaign.status === 'sent' ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20 p-6">
          <div className="font-medium text-emerald-900 dark:text-emerald-200 text-sm">
            ✓ Bu kampanya gönderildi — düzenlenemez
          </div>
          <div className="text-emerald-700 dark:text-emerald-300 mt-2 text-xs space-y-1">
            <div>Toplam alıcı: {campaign.recipient_count}</div>
            <div>Teslim: {campaign.delivered_count}</div>
            <div>Açılma: {campaign.opened_count}</div>
            <div>Tıklama: {campaign.clicked_count}</div>
          </div>
        </div>
      ) : (
        <CampaignForm campaign={campaign} />
      )}
    </div>
  );
}
