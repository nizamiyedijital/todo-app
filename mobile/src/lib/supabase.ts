import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const URL  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!URL || !ANON) {
  console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(URL, ANON, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
