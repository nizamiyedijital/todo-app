import { supabase } from './supabase';
import { dpEvent, dpIdentify, dpReset } from './posthog';
import { fetchAndApplySubscription } from './subscription';
import { crispIdentify, crispReset } from './crisp';
import { unregisterPushToken } from './push';
import { useStore } from '../state/store';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    dpIdentify(data.user.id, { email: data.user.email });
    dpEvent('user_logged_in', { method: 'email' });
    crispIdentify({ id: data.user.id, email: data.user.email ?? null });
    // subscription_status person property + global state — sessizce, login akışını engellemesin
    void fetchAndApplySubscription(data.user.id);
  }
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  dpEvent('user_signed_up', { method: 'email' });
  return data;
}

export async function signOut() {
  dpEvent('user_logged_out');
  // Faz 5.B.3: bu cihazın push tokenını sil — kullanıcı çıktıktan sonra push gelmesin
  await unregisterPushToken();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  dpReset();
  crispReset();
  useStore.getState().setSubscription({ plan_code: 'free', status: 'free', is_pro: false });
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export type MfaFactor = { id: string; friendly_name: string | null; status: string; factor_type: string };

export async function listMfaFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.all ?? []) as unknown as MfaFactor[];
}

export async function hasVerifiedTotp(): Promise<{ has: boolean; factorId?: string }> {
  try {
    const factors = await listMfaFactors();
    const f = factors.find(x => x.factor_type === 'totp' && x.status === 'verified');
    return { has: !!f, factorId: f?.id };
  } catch {
    return { has: false };
  }
}

export async function mfaChallenge(factorId: string) {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data;
}

export async function mfaVerify(factorId: string, challengeId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw error;
  return data;
}
