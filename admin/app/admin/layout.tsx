import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { ThemeProvider } from '@/components/admin/theme-provider';
import { Sidebar } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';

/**
 * Admin layout — tüm /admin/** sayfaları bu layout'u kullanır.
 * Auth ve admin rol kontrolü proxy'de yapılıyor; burada UI shell var.
 * Defansif: getAdminUser hala null dönerse forbidden'a at (proxy'yi atlatma yok)
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/forbidden');
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar roles={admin.roles} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar email={admin.email} roles={admin.roles} />
          <main className="flex-1 p-6 overflow-x-auto">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
