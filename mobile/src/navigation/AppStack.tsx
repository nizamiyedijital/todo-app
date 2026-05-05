import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import TasksScreen from '../screens/TasksScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
