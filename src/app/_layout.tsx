
import { Stack } from 'expo-router';
import { MarkersProvider } from '../context/MarkersContext';

export default function RootLayout() {
  return (
    <MarkersProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="marker/[id]"
          options={{
            title: 'Детали места',
            headerBackTitle: 'Карта',
          }}
        />
      </Stack>
    </MarkersProvider>
  );
}