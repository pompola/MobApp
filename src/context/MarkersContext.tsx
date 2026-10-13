import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from 'react';

import type { MapMarker, MarkerImage } from '../types';

interface MarkersContextType {
  markers: MapMarker[];
  addMarker: (latitude: number, longitude: number) => string;
  renameMarker: (markerId: string, name: string) => void;
  removeMarker: (markerId: string) => void;
  addImage: (markerId: string, image: MarkerImage) => void;
  removeImage: (markerId: string, imageId: string) => void;
}

const MarkersContext = createContext<MarkersContextType | undefined>(undefined);

export function MarkersProvider({ children }: { children: ReactNode }) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  const addMarker = (latitude: number, longitude: number): string => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMarkers((previous) => [
      ...previous,
      { id, name: `Место ${previous.length + 1}`, latitude, longitude, images: [] },
    ]);
    return id;
  };

  const renameMarker = (markerId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setMarkers((previous) => previous.map((marker) =>
      marker.id === markerId ? { ...marker, name: cleanName } : marker
    ));
  };

  const removeMarker = (markerId: string) => {
    setMarkers((previous) => previous.filter((marker) => marker.id !== markerId));
  };

  const addImage = (markerId: string, image: MarkerImage) => {
    setMarkers((previous) => previous.map((marker) =>
      marker.id === markerId ? { ...marker, images: [...marker.images, image] } : marker
    ));
  };

  const removeImage = (markerId: string, imageId: string) => {
    setMarkers((previous) => previous.map((marker) =>
      marker.id === markerId
        ? { ...marker, images: marker.images.filter((image) => image.id !== imageId) }
        : marker
    ));
  };

  return (
    <MarkersContext.Provider value={{ markers, addMarker, renameMarker, removeMarker, addImage, removeImage }}>
      {children}
    </MarkersContext.Provider>
  );
}

export function useMarkers() {
  const context = useContext(MarkersContext);
  if (!context) throw new Error('useMarkers должен использоваться внутри MarkersProvider');
  return context;
}
