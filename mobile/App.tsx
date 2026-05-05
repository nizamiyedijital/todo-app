import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { initPostHog } from './src/lib/posthog';

export default function App() {
  // PostHog'u uygulama mount'ta tek seferlik init et
  useEffect(() => { initPostHog(); }, []);

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
