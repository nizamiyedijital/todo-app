import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AppStack from './AppStack';
import ListSidebar from '../components/ListSidebar';
import { useTheme } from '../theme/ThemeProvider';

const Drawer = createDrawerNavigator();

export default function AppDrawer() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: 280, backgroundColor: colors.surface },
        swipeEdgeWidth: 40,
      }}
      drawerContent={(props) => <ListSidebar {...props} />}
    >
      <Drawer.Screen name="App" component={AppStack} />
    </Drawer.Navigator>
  );
}
