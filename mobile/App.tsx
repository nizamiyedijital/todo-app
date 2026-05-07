import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { initPostHog } from './src/lib/posthog';
import { configureCrisp } from './src/lib/crisp';
import { handleNotificationDeeplink } from './src/lib/deeplink';

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
