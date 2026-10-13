export interface MarkerImage {
  id: string;
  uri: string;
  name?: string;
}

export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  images: MarkerImage[];
}

export interface MarkerRouteParams {
  id: string;
  latitude: string;
  longitude: string;
}