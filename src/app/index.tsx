
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useMarkers } from '../context/MarkersContext';

const INITIAL_LATITUDE = 58.010455;
const INITIAL_LONGITUDE = 56.229443;

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView(
      [${INITIAL_LATITUDE}, ${INITIAL_LONGITUDE}],
      12
    );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }
    ).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    window.updateMarkers = function(markers) {
      markersLayer.clearLayers();

      markers.forEach(function(item) {
        const redPin = L.divIcon({
          className: 'red-map-pin',
          html: '<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 1C7.7 1 1 7.7 1 16c0 11 15 25 15 25s15-14 15-25C31 7.7 24.3 1 16 1Z" fill="#e11d48" stroke="#ffffff" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="#ffffff"/></svg>',
          iconSize: [32, 42],
          iconAnchor: [16, 41],
          popupAnchor: [0, -38]
        });
        const marker = L.marker([item.latitude, item.longitude], { icon: redPin }).addTo(markersLayer);

        marker.bindPopup(item.name || 'Место на карте');

        marker.on('click', function() {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'openMarker',
              id: item.id
            })
          );
        });
      });
    };

    map.on('contextmenu', function(event) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'addMarker',
          latitude: event.latlng.lat,
          longitude: event.latlng.lng
        })
      );
    });

    // Обработка длительного нажатия на мобильных устройствах.
    let pressTimer = null;
    let pressPosition = null;

    map.on('touchstart', function(event) {
      if (!event.latlng) return;

      pressPosition = event.latlng;

      pressTimer = setTimeout(function() {
        if (pressPosition) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'addMarker',
              latitude: pressPosition.lat,
              longitude: pressPosition.lng
            })
          );
          pressPosition = null;
        }
      }, 650);
    });

    map.on('touchend touchmove', function() {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
    });

    map.whenReady(function() {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'ready' })
      );
    });
  </script>
</body>
</html>
`;

export default function MapScreen() {
  const { markers, addMarker } = useMarkers();
  const webViewRef = useRef<WebView>(null);
  const [webReady, setWebReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!webReady) return;

    const mapMarkers = markers.map((marker) => ({
      id: marker.id,
      latitude: marker.latitude,
      longitude: marker.longitude,
      name: marker.name,
    }));

    const script = `
      window.updateMarkers(${JSON.stringify(mapMarkers)});
      true;
    `;

    webViewRef.current?.injectJavaScript(script);
  }, [markers, webReady]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'ready') {
        setWebReady(true);
      }

      if (message.type === 'addMarker') {
        addMarker(message.latitude, message.longitude);
        Alert.alert(
          'Место добавлено',
          'Нажми повторно, чтобы изменить название или удалить место.'
        );
      }

      if (message.type === 'openMarker') {
        const marker = markers.find(
          (item) => item.id === message.id
        );

        if (marker) {
          router.push({
            pathname: '/marker/[id]',
            params: {
              id: marker.id,
              latitude: String(marker.latitude),
              longitude: String(marker.longitude),
            },
          });
        }
      }
    } catch (error) {
      console.error('Ошибка обработки сообщения карты:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={() => setMapError(true)}
        onHttpError={() => setMapError(true)}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Моя карта мест</Text>
        <Text style={styles.hint}>
          Нажми и удерживай место на карте, чтобы добавить метку
        </Text>
        <Text style={styles.count}>
          Добавлено мест: {markers.length}
        </Text>
      </View>

      {mapError && (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            Не удалось загрузить карту. Проверь подключение к интернету.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eeeeee',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    elevation: 4,
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    color: '#555555',
  },
  count: {
    marginTop: 8,
    fontWeight: '600',
  },
  error: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  errorText: {
    color: '#b00020',
  },
});