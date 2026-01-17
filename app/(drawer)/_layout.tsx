import { Drawer } from 'expo-router/drawer';
import { DarkColors } from '@/constants/darkTheme';
import { CustomDrawerContent } from '@/src/components/navigation/CustomDrawerContent';

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => (
        <CustomDrawerContent closeDrawer={() => props.navigation.closeDrawer()} />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: DarkColors.surface,
          width: 300,
        },
        drawerActiveBackgroundColor: DarkColors.surfaceElevated,
        drawerActiveTintColor: DarkColors.text,
        drawerInactiveTintColor: DarkColors.textSecondary,
        overlayColor: DarkColors.overlay,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="chat"
        options={{
          drawerLabel: 'Chat',
          title: 'Chat',
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
        }}
      />
    </Drawer>
  );
}
