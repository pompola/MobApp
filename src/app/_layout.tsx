import { Stack } from 'expo-router';

import { DatabaseGate } from '../components/DatabaseGate';
import { DatabaseProvider } from '../context/DatabaseContext';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <DatabaseGate>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="marker/[id]"
            options={{
              title: 'Детали места',
              headerBackTitle: 'Карта',
            }}
          />
        </Stack>
      </DatabaseGate>
    </DatabaseProvider>
  );
}