export interface SearchSuggestion {
  id: string;
  tmdbId: number;
  subsourceId: number | null;
  type: 'movie' | 'tv';
  title: string;
  year: string;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  source: 'tmdb' | 'subsource';
}
