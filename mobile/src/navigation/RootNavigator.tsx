import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import AppDrawer from './AppDrawer';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { loadAll } from '../lib/data';
import { startRealtime, stopRealtime } from '../lib/realtime';
import { fetchAndApplySubscription } from '../lib/subscription';
import { dpIdentify } from '../lib/posthog';
import { crispIdentify } from '../lib/crisp';
import { runEventAutomations } from '../lib/automations';

export default function RootNavigator() {
  const { colors } = useTheme();
  const session = useStore(s => s.session);
  const setSession = useStore(s => s.setSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [setSession]);

  useEffect(() => {
    if (session?.user) {
      // Session restore'da identify + subscription fetch (web initApp pattern'i)
      dpIdentify(session.user.id, { email: session.user.email });
      crispIdentify({ id: session.user.id, email: session.user.email ?? null });
      void fetchAndApplySubscription(session.user.id);
      loadAll()
        .then(() => runEventAutomations('login', { userId: session.user.id }))
        .catch((e) => console.warn('[data] load error', e));
      startRealtime();
      return () => { stopRealtime(); };
    }
  }, [session]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppDrawer /> : <AuthStack />}
    </NavigationContainer>
  );
}
