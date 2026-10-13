
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useMarkers } from '../../context/MarkersContext';

export default function MarkerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { markers, addImage, removeImage, renameMarker, removeMarker } = useMarkers();
  const [loading, setLoading] = useState(false);
  const marker = markers.find((item) => item.id === id);
  const [placeName, setPlaceName] = useState('');

  useEffect(() => {
    if (marker) setPlaceName(marker.name);
  }, [marker?.id, marker?.name]);

  if (!marker) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Место не найдено</Text>
        <Text>Вернись на карту и выбери маркер ещё раз.</Text>
      </View>
    );
  }

  const pickImages = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Нет доступа к галерее',
          'Разреши приложению доступ к фотографиям в настройках телефона.'
        );
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      for (const asset of result.assets) {
        addImage(marker.id, {
          id: `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          uri: asset.uri,
          name: asset.fileName ?? undefined,
        });
      }
    } catch {
      Alert.alert(
        'Ошибка',
        'Не удалось выбрать изображения. Попробуй ещё раз.'
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmRemove = (imageId: string) => {
    Alert.alert(
      'Удалить изображение?',
      'Оно будет удалено из списка этого места.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => removeImage(marker.id, imageId),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Детали места</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Название места</Text>
        <TextInput
          value={placeName}
          onChangeText={setPlaceName}
          placeholder="Например, любимое кафе"
          maxLength={60}
          style={styles.nameInput}
        />
        <Pressable
          style={styles.saveButton}
          onPress={() => {
            if (!placeName.trim()) {
              Alert.alert('Введите название', 'Название места не должно быть пустым.');
              return;
            }
            renameMarker(marker.id, placeName);
            Alert.alert('Сохранено', 'Название места обновлено.');
          }}
        >
          <Text style={styles.addButtonText}>Сохранить название</Text>
        </Pressable>
        <Text style={styles.label}>Широта</Text>
        <Text style={styles.value}>
          {marker.latitude.toFixed(6)}
        </Text>

        <Text style={styles.label}>Долгота</Text>
        <Text style={styles.value}>
          {marker.longitude.toFixed(6)}
        </Text>
      </View>

      <Pressable
        style={styles.removePlaceButton}
        onPress={() => Alert.alert(
          'Удалить место?',
          `«${marker.name}» и все связанные с ним фотографии будут удалены.`,
          [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Удалить место', style: 'destructive', onPress: () => { removeMarker(marker.id); router.replace('/'); } },
          ]
        )}
      >
        <Text style={styles.removePlaceText}>Удалить место с карты</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Фотографии ({marker.images.length})</Text>

      <Pressable
        style={styles.addButton}
        onPress={pickImages}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.addButtonText}>
            + Добавить изображение
          </Text>
        )}
      </Pressable>

      {marker.images.length === 0 ? (
        <Text style={styles.empty}>
          Пока нет фотографий. Добавь первую!
        </Text>
      ) : (
        <View style={styles.gallery}>
          {marker.images.map((image) => (
            <View key={image.id} style={styles.imageCard}>
              <Image
                source={{ uri: image.uri }}
                style={styles.image}
                resizeMode="cover"
              />
              <Pressable
                style={styles.deleteButton}
                onPress={() => confirmRemove(image.id)}
              >
                <Text style={styles.deleteText}>Удалить</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#172554',
    marginBottom: 20,
  },
  card: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  nameInput: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: 16,
  },
  saveButton: {
    marginTop: 10,
    minHeight: 44,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePlaceButton: {
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
  },
  removePlaceText: { color: '#be123c', fontWeight: '700' },
  label: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  value: {
    marginTop: 4,
    fontSize: 16,
    color: '#0f172a',
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 14,
    fontSize: 20,
    fontWeight: '700',
    color: '#172554',
  },
  addButton: {
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    marginTop: 24,
    textAlign: 'center',
    color: '#64748b',
  },
  gallery: {
    marginTop: 18,
    gap: 16,
  },
  imageCard: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#e2e8f0',
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});