import { getMediaDetails } from '@/services/tmdb';
import { fetchSubdlSubtitles } from '@/services/subdl';
import { searchSubsourceMovie, fetchSubsourceSubtitles } from '@/services/subsource';
import { fetchOpenSubtitlesSubtitles } from '@/services/opensubtitles';

export interface UnifiedSubtitle {
  id: string;
  release_name: string;
  language: string;
  uploader: string;
  comment: string;
  hi: boolean;
  sources: ('subdl' | 'subsource' | 'opensubtitles')[];
  downloads: {
    subdl?: string;
    subsource?: string;
    opensubtitles?: string;
  };
  pages: {
    subdl?: string;
    subsource?: string;
    opensubtitles?: string;
  };
  fullSeason?: boolean;
  season?: number | null;
  episode?: number | null;
  episodeFrom?: number | null;
  episodeEnd?: number | null;
  unpackFiles?: unknown[] | null;
}

// Detection helper for full season subtitles
export function isFullSeasonSubtitle(
  subtitle: { release_name?: string; fullSeason?: boolean; season?: number | null },
  type?: 'movie' | 'tv'
): boolean {
  if (type === 'movie') return false;
  if (subtitle.fullSeason === true) return true;
  const name = subtitle.release_name || (subtitle as { releaseName?: string }).releaseName || "";
  const text = name.toLowerCase();

  // Do not mark normal episode subtitles like S01E01 as full season
  const hasEpisodeTag = /\be\d{1,3}\b/.test(text) || /\bep\d{1,3}\b/.test(text) || /\bepisode\s*\d{1,3}\b/.test(text);
  if (hasEpisodeTag) {
    return false;
  }

  return (
    text.includes("full season") ||
    text.includes("complete season") ||
    text.includes("season pack") ||
    text.includes("complete") ||
    /\bs\d{1,2}\b/.test(text) ||
    /season\s*\d+/i.test(text)
  );
}

// Helper to normalize release names for matching
function normalizeReleaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(srt|zip|rar|txt)$/i, '')
    .replace(/[._\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toRelativePath(urlStr: string): string {
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    try {
      const url = new URL(urlStr);
      return url.pathname + url.search;
    } catch {
      return urlStr;
    }
  }
  return urlStr.startsWith('/') ? urlStr : '/' + urlStr;
}

export async function fetchUnifiedSubtitles({
  tmdbId,
  type,
  season,
  episode,
  languagesStr = 'english,spanish,french,arabic,persian,vietnamese',
  fullSeason = false
}: {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  languagesStr?: string;
  fullSeason?: boolean;
}): Promise<{
  title: string;
  imdbId?: string;
  subtitles: UnifiedSubtitle[];
}> {
  // 1. Fetch TMDB Details to get IMDb ID and proper Title/Name
  const details = await getMediaDetails(tmdbId, type);
  if (!details) {
    throw new Error('Media details not found on TMDB');
  }

  const title = type === 'tv' ? details.name || details.title : details.title;
  const imdbId = details.external_ids?.imdb_id;
  const languages = languagesStr.split(',').map(l => l.trim().toLowerCase());

  console.log(`[fetchUnifiedSubtitles] Searching subtitles for ${title} (IMDb: ${imdbId || 'None'}, TMDB: ${tmdbId}, Full Season: ${fullSeason})`);

  // 2. Query SubDL, SubSource & OpenSubtitles simultaneously
  const subdlPromise = fetchSubdlSubtitles({
    imdb_id: imdbId,
    tmdb_id: tmdbId,
    film_name: title,
    languages: languagesStr,
    type,
    season_number: season,
    episode_number: fullSeason ? undefined : episode,
    full_season: fullSeason ? 1 : undefined,
    unpack: fullSeason ? 1 : undefined
  }).catch(err => {
    console.error('Error fetching SubDL subtitles:', err);
    return [];
  });

  const subsourcePromise = (async () => {
    try {
      const subsourceMovieId = await searchSubsourceMovie(title, imdbId);
      if (!subsourceMovieId) {
        console.log('SubSource: Movie/show ID not found');
        return [];
      }

      // Query subsource for all languages in parallel
      const subsourceResults = await Promise.all(
        languages.map(lang =>
          fetchSubsourceSubtitles(subsourceMovieId, lang, season, fullSeason ? undefined : episode).catch(err => {
            console.error(`SubSource fetch failed for lang ${lang}:`, err);
            return [];
          })
        )
      );
      
      return subsourceResults.flat();
    } catch (err) {
      console.error('Error fetching SubSource subtitles:', err);
      return [];
    }
  })();

  const opensubtitlesPromise = fetchOpenSubtitlesSubtitles({
    imdb_id: imdbId,
    tmdb_id: tmdbId,
    film_name: title,
    languages: languagesStr,
    type,
    season_number: season,
    episode_number: fullSeason ? undefined : episode
  }).catch(err => {
    console.error('Error fetching OpenSubtitles subtitles:', err);
    return [];
  });

  // Resolve all API promises
  const [subdlSubs, subsourceSubs, opensubtitlesSubs] = await Promise.all([
    subdlPromise,
    subsourcePromise,
    opensubtitlesPromise
  ]);

  // 3. Merge and Deduplicate
  const subtitleMap = new Map<string, UnifiedSubtitle>();

  const mergeSubtitle = (
    releaseName: string,
    lang: string,
    uploader: string,
    comment: string,
    hi: boolean,
    source: 'subdl' | 'subsource' | 'opensubtitles',
    downloadUrl: string,
    pageUrl: string,
    extraProps?: {
      fullSeason?: boolean;
      season?: number | null;
      episode?: number | null;
      episodeFrom?: number | null;
      episodeEnd?: number | null;
    }
  ) => {
    const normalizedRelease = normalizeReleaseName(releaseName);
    const normalizedLang = lang.trim().toLowerCase();
    // Group key: language + normalized release name
    const key = `${normalizedLang}:${normalizedRelease}`;

    // Clean standard language casing (e.g. "English")
    const languageCasing = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();

    if (subtitleMap.has(key)) {
      const existing = subtitleMap.get(key)!;
      
      // Add source if not present
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }

      // Add download URLs
      if (source === 'subdl') {
        const path = toRelativePath(downloadUrl);
        existing.downloads.subdl = `/api/download?source=subdl&path=${encodeURIComponent(path)}`;
        existing.pages.subdl = pageUrl;
      } else if (source === 'subsource') {
        existing.downloads.subsource = `/api/download?source=subsource&id=${downloadUrl}`;
        existing.pages.subsource = pageUrl;
      } else {
        existing.downloads.opensubtitles = `/api/download?source=opensubtitles&id=${downloadUrl}`;
        existing.pages.opensubtitles = pageUrl;
      }

      // Merge uploader info
      if (uploader && uploader !== 'Unknown' && !existing.uploader.includes(uploader)) {
        existing.uploader = existing.uploader === 'Unknown' ? uploader : `${existing.uploader}, ${uploader}`;
      }

      // Keep the longer or more helpful commentary
      if (comment && comment.length > existing.comment.length) {
        existing.comment = comment;
      }

      // Set HI flag if either has it
      if (hi) {
        existing.hi = true;
      }

      // Merge season/episode info
      if (extraProps?.fullSeason) {
        existing.fullSeason = true;
      }
      if (extraProps?.season !== undefined && extraProps.season !== null && !existing.season) {
        existing.season = extraProps.season;
      }
    } else {
      const unifiedSub: UnifiedSubtitle = {
        id: key,
        release_name: releaseName,
        language: languageCasing,
        uploader: uploader || 'Unknown',
        comment: comment || '',
        hi,
        sources: [source],
        downloads: {},
        pages: {},
        fullSeason: extraProps?.fullSeason || false,
        season: extraProps?.season !== undefined ? extraProps.season : null,
        episode: extraProps?.episode !== undefined ? extraProps.episode : null,
        episodeFrom: extraProps?.episodeFrom !== undefined ? extraProps.episodeFrom : null,
        episodeEnd: extraProps?.episodeEnd !== undefined ? extraProps.episodeEnd : null,
        unpackFiles: null
      };

      if (source === 'subdl') {
        // SubDL uses url path
        const path = toRelativePath(downloadUrl);
        unifiedSub.downloads.subdl = `/api/download?source=subdl&path=${encodeURIComponent(path)}`;
        unifiedSub.pages.subdl = pageUrl;
      } else if (source === 'subsource') {
        // SubSource uses ID
        unifiedSub.downloads.subsource = `/api/download?source=subsource&id=${downloadUrl}`;
        unifiedSub.pages.subsource = pageUrl;
      } else {
        // OpenSubtitles uses file ID
        unifiedSub.downloads.opensubtitles = `/api/download?source=opensubtitles&id=${downloadUrl}`;
        unifiedSub.pages.opensubtitles = pageUrl;
      }

      subtitleMap.set(key, unifiedSub);
    }
  };

  // Process SubDL subtitles
  for (const sub of subdlSubs) {
    mergeSubtitle(
      sub.release_name,
      sub.language,
      sub.author,
      sub.comment,
      sub.hi,
      'subdl',
      sub.download_url,
      sub.page_url,
      {
        fullSeason: sub.fullSeason,
        season: sub.season || season || null,
        episode: sub.episode || episode || null,
        episodeFrom: sub.episode_from || null,
        episodeEnd: sub.episode_end || null
      }
    );
  }

  // Process SubSource subtitles
  for (const sub of subsourceSubs) {
    mergeSubtitle(
      sub.release_name,
      sub.language,
      sub.uploader,
      sub.commentary || '',
      sub.hearingImpaired,
      'subsource',
      String(sub.subtitleId),
      `https://subsource.net${sub.link}`,
      {
        season: season || null,
        episode: episode || null
      }
    );
  }

  // Process OpenSubtitles subtitles
  for (const sub of opensubtitlesSubs) {
    const rawComment = sub.raw && typeof sub.raw === 'object' && (sub.raw as { attributes?: { comments?: string } }).attributes?.comments
      ? (sub.raw as { attributes?: { comments?: string } }).attributes?.comments || ''
      : '';
    mergeSubtitle(
      sub.releaseName,
      sub.language,
      sub.uploader || 'Unknown',
      rawComment,
      sub.hi,
      'opensubtitles',
      String(sub.fileId),
      sub.pageUrl || '',
      {
        season: season || null,
        episode: episode || null
      }
    );
  }

  let mergedList = Array.from(subtitleMap.values());

  // Populate fullSeason flag using isFullSeasonSubtitle helper
  for (const sub of mergedList) {
    sub.fullSeason = isFullSeasonSubtitle(sub, type);
  }

  if (fullSeason) {
    // Keep only full season subtitles
    mergedList = mergedList.filter(sub => sub.fullSeason);
  }

  // Sort: Desired languages in search order first, then alphabetically, then non-HI first
  const langPriorityMap = new Map(languages.map((l, index) => [l, index]));
  mergedList.sort((a, b) => {
    const aLang = a.language.toLowerCase();
    const bLang = b.language.toLowerCase();
    
    const aPriority = langPriorityMap.has(aLang) ? langPriorityMap.get(aLang)! : 999;
    const bPriority = langPriorityMap.has(bLang) ? langPriorityMap.get(bLang)! : 999;

    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Secondary: Alphabetical language
    if (a.language !== b.language) return a.language.localeCompare(b.language);
    
    // Tertiary: Release name matching
    return a.release_name.localeCompare(b.release_name);
  });

  return {
    title,
    imdbId,
    subtitles: mergedList
  };
}
