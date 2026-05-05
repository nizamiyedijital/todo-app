export function NoServiceRoleNotice({ feature }: { feature: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20 p-6 text-sm">
      <div className="font-medium text-amber-900 dark:text-amber-200">
        ⓘ {feature} için service-role key gerekli
      </div>
      <div className="text-amber-700 dark:text-amber-300 mt-2 text-xs leading-relaxed">
        <p>
          Bu sayfa <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40">auth.users</code>{' '}
          tablosuna eriştiği için Supabase'in <strong>service_role</strong> key'i gerekiyor.
        </p>
        <ol className="list-decimal pl-4 mt-2 space-y-1">
          <li>
            Supabase Dashboard → <strong>Project Settings → API</strong>
          </li>
          <li>
            "service_role" key'i kopyala (⚠️ gizli, asla paylaşma)
          </li>
          <li>
            <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40">
              admin/.env.local
            </code>{' '}
            dosyasında <code>SUPABASE_SERVICE_ROLE_KEY=...</code> satırını doldur
          </li>
          <li>Dev server'ı yeniden başlat: <code>Ctrl+C</code> → <code>npm run dev</code></li>
        </ol>
      </div>
    </div>
  );
}
