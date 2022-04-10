export interface SpotifyTrack {
  id: string;
  name: string;
  album: {
    name: string;
    images: { url: string; height?: number; width?: number }[];
    uri?: string;
  };
  artists: {
    name: string;
    uri?: string;
  }[];
  uri: string;
  popularity?: number;
  duration_ms?: number;
}
