import { SUBTITLE_LANGUAGES } from '@/lib/constants/subtitleFilters';

const OPENSUBTITLES_BASE_URL = 'https://api.opensubtitles.com/api/v1';

let cachedToken: string | null = null;
let tokenExpiryTime = 0; // timestamp in ms

export interface OpenSubtitlesSubtitleItem {
  id: string;
  provider: 'opensubtitles';
  source: 'OpenSubtitles';
  language: string;
  languageCode: string;
  releaseName: string;
  fileName: string;
  hi: boolean;
  hearingImpaired: boolean;
  downloads: number | null;
  uploader: string | null;
  movieHash: string | null;
  fileId: number | string;
  pageUrl: string | null;
  raw: unknown;
}

// Decode JWT expiry claim (exp) without requiring third-party libraries
function getTokenExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return (payload.exp * 1000) || 0; // exp is in seconds, convert to ms
  } catch {
    return 0;
  }
}

// Perform login and cache JWT token
async function getAuthToken(forceRefresh = false): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && !forceRefresh && now < tokenExpiryTime - 60000) {
    // Return cached token if not expired (with 1-minute buffer)
    return cachedToken;
  }

  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  const username = process.env.OPENSUBTITLES_USERNAME;
  const password = process.env.OPENSUBTITLES_PASSWORD;
  const userAgent = process.env.OPENSUBTITLES_USER_AGENT || 'FindMoviesSubtitles v1.0';

  if (!apiKey || apiKey === 'your_opensubtitles_api_key_here' || !username || !password) {
    console.warn('OpenSubtitles credentials not fully configured');
    return null;
  }

  try {
    console.log('Logging in to OpenSubtitles...');
    const response = await fetch(`${OPENSUBTITLES_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'User-Agent': userAgent,
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenSubtitles login failed (Status ${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    if (data.token) {
      cachedToken = data.token;
      const exp = getTokenExpiry(data.token);
      tokenExpiryTime = exp || (Date.now() + 23 * 60 * 60 * 1000); // fallback to 23 hours
      console.log('OpenSubtitles login successful. Token expires at:', new Date(tokenExpiryTime).toISOString());
      return cachedToken;
    }
    return null;
  } catch (error) {
    console.error('Error logging in to OpenSubtitles:', error);
    return null;
  }
}

export interface OpenSubtitlesSearchParams {
  imdb_id?: string;
  tmdb_id?: number;
  film_name?: string;
  languages?: string; // Comma-separated full names e.g., 'english,french'
  type?: 'movie' | 'tv';
  season_number?: number;
  episode_number?: number;
}

// Search subtitles using OpenSubtitles.com REST API
export async function fetchOpenSubtitlesSubtitles(params: OpenSubtitlesSearchParams): Promise<OpenSubtitlesSubtitleItem[]> {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey || apiKey === 'your_opensubtitles_api_key_here') {
    console.log('OpenSubtitles is disabled (no API key configured)');
    return [];
  }

  const queryParams = new URLSearchParams();

  // Handle IDs (OpenSubtitles accepts tmdb_id and imdb_id)
  if (params.imdb_id) {
    // Standardize imdb_id to include 'tt' prefix if it is purely numeric
    let imdb = params.imdb_id.trim();
    if (/^\d+$/.test(imdb)) {
      imdb = `tt${imdb.padStart(7, '0')}`;
    }
    queryParams.append('imdb_id', imdb);
  } else if (params.tmdb_id) {
    queryParams.append('tmdb_id', String(params.tmdb_id));
  } else if (params.film_name) {
    queryParams.append('query', params.film_name);
  }

  // Handle language mapping (Map full names to ISO 639-1 two-letter codes)
  if (params.languages) {
    const codes = params.languages
      .split(',')
      .map(lang => {
        const normalized = lang.trim().toLowerCase();
        const matched = SUBTITLE_LANGUAGES.find(
          l => l.label.toLowerCase() === normalized || l.aliases.some(a => a.toLowerCase() === normalized)
        );
        return matched ? matched.subsourceCode : null;
      })
      .filter((c): c is string => !!c)
      .join(',');

    if (codes) {
      queryParams.append('languages', codes);
    }
  }

  // Handle TV show specific parameters
  if (params.type) {
    if (params.type === 'tv') {
      queryParams.append('type', 'episode');
      if (params.season_number !== undefined) {
        queryParams.append('season_number', String(params.season_number));
      }
      if (params.episode_number !== undefined) {
        queryParams.append('episode_number', String(params.episode_number));
      }
    } else {
      queryParams.append('type', 'movie');
    }
  }

  const userAgent = process.env.OPENSUBTITLES_USER_AGENT || 'FindMoviesSubtitles v1.0';

  try {
    const url = `${OPENSUBTITLES_BASE_URL}/subtitles?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'User-Agent': userAgent,
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      console.warn('OpenSubtitles API rate limit exceeded');
      return [];
    }

    if (!response.ok) {
      console.error(`OpenSubtitles API error (Status ${response.status})`);
      return [];
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    const results: OpenSubtitlesSubtitleItem[] = [];

    for (const item of data.data) {
      if (item.type !== 'subtitle' || !item.attributes) continue;

      const attrs = item.attributes;
      const files = attrs.files || [];
      if (files.length === 0) continue;

      // Map language code back to full readable name for display consistency
      let displayLanguage = attrs.language || 'English';
      const matchedLang = SUBTITLE_LANGUAGES.find(
        l => l.subsourceCode.toLowerCase() === displayLanguage.toLowerCase()
      );
      if (matchedLang) {
        displayLanguage = matchedLang.label;
      } else {
        // Casing normalization
        displayLanguage = displayLanguage.charAt(0).toUpperCase() + displayLanguage.slice(1).toLowerCase();
      }

      for (const file of files) {
        const fileId = file.file_id;
        const fileName = file.file_name || attrs.release || 'subtitle.srt';
        const releaseName = attrs.release || fileName || 'Unknown Release';

        results.push({
          id: `opensubtitles-${item.id}-${fileId}`,
          provider: 'opensubtitles',
          source: 'OpenSubtitles',
          language: displayLanguage,
          languageCode: attrs.language || 'en',
          releaseName: releaseName,
          fileName: fileName,
          hi: !!attrs.hearing_impaired,
          hearingImpaired: !!attrs.hearing_impaired,
          downloads: attrs.download_count || null,
          uploader: attrs.uploader?.username || 'Unknown',
          movieHash: file.moviehash || null,
          fileId: fileId,
          pageUrl: attrs.url || null,
          raw: item
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching OpenSubtitles subtitles:', error);
    return [];
  }
}

// Request temporary download URL for a file from OpenSubtitles.com
export async function downloadOpenSubtitlesSubtitle(fileId: number | string): Promise<{ link: string; fileName: string } | null> {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  const userAgent = process.env.OPENSUBTITLES_USER_AGENT || 'FindMoviesSubtitles v1.0';

  if (!apiKey || apiKey === 'your_opensubtitles_api_key_here') {
    throw new Error('OpenSubtitles API key is not configured');
  }

  let token = await getAuthToken();
  if (!token) {
    throw new Error('Failed to authenticate with OpenSubtitles');
  }

  const makeRequest = async (tokenVal: string) => {
    return fetch(`${OPENSUBTITLES_BASE_URL}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
        'User-Agent': userAgent,
        'Authorization': `Bearer ${tokenVal}`,
      },
      body: JSON.stringify({ file_id: Number(fileId) }),
    });
  };

  try {
    let response = await makeRequest(token);

    // If 401/403 (unauthorized/token expired), retry login once
    if (response.status === 401 || response.status === 403) {
      console.warn('OpenSubtitles token rejected (401/403). Retrying login...');
      token = await getAuthToken(true);
      if (!token) {
        throw new Error('Failed to re-authenticate with OpenSubtitles');
      }
      response = await makeRequest(token);
    }

    if (response.status === 429) {
      console.warn('OpenSubtitles download limit or rate limit exceeded');
      throw new Error('OpenSubtitles download rate limit exceeded');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenSubtitles download API error (Status ${response.status}):`, errorText);
      throw new Error(`OpenSubtitles API download request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.link) {
      return {
        link: data.link,
        fileName: data.file_name || 'subtitle.srt',
      };
    }

    return null;
  } catch (error) {
    console.error('Error downloading from OpenSubtitles:', error);
    throw error;
  }
}
