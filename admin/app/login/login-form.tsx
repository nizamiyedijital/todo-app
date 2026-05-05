'use client';

import { useActionState } from 'react';
import { signInAction, type SignInState } from './actions';

const initialState: SignInState = { ok: false };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? '/admin'} />

      <div className="space-y-1">
        <label htmlFor="email" className="text-xs font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#12A3E3] focus:ring-2 focus:ring-[#12A3E3]/20 outline-none disabled:opacity-60"
          placeholder="ornek@disiplan.app"
        />
        {state.errors?.email?.map((msg) => (
          <p key={msg} className="text-xs text-red-600">
            {msg}
          </p>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-xs font-medium text-slate-700">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          disabled={isPending}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#12A3E3] focus:ring-2 focus:ring-[#12A3E3]/20 outline-none disabled:opacity-60"
          placeholder="••••••••"
        />
        {state.errors?.password?.map((msg) => (
          <p key={msg} className="text-xs text-red-600">
            {msg}
          </p>
        ))}
      </div>

      {state.errors?.form && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {state.errors.form.join(' ')}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg bg-[#12A3E3] text-white text-sm font-medium hover:bg-[#0e87bf] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
