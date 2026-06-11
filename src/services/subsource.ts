const SUBSOURCE_BASE_URL = 'https://api.subsource.net/api/v1';

function getApiKey() {
  const key = process.env.SUBSOURCE_API_KEY;
  if (!key || key === 'your_subsource_api_key_here') {
    console.warn('SUBSOURCE_API_KEY is not configured or using placeholder');
    return null;
  }
  return key;
}

export interface SubsourceMovieResult {
  movieId: number;
  title: string;
  releaseYear: string;
  alternateTitle?: string;
}

export interface SubsourceSubtitleItem {
  subtitleId: number;
  link: string; // page link
  language: string;
  release_name: string; // mapped from releaseInfo list
  hearingImpaired: boolean;
  foreignParts: boolean;
  commentary?: string;
  uploader: string; // displayname from uploaderId contributor
  source: 'subsource';
}

export interface SubsourceContributor {
  id: number;
  displayname: string;
}

export interface RawSubsourceSubtitle {
  subtitleId: number;
  link?: string;
  language?: string;
  releaseInfo?: string[];
  hearingImpaired?: boolean;
  foreignParts?: boolean;
  commentary?: string;
  uploaderId?: number;
  contributors?: SubsourceContributor[];
}

export async function searchSubsourceMovie(title: string, imdbId?: string): Promise<number | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const params: Record<string, string> = { api_key: apiKey };

    if (imdbId) {
      params.searchType = 'imdb';
      params.imdb = imdbId;
    } else {
      params.searchType = 'text';
      params.q = title.toLowerCase();
    }

    const queryParams = new URLSearchParams(params);
    const res = await fetch(`${SUBSOURCE_BASE_URL}/movies/search?${queryParams.toString()}`);
    if (!res.ok) throw new Error(`SubSource search API error: ${res.status}`);

    const data = await res.json();
    const results = data.data as SubsourceMovieResult[];

    if (!results || results.length === 0) {
      // Fallback to text search if IMDb search failed and we have title
      if (imdbId && title) {
        console.log(`SubSource: No results for IMDb ID ${imdbId}. Falling back to text search for: ${title}`);
        return searchSubsourceMovie(title);
      }
      return null;
    }

    // Try to find the exact match by release year if searching by title
    // For simplicity, returning the first result ID
    return results[0].movieId;
  } catch (error) {
    console.error('Error searching movie on SubSource:', error);
    return null;
  }
}

export async function fetchSubsourceSubtitles(
  movieId: number,
  language: string,
  season?: number,
  episode?: number
): Promise<SubsourceSubtitleItem[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log('Using mock SubSource data (no API key configured)');
    return getMockSubtitles(language, season, episode);
  }

  try {
    const params: Record<string, string> = {
      api_key: apiKey,
      movieId: String(movieId),
      language: language.toLowerCase(),
      limit: '100'
    };

    if (season !== undefined) params.seasonNumber = String(season);
    if (episode !== undefined) params.episodeNumber = String(episode);

    const queryParams = new URLSearchParams(params);
    const res = await fetch(`${SUBSOURCE_BASE_URL}/subtitles?${queryParams.toString()}`);
    if (!res.ok) throw new Error(`SubSource subtitles API error: ${res.status}`);

    const data = await res.json();
    if (!data.success || !data.data) {
      return [];
    }

    const rawSubtitles = data.data as RawSubsourceSubtitle[];

    return rawSubtitles.map(item => {
      // Extract uploader name
      let uploader = 'Unknown';
      if (item.contributors && Array.isArray(item.contributors)) {
        const uploaderItem = item.contributors.find(
          (c: SubsourceContributor) => c.id === item.uploaderId
        );
        if (uploaderItem) {
          uploader = uploaderItem.displayname;
        }
      }

      // Format release name
      const releases = item.releaseInfo || [];
      const release_name = releases.length > 0 ? releases[0] : `Subtitle #${item.subtitleId}`;

      return {
        subtitleId: item.subtitleId,
        link: item.link || '',
        language: item.language || 'English',
        release_name,
        hearingImpaired: !!item.hearingImpaired,
        foreignParts: !!item.foreignParts,
        commentary: item.commentary,
        uploader,
        source: 'subsource'
      };
    });
  } catch (error) {
    console.error('Error fetching subtitles from SubSource:', error);
    return [];
  }
}

// Proxies download endpoint to keep api key hidden
export async function downloadSubsourceSubtitle(subtitleId: number): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('SUBSOURCE_API_KEY is not configured');
  }

  const url = `${SUBSOURCE_BASE_URL}/subtitles/${subtitleId}/download?api_key=${apiKey}`;
  const res = await fetch(url, { method: 'GET' });
  return res;
}

function getMockSubtitles(language: string, season?: number, episode?: number): SubsourceSubtitleItem[] {
  const label = season !== undefined ? `S${season}E${episode}` : 'Movie';
  return [
    {
      subtitleId: 98765,
      link: `/subtitles/98765`,
      language: language.charAt(0).toUpperCase() + language.slice(1),
      release_name: season !== undefined
        ? `Breaking.Bad.${label}.1080p.NF.WEBRip.DDP5.1.x264-Ao`
        : 'Inception.2010.1080p.BluRay.x264.DTS-FGT',
      hearingImpaired: false,
      foreignParts: false,
      commentary: 'Perfect sync for Netflix / WebRip releases.',
      uploader: 'SubSourceLegend',
      source: 'subsource'
    },
    {
      subtitleId: 98766,
      link: `/subtitles/98766`,
      language: language.charAt(0).toUpperCase() + language.slice(1),
      release_name: season !== undefined
        ? `Breaking.Bad.${label}.720p.NF.WEBRip.x264`
        : 'Inception.2010.REPACK.1080p.BluRay.x264-METIS',
      hearingImpaired: true,
      foreignParts: false,
      commentary: 'HI / SDH captions. Corrected formatting.',
      uploader: 'TranslatorPro',
      source: 'subsource'
    }
  ];
}
