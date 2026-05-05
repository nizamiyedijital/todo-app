import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await props.searchParams;

  // Zaten admin olarak login ise direkt admin'e at
  if (await isAdmin()) {
    redirect(next?.startsWith('/admin') ? next : '/admin');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#12A3E3] text-white flex items-center justify-center text-2xl font-bold">
            D
          </div>
          <h1 className="text-xl font-semibold">Disiplan Admin</h1>
          <p className="text-xs text-slate-500">Yönetici girişi</p>
        </div>

        <LoginForm next={next} />

        <div className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">
          Sadece yetkili admin kullanıcıları erişebilir
        </div>
      </div>
    </main>
  );
}
