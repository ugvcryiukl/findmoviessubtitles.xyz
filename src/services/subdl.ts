const SUBDL_BASE_URL = 'https://api.subdl.com/api/v1/subtitles';

function getApiKey() {
  const key = process.env.SUBDL_API_KEY;
  if (!key || key === 'your_subdl_api_key_here') {
    console.warn('SUBDL_API_KEY is not configured or using placeholder');
    return null;
  }
  return key;
}

export interface SubdlQueryParams {
  imdb_id?: string;
  tmdb_id?: number;
  film_name?: string;
  languages?: string; // Comma-separated full names e.g., 'english,french'
  type?: 'movie' | 'tv';
  season_number?: number;
  episode_number?: number;
}

export interface SubdlSubtitleItem {
  release_name: string;
  language: string;
  author: string;
  comment: string;
  hi: boolean;
  download_url: string; // Combined full dl.subdl.com link
  page_url: string;     // Combined subdl.com page link
  season?: number;
  episode?: number;
  source: 'subdl';
}

export interface RawSubdlSubtitle {
  url?: string;
  subtitlePage?: string;
  author?: string;
  releases?: string[];
  name?: string;
  language?: string;
  comment?: string;
  hi?: boolean | number;
  season?: number;
  episode?: number;
  episode_from?: number;
  episode_end?: number;
}

export async function fetchSubdlSubtitles(params: SubdlQueryParams): Promise<SubdlSubtitleItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('Using mock SubDL data (no API key configured)');
    return getMockSubtitles(params);
  }

  const queryParams = new URLSearchParams({
    api_key: apiKey,
    comment: '1',
    releases: '1',
    bazarr: '1',
    subs_per_page: '100'
  });

  if (params.imdb_id) queryParams.append('imdb_id', params.imdb_id);
  else if (params.tmdb_id) queryParams.append('tmdb_id', String(params.tmdb_id));
  else if (params.film_name) queryParams.append('film_name', params.film_name);

  if (params.languages) {
    // SubDL API wants lowercase comma-separated list of full language names
    const formattedLangs = params.languages
      .split(',')
      .map(lang => lang.trim().toLowerCase())
      .join(',');
    queryParams.append('languages', formattedLangs);
  }

  if (params.type) {
    queryParams.append('type', params.type === 'tv' ? 'tv' : 'movie');
  }

  if (params.type === 'tv') {
    if (params.season_number !== undefined) queryParams.append('season_number', String(params.season_number));
    if (params.episode_number !== undefined) queryParams.append('episode_number', String(params.episode_number));
  }

  try {
    const url = `${SUBDL_BASE_URL}?${queryParams.toString()}`;
    const res = await fetch(url);

    if (res.status === 429) {
      console.warn('SubDL API rate limit exceeded');
      throw new Error('SubDL rate limit exceeded');
    }
    if (!res.ok) {
      throw new Error(`SubDL API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.status || !data.subtitles) {
      if (data.error && data.error.toLowerCase().includes("can't find")) {
        console.log(`SubDL: No subtitles found for ${params.imdb_id || params.film_name}`);
        return [];
      }
      console.warn('SubDL returned empty or error status:', data);
      return [];
    }

    const rawSubtitles = data.subtitles as RawSubdlSubtitle[];

    return rawSubtitles
      .filter(item => {
        // Renders season packs check if needed
        if (params.type === 'tv' && item.episode_from !== item.episode_end) {
          // Ignore packs if searching for a single episode
          return false;
        }
        return true;
      })
      .map(item => {
        // Construct clean download link
        // Some items return relative URL like "/subtitle/sd123/...", some full.
        const rawUrl = item.url || '';
        const download_url = rawUrl.startsWith('http')
          ? rawUrl
          : `https://dl.subdl.com${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

        const rawPage = item.subtitlePage || '';
        const page_url = rawPage.startsWith('http')
          ? rawPage
          : `https://subdl.com${rawPage.startsWith('/') ? '' : '/'}${rawPage}`;

        // Get uploader name
        const author = item.author || 'Unknown';
        
        // Get release names list
        const releases = item.releases || [];
        const release_name = releases.length > 0 ? releases[0] : item.name || 'Unknown Release';

        return {
          release_name,
          language: item.language || 'English',
          author,
          comment: item.comment || '',
          hi: !!item.hi,
          download_url,
          page_url,
          season: item.season,
          episode: item.episode,
          source: 'subdl'
        };
      });
  } catch (error) {
    console.error('Error fetching SubDL subtitles:', error);
    return [];
  }
}

function getMockSubtitles(params: SubdlQueryParams): SubdlSubtitleItem[] {
  // Return sample subtitles based on criteria
  const isTv = params.type === 'tv';
  const label = isTv ? `S${params.season_number}E${params.episode_number}` : 'Movie';

  return [
    {
      release_name: isTv
        ? `Breaking.Bad.${label}.1080p.BluRay.x264-DEMAND`
        : 'Inception.2010.1080p.BluRay.x264.YIFY',
      language: 'English',
      author: 'GoldenBeard',
      comment: 'Sync corrected for BluRay versions.',
      hi: false,
      download_url: 'https://dl.subdl.com/subtitle/mock/en-12345.zip',
      page_url: 'https://subdl.com/subtitle/mock/en-12345',
      season: params.season_number,
      episode: params.episode_number,
      source: 'subdl'
    },
    {
      release_name: isTv
        ? `Breaking.Bad.${label}.720p.HDTV.x264-ASAP`
        : 'Inception.2010.3D.1080p.BluRay.x264-YIFY',
      language: 'English',
      author: 'SubDLBot',
      comment: 'Hearing Impaired. Sync and spellchecked.',
      hi: true,
      download_url: 'https://dl.subdl.com/subtitle/mock/en-hi-12345.zip',
      page_url: 'https://subdl.com/subtitle/mock/en-hi-12345',
      season: params.season_number,
      episode: params.episode_number,
      source: 'subdl'
    },
    {
      release_name: isTv
        ? `Breaking.Bad.${label}.1080p.BluRay.x264-DEMAND`
        : 'Inception.2010.1080p.BluRay.x264-METIS',
      language: 'Spanish',
      author: 'EspSub',
      comment: 'Traducción directa del BluRay.',
      hi: false,
      download_url: 'https://dl.subdl.com/subtitle/mock/es-12345.zip',
      page_url: 'https://subdl.com/subtitle/mock/es-12345',
      season: params.season_number,
      episode: params.episode_number,
      source: 'subdl'
    }
  ];
}
