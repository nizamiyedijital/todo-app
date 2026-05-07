import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from './src/theme/ThemeProvider';
import RootNavigator, { navigationRef } from './src/navigation/RootNavigator';
import { initPostHog } from './src/lib/posthog';
import { configureCrisp } from './src/lib/crisp';
import { markAutomationSeen } from './src/lib/automations';

/**
 * Faz 5.B.4.2: notification tap → deeplink. Push'a basınca app açılır,
 * bildirimin data.deeplink'i okunur, ilgili Stack screen'ine yönlendirilir.
 * data.execution_id varsa server'a "görüldü" işaretle (banner duplicate olmasın).
 */
function handleNotificationDeeplink(data: Record<string, unknown> | null | undefined) {
  if (!data) return;
  const deeplink = typeof data.deeplink === 'string' ? data.deeplink : null;
  const executionId =
    typeof data.execution_id === 'number' ? data.execution_id : Number(data.execution_id ?? 0);
  if (executionId > 0) {
    void markAutomationSeen(executionId);
  }
  if (!deeplink || !navigationRef.isReady()) return;
  if (deeplink.startsWith('/weekly')) {
    navigationRef.navigate('App' as never, { screen: 'Weekly' } as never);
  } else if (deeplink.startsWith('/stats')) {
    navigationRef.navigate('App' as never, { screen: 'Stats' } as never);
  } else if (deeplink.startsWith('/')) {
    navigationRef.navigate('App' as never, { screen: 'Tasks' } as never);
  }
}

export default function App() {
  // PostHog + Crisp'i uygulama mount'ta tek seferlik init et
  useEffect(() => {
    initPostHog();
    configureCrisp();

    // Faz 5.B.4.2: notification tap handler
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationDeeplink(
        response.notification.request.content.data as Record<string, unknown> | null,
      );
    });

    // App push ile başlatıldı mı? (cold start)
    Notifications.getLastNotificationResponseAsync().then(r => {
      if (r) {
        handleNotificationDeeplink(
          r.notification.request.content.data as Record<string, unknown> | null,
        );
      }
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
