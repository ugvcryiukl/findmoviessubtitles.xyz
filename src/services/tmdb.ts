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

export async function getTrendingMedia(type: 'all' | 'movie' | 'tv' = 'all'): Promise<TMDBMedia[]> {
  const apiKey = getApiKey();
  const fallback = () => getMockPopularList().filter(item => type === 'all' || item.media_type === type).slice(0, 12);
  if (!apiKey) return fallback();

  try {
    const res = await fetch(`${TMDB_BASE_URL}/trending/${type}/day?api_key=${apiKey}`);
    if (!res.ok) throw new Error(`TMDB Trending error: ${res.status}`);
    const data = await res.json();
    return (data.results || [])
      .filter((item: { media_type?: string }) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 12) as TMDBMedia[];
  } catch (error) {
    console.error('Error fetching TMDB trending:', error);
    return fallback();
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

export async function getPopularMovies(page = 1): Promise<TMDBMedia[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&page=${page}`);
    if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((item: Record<string, unknown>) => ({ ...item, media_type: 'movie' })) as TMDBMedia[];
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
}

export async function getPopularTVShows(page = 1): Promise<TMDBMedia[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  try {
    const res = await fetch(`${TMDB_BASE_URL}/tv/popular?api_key=${apiKey}&page=${page}`);
    if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((item: Record<string, unknown>) => ({ ...item, media_type: 'tv' })) as TMDBMedia[];
  } catch (error) {
    console.error('Error fetching popular TV shows:', error);
    return [];
  }
}

export async function getTopRatedMovies(page = 1): Promise<TMDBMedia[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${apiKey}&page=${page}`);
    if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((item: Record<string, unknown>) => ({ ...item, media_type: 'movie' })) as TMDBMedia[];
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    return [];
  }
}

export async function getTopRatedTVShows(page = 1): Promise<TMDBMedia[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  try {
    const res = await fetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${apiKey}&page=${page}`);
    if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((item: Record<string, unknown>) => ({ ...item, media_type: 'tv' })) as TMDBMedia[];
  } catch (error) {
    console.error('Error fetching top rated TV shows:', error);
    return [];
  }
}

export async function getBrowseMedia(mode: 'top-rated' | 'popular'): Promise<{ results: TMDBMedia[]; isDemo: boolean }> {
  const [movies, shows] = await Promise.all(mode === 'top-rated'
    ? [getTopRatedMovies(), getTopRatedTVShows()]
    : [getPopularMovies(), getPopularTVShows()]);
  const isDemo = movies.length === 0 || shows.length === 0;
  const samples = getMockPopularList();
  const results = [
    ...(movies.length ? movies : samples.filter(item => item.media_type === 'movie')),
    ...(shows.length ? shows : samples.filter(item => item.media_type === 'tv')),
  ];
  if (mode === 'top-rated') results.sort((a, b) => b.vote_average - a.vote_average);
  return { results, isDemo };
}

export function getMockPopularList(): TMDBMedia[] {
  return [
    { id: 1396, title: 'Breaking Bad', name: 'Breaking Bad', media_type: 'tv', first_air_date: '2008-01-20', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.9 },
    { id: 1399, title: 'Game of Thrones', name: 'Game of Thrones', media_type: 'tv', first_air_date: '2011-04-17', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 66732, title: 'Stranger Things', name: 'Stranger Things', media_type: 'tv', first_air_date: '2016-07-15', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.6 },
    { id: 27205, title: 'Inception', media_type: 'movie', release_date: '2010-07-15', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 157336, title: 'Interstellar', media_type: 'movie', release_date: '2014-11-05', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.3 },
    { id: 155, title: 'The Dark Knight', media_type: 'movie', release_date: '2008-07-16', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.5 },
    { id: 680, title: 'Pulp Fiction', media_type: 'movie', release_date: '1994-09-10', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.9 },
    { id: 238, title: 'The Godfather', media_type: 'movie', release_date: '1972-03-14', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.7 },
    { id: 550, title: 'Fight Club', media_type: 'movie', release_date: '1999-10-15', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 603, title: 'The Matrix', media_type: 'movie', release_date: '1999-03-30', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.2 },
    { id: 13, title: 'Forrest Gump', media_type: 'movie', release_date: '1994-07-06', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.5 },
    { id: 1668, title: 'Friends', name: 'Friends', media_type: 'tv', first_air_date: '1994-09-22', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 2316, title: 'The Office', name: 'The Office', media_type: 'tv', first_air_date: '2005-03-24', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.6 },
    { id: 60625, title: 'Rick and Morty', name: 'Rick and Morty', media_type: 'tv', first_air_date: '2013-12-02', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.7 },
    { id: 42009, title: 'Black Mirror', name: 'Black Mirror', media_type: 'tv', first_air_date: '2011-12-04', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.3 },
    { id: 60059, title: 'Better Call Saul', name: 'Better Call Saul', media_type: 'tv', first_air_date: '2015-02-08', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.6 },
    { id: 19995, title: 'Avatar', media_type: 'movie', release_date: '2009-12-10', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.6 },
    { id: 597, title: 'Titanic', media_type: 'movie', release_date: '1997-11-18', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.9 },
    { id: 11, title: 'Star Wars', media_type: 'movie', release_date: '1977-05-25', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.2 },
    { id: 120, title: 'The Lord of the Rings: The Fellowship of the Ring', media_type: 'movie', release_date: '2001-12-18', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 324857, title: 'Spider-Man: Into the Spider-Verse', media_type: 'movie', release_date: '2018-12-06', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 496243, title: 'Parasite', media_type: 'movie', release_date: '2019-05-30', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.5 },
    { id: 299534, title: 'Avengers: Endgame', media_type: 'movie', release_date: '2019-04-24', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.3 },
    { id: 475554, title: 'Joker', media_type: 'movie', release_date: '2019-10-02', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.2 },
    { id: 98, title: 'Gladiator', media_type: 'movie', release_date: '2000-05-01', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.2 },
    { id: 24428, title: 'Whiplash', media_type: 'movie', release_date: '2014-10-10', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 11324, title: 'Shutter Island', media_type: 'movie', release_date: '2010-02-14', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.2 },
    { id: 807, title: 'Se7en', media_type: 'movie', release_date: '1995-09-22', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 278, title: 'The Shawshank Redemption', media_type: 'movie', release_date: '1994-09-23', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.7 },
    { id: 1422, title: 'The Departed', media_type: 'movie', release_date: '2006-10-05', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.2 },
    { id: 63351, title: 'Narcos', name: 'Narcos', media_type: 'tv', first_air_date: '2015-08-28', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.0 },
    { id: 87108, title: 'Chernobyl', name: 'Chernobyl', media_type: 'tv', first_air_date: '2019-05-06', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.6 },
    { id: 100088, title: 'The Last of Us', name: 'The Last of Us', media_type: 'tv', first_air_date: '2023-01-15', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.6 },
    { id: 76331, title: 'Succession', name: 'Succession', media_type: 'tv', first_air_date: '2018-06-03', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.3 },
    { id: 76479, title: 'The Boys', name: 'The Boys', media_type: 'tv', first_air_date: '2019-07-25', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.5 },
    { id: 93405, title: 'Squid Game', name: 'Squid Game', media_type: 'tv', first_air_date: '2021-09-17', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.8 },
    { id: 70523, title: 'Dark', name: 'Dark', media_type: 'tv', first_air_date: '2017-12-01', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 1429, title: 'Attack on Titan', name: 'Attack on Titan', media_type: 'tv', first_air_date: '2013-04-07', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.7 },
    { id: 30061, title: 'Death Note', name: 'Death Note', media_type: 'tv', first_air_date: '2006-10-04', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.7 },
    { id: 31964, title: 'Fullmetal Alchemist: Brotherhood', name: 'Fullmetal Alchemist: Brotherhood', media_type: 'tv', first_air_date: '2009-04-05', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.7 },
    { id: 82856, title: 'The Mandalorian', name: 'The Mandalorian', media_type: 'tv', first_air_date: '2019-11-12', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.4 },
    { id: 60574, title: 'Peaky Blinders', name: 'Peaky Blinders', media_type: 'tv', first_air_date: '2013-09-12', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.5 },
    { id: 71446, title: 'Money Heist', name: 'Money Heist', media_type: 'tv', first_air_date: '2017-05-02', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.2 },
    { id: 284054, title: 'Black Panther', media_type: 'movie', release_date: '2018-02-13', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.4 },
    { id: 438631, title: 'Dune', media_type: 'movie', release_date: '2021-09-15', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.8 },
    { id: 872585, title: 'Oppenheimer', media_type: 'movie', release_date: '2023-07-19', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.1 },
    { id: 346698, title: 'Barbie', media_type: 'movie', release_date: '2023-07-19', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.1 },
    { id: 634649, title: 'Spider-Man: No Way Home', media_type: 'movie', release_date: '2021-12-15', poster_path: null, backdrop_path: null, overview: '', vote_average: 8.0 },
    { id: 414906, title: 'The Batman', media_type: 'movie', release_date: '2022-03-01', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.7 },
    { id: 361743, title: 'Top Gun: Maverick', media_type: 'movie', release_date: '2022-05-24', poster_path: null, backdrop_path: null, overview: '', vote_average: 7.6 }
  ];
}

export interface HeroBackdropItem {
  id: number;
  imdbId: string;
  title: string;
  backdropUrl: string;
  mediaType: 'movie';
  year: string;
}

// Curated pre-2000 members of https://www.imdb.com/chart/top/.
// Membership checked 2026-10-10; this is a selection, not a live copy of the chart.
// Artwork and TMDB IDs verified through Cinemeta's public movie metadata.
export const VINTAGE_HERO_BACKDROPS: HeroBackdropItem[] =[
  {
    "id": 3082,
    "imdbId": "tt0027977",
    "title": "Modern Times",
    "year": "1936",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0027977/img"
  },
  {
    "id": 289,
    "imdbId": "tt0034583",
    "title": "Casablanca",
    "year": "1942",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0034583/img"
  },
  {
    "id": 567,
    "imdbId": "tt0047396",
    "title": "Rear Window",
    "year": "1954",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0047396/img"
  },
  {
    "id": 346,
    "imdbId": "tt0047478",
    "title": "Seven Samurai",
    "year": "1954",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0047478/img"
  },
  {
    "id": 389,
    "imdbId": "tt0050083",
    "title": "12 Angry Men",
    "year": "1957",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0050083/img"
  },
  {
    "id": 539,
    "imdbId": "tt0054215",
    "title": "Psycho",
    "year": "1960",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0054215/img"
  },
  {
    "id": 429,
    "imdbId": "tt0060196",
    "title": "The Good, the Bad and the Ugly",
    "year": "1966",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0060196/img"
  },
  {
    "id": 238,
    "imdbId": "tt0068646",
    "title": "The Godfather",
    "year": "1972",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0068646/img"
  },
  {
    "id": 240,
    "imdbId": "tt0071562",
    "title": "The Godfather Part II",
    "year": "1974",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0071562/img"
  },
  {
    "id": 278,
    "imdbId": "tt0111161",
    "title": "The Shawshank Redemption",
    "year": "1994",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0111161/img"
  },
  {
    "id": 680,
    "imdbId": "tt0110912",
    "title": "Pulp Fiction",
    "year": "1994",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0110912/img"
  },
  {
    "id": 424,
    "imdbId": "tt0108052",
    "title": "Schindler's List",
    "year": "1993",
    "mediaType": "movie",
    "backdropUrl": "https://images.metahub.space/background/medium/tt0108052/img"
  }
];

export function pickNextHeroBackdrop(pool: HeroBackdropItem[], previousId?: number): HeroBackdropItem | undefined {
  const different = pool.filter(item => item.id !== previousId);
  const candidates = different.length ? different : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function getHeroBackdropPool(): Promise<HeroBackdropItem[]> {
  return VINTAGE_HERO_BACKDROPS;
}