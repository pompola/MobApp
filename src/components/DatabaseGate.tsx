import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDatabase } from '../context/DatabaseContext';

/** Показывает загрузку / ошибку, пока база данных не готова. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { isLoading, isReady, error, retry } = useDatabase();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.text}>Подготовка базы данных…</Text>
      </View>
    );
  }

  if (error || !isReady) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Ошибка базы данных</Text>
        <Text style={styles.text}>
          {error?.message ?? 'Не удалось подключиться к базе данных.'}
        </Text>
        <Pressable style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#b00020' },
  text: { fontSize: 15, color: '#334155', textAlign: 'center' },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
