const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

function getApiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key || key === 'your_tmdb_api_key_here') {
    console.warn('TMDB_API_KEY is not configured or using placeholder');
    return null;
  }
  return key;
}

export interface TMDBMedia {
  id: number;
  title: string;
  name?: string; // TV shows use name instead of title
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
}

export interface TMDBShowDetails extends TMDBMedia {
  genres: { id: number; name: string }[];
  runtime?: number; // movie
  episode_run_time?: number[]; // tv
  number_of_seasons?: number; // tv
  number_of_episodes?: number; // tv
  external_ids?: {
    imdb_id?: string;
    tvdb_id?: number;
  };
  seasons?: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
  }[];
}

// Renders full TMDB poster URL
export function getPosterUrl(path: string | null, size: 'w200' | 'w500' | 'original' = 'w500'): string {
  if (!path) return '/placeholder-poster.png'; // Fallback
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchMedia(query: string, page = 1): Promise<TMDBMedia[]> {
  const apiKey = getApiKey();
  if (!apiKey) return getMockSearchResults(query);

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`
    );
    if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).filter(
      (item: { media_type?: string }) => item.media_type === 'movie' || item.media_type === 'tv'
    ) as TMDBMedia[];
  } catch (error) {
    console.error('Error searching TMDB:', error);
    return [];
  }
}

export async function getMediaDetails(id: number, type: 'movie' | 'tv'): Promise<TMDBShowDetails | null> {
  const apiKey = getApiKey();
  if (!apiKey) return getMockDetails(id, type);

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/${type}/${id}?api_key=${apiKey}&append_to_response=external_ids`
    );
    if (!res.ok) throw new Error(`TMDB Details error: ${res.status}`);
    const data = await res.json();
    return data as TMDBShowDetails;
  } catch (error) {
    console.error(`Error fetching TMDB details for ${type} ${id}:`, error);
    return null;
  }
}

export async function getSeasonDetails(tvId: number, seasonNumber: number) {
  const apiKey = getApiKey();
  if (!apiKey) return getMockSeasonDetails(seasonNumber);

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}`
    );
    if (!res.ok) throw new Error(`TMDB Season error: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`Error fetching TMDB season ${seasonNumber} for show ${tvId}:`, error);
    return null;
  }
}

export async function getTrendingMedia(): Promise<TMDBMedia[]> {
  const apiKey = getApiKey();
  if (!apiKey) return getMockTrending();

  try {
    const res = await fetch(`${TMDB_BASE_URL}/trending/all/day?api_key=${apiKey}`);
    if (!res.ok) throw new Error(`TMDB Trending error: ${res.status}`);
    const data = await res.json();
    return (data.results || [])
      .filter((item: { media_type?: string }) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 12) as TMDBMedia[];
  } catch (error) {
    console.error('Error fetching TMDB trending:', error);
    return getMockTrending();
  }
}

/* ==========================================================================
   Mock Data Fallbacks (for Local Development without API Keys)
   ========================================================================== */

function getMockSearchResults(query: string): TMDBMedia[] {
  const items: TMDBMedia[] = [
    {
      id: 27205,
      title: 'Inception',
      media_type: 'movie',
      release_date: '2010-07-15',
      poster_path: null,
      backdrop_path: null,
      overview: 'Cobb, a skilled thief who steals valuable secrets from deep within the subconscious during the dream state.',
      vote_average: 8.4
    },
    {
      id: 1396,
      title: 'Breaking Bad',
      name: 'Breaking Bad',
      media_type: 'tv',
      first_air_date: '2008-01-20',
      poster_path: null,
      backdrop_path: null,
      overview: 'Walter White, a chemistry teacher, discovers that he has cancer and decides to get into the meth-making business.',
      vote_average: 8.9
    },
    {
      id: 157336,
      title: 'Interstellar',
      media_type: 'movie',
      release_date: '2014-11-05',
      poster_path: null,
      backdrop_path: null,
      overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.',
      vote_average: 8.3
    }
  ];
  return items.filter(i => (i.title || i.name || '').toLowerCase().includes(query.toLowerCase()));
}

function getMockDetails(id: number, type: 'movie' | 'tv'): TMDBShowDetails | null {
  if (type === 'movie') {
    return {
      id: id,
      title: id === 27205 ? 'Inception' : 'Mock Movie',
      media_type: 'movie',
      release_date: '2010-07-15',
      poster_path: null,
      backdrop_path: null,
      overview: 'Mock Movie Description',
      vote_average: 8.5,
      genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Sci-Fi' }],
      runtime: 148,
      external_ids: {
        imdb_id: 'tt1375666'
      }
    };
  } else {
    return {
      id: id,
      title: 'Breaking Bad',
      name: 'Breaking Bad',
      media_type: 'tv',
      first_air_date: '2008-01-20',
      poster_path: null,
      backdrop_path: null,
      overview: 'Mock TV Show Description',
      vote_average: 8.9,
      genres: [{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }],
      number_of_seasons: 5,
      number_of_episodes: 62,
      external_ids: {
        imdb_id: 'tt0903747'
      },
      seasons: [
        { id: 1, name: 'Season 1', season_number: 1, episode_count: 7, poster_path: null },
        { id: 2, name: 'Season 2', season_number: 2, episode_count: 13, poster_path: null },
        { id: 3, name: 'Season 3', season_number: 3, episode_count: 13, poster_path: null },
        { id: 4, name: 'Season 4', season_number: 4, episode_count: 13, poster_path: null },
        { id: 5, name: 'Season 5', season_number: 5, episode_count: 16, poster_path: null }
      ]
    };
  }
}

function getMockSeasonDetails(seasonNumber: number) {
  const episodes = [];
  const count = seasonNumber === 1 ? 7 : 13;
  for (let i = 1; i <= count; i++) {
    episodes.push({
      id: 1000 + i,
      name: `Episode ${i}`,
      episode_number: i,
      overview: `This is mock episode ${i} of season ${seasonNumber}.`,
      vote_average: 8.5
    });
  }
  return {
    season_number: seasonNumber,
    episodes
  };
}

function getMockTrending(): TMDBMedia[] {
  return [
    {
      id: 27205,
      title: 'Inception',
      media_type: 'movie',
      release_date: '2010-07-15',
      poster_path: null,
      backdrop_path: null,
      overview: 'Inception trending card description.',
      vote_average: 8.4
    },
    {
      id: 1396,
      title: 'Breaking Bad',
      name: 'Breaking Bad',
      media_type: 'tv',
      first_air_date: '2008-01-20',
      poster_path: null,
      backdrop_path: null,
      overview: 'Breaking Bad trending card description.',
      vote_average: 8.9
    }
  ];
}
