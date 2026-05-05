import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CampaignForm } from '../campaign-form';

export default function NewCampaignPage() {
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
          Yeni Kampanya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Hedef kitle seç, mesajı yaz, taslak olarak kaydet veya gönderim için zamanla.
        </p>
      </div>

      <CampaignForm />
    </div>
  );
}
