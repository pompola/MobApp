export interface MarkerImage {
  id: number;
  marker_id: number;
  uri: string;
  created_at: string;
}

export interface Marker {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface MarkerRouteParams {
  id: string;
  latitude: string;
  longitude: string;
}