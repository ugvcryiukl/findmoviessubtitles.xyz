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
  full_season?: number; // 1 for full season subtitles
  unpack?: number;      // 1 to unpack season zip archive
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
  fullSeason?: boolean;
  episode_from?: number;
  episode_end?: number;
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
    subs_per_page: '30'
  });

  if (params.imdb_id) queryParams.append('imdb_id', params.imdb_id);
  else if (params.tmdb_id) queryParams.append('tmdb_id', String(params.tmdb_id));
  else if (params.film_name) queryParams.append('film_name', params.film_name);

  // If a specific language is requested (and not 'all'), filter by it. Otherwise leave empty to fetch all languages!
  if (params.languages && params.languages.toLowerCase() !== 'all') {
    const formattedLangs = params.languages
      .split(',')
      .map(lang => lang.trim().toLowerCase())
      .filter(Boolean)
      .join(',');
    if (formattedLangs) {
      queryParams.append('languages', formattedLangs);
    }
  }

  if (params.type) {
    queryParams.append('type', params.type === 'tv' ? 'tv' : 'movie');
  }

  if (params.type === 'tv') {
    if (params.season_number !== undefined) queryParams.append('season_number', String(params.season_number));
    if (params.full_season === 1) {
      queryParams.append('full_season', '1');
      queryParams.append('unpack', '1');
    } else {
      if (params.episode_number !== undefined) queryParams.append('episode_number', String(params.episode_number));
    }
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

    const rawSubtitles = [...(data.subtitles as RawSubdlSubtitle[])];

    // Fetch subsequent pages in parallel (up to 8 pages = 240 subtitles) to ensure all subtitles are retrieved
    const totalPages = Math.min(data.totalPages || 1, 8);
    if (totalPages > 1) {
      const pagePromises = [];
      for (let p = 2; p <= totalPages; p++) {
        const pageParams = new URLSearchParams(queryParams);
        pageParams.set('page', String(p));
        pagePromises.push(
          fetch(`${SUBDL_BASE_URL}?${pageParams.toString()}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => (d && d.subtitles ? (d.subtitles as RawSubdlSubtitle[]) : []))
            .catch(() => [] as RawSubdlSubtitle[])
        );
      }
      const additionalPages = await Promise.all(pagePromises);
      for (const pageSubs of additionalPages) {
        rawSubtitles.push(...pageSubs);
      }
    }

    return rawSubtitles
      .filter(item => {
        // Renders season packs check if needed
        if (params.type === 'tv' && params.full_season !== 1 && item.episode_from !== item.episode_end) {
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

        const isFull = params.full_season === 1 || (item.episode_from !== undefined && item.episode_end !== undefined && item.episode_from !== item.episode_end);

        const author = item.author || 'Unknown';
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
          source: 'subdl',
          fullSeason: isFull,
          episode_from: item.episode_from,
          episode_end: item.episode_end
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
