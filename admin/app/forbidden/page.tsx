import Link from 'next/link';
import { signOutAction } from '@/app/login/actions';

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl">
          ⛔
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">Erişim Reddedildi</h1>
          <p className="text-sm text-slate-600">
            Bu hesap admin paneline erişim yetkisine sahip değil.
          </p>
          <p className="text-xs text-slate-500">
            Eğer bu bir hata olduğunu düşünüyorsan owner ile iletişime geç.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Çıkış yap
            </button>
          </form>
          <Link
            href="/login"
            className="block text-xs text-slate-500 hover:text-slate-700"
          >
            Farklı hesapla giriş yap
          </Link>
        </div>
      </div>
    </main>
  );
}
