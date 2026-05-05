import { redirect } from 'next/navigation';

export default function Home() {
  // Root URL → /admin'e yönlendir (admin sayfaları kendi auth kontrolünü yapar)
  redirect('/admin');
}
