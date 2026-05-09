export interface ImageSearchResult {
  id: string;
  previewUrl: string;
  webformatUrl: string;
}

export interface PixabayHit {
  id: number;
  previewURL: string;
  webformatURL: string;
}

export interface PixabaySearchResponse {
  hits: PixabayHit[];
}
