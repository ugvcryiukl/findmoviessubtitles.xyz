import { getMediaDetails } from '@/services/tmdb';
import { fetchSubdlSubtitles } from '@/services/subdl';
import { searchSubsourceMovie, fetchSubsourceSubtitles } from '@/services/subsource';
import { fetchOpenSubtitlesSubtitles } from '@/services/opensubtitles';
import { SUBTITLE_LANGUAGES } from '@/lib/constants/subtitleFilters';

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

function normalizeLanguageLabel(lang: string): string {
  if (!lang) return 'English';
  const clean = lang.trim().toLowerCase().replace(/_/g, ' ');
  const matched = SUBTITLE_LANGUAGES.find(
    l => l.label.toLowerCase() === clean ||
         l.subdlCode.toLowerCase() === clean ||
         l.subsourceCode.toLowerCase() === clean ||
         l.aliases.some(a => a.toLowerCase() === clean)
  );
  if (matched) return matched.label;
  return lang.charAt(0).toUpperCase() + lang.slice(1).replace(/_/g, ' ');
}

export async function fetchUnifiedSubtitles({
  tmdbId,
  type,
  season,
  episode,
  languagesStr,
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

  const isSpecificLang = Boolean(languagesStr && languagesStr.toLowerCase() !== 'all');
  const targetLanguages = isSpecificLang
    ? languagesStr!.split(',').map(l => l.trim().toLowerCase()).filter(Boolean)
    : [];

  console.log(`[fetchUnifiedSubtitles] Searching subtitles for ${title} (IMDb: ${imdbId || 'None'}, TMDB: ${tmdbId}, Season: ${season}, Episode: ${episode}, Full Season: ${fullSeason}, Langs: ${languagesStr || 'ALL'})`);

  // 2. Query SubDL, SubSource & OpenSubtitles simultaneously
  const subdlPromise = fetchSubdlSubtitles({
    imdb_id: imdbId,
    tmdb_id: tmdbId,
    film_name: title,
    languages: isSpecificLang ? languagesStr : undefined,
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
      // Pass season to searchSubsourceMovie so TV shows match the exact season movieId
      const subsourceMovieId = await searchSubsourceMovie(title, imdbId, type === 'tv' ? season : undefined);
      if (!subsourceMovieId) {
        console.log('SubSource: Movie/show ID not found');
        return [];
      }

      if (isSpecificLang && targetLanguages.length === 1) {
        return await fetchSubsourceSubtitles(
          subsourceMovieId,
          targetLanguages[0],
          season,
          fullSeason ? undefined : episode
        );
      }

      // Fetch all languages directly from SubSource
      return await fetchSubsourceSubtitles(
        subsourceMovieId,
        undefined,
        season,
        fullSeason ? undefined : episode
      );
    } catch (err) {
      console.error('Error fetching SubSource subtitles:', err);
      return [];
    }
  })();

  const opensubtitlesPromise = fetchOpenSubtitlesSubtitles({
    imdb_id: imdbId,
    tmdb_id: tmdbId,
    film_name: title,
    languages: isSpecificLang ? languagesStr : undefined,
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

  // 3. Merge and Preserve All Subtitles without ever overwriting entries from the same source
  const groupedSubtitles = new Map<string, UnifiedSubtitle[]>();

  const mergeSubtitle = (
    releaseName: string,
    rawLang: string,
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
    if (!releaseName && !downloadUrl) return;

    const cleanReleaseName = releaseName || 'Standard Release';
    const normalizedRelease = normalizeReleaseName(cleanReleaseName);
    const standardLang = normalizeLanguageLabel(rawLang);
    const groupKey = `${standardLang.toLowerCase()}:${normalizedRelease}`;

    if (!groupedSubtitles.has(groupKey)) {
      groupedSubtitles.set(groupKey, []);
    }

    const candidates = groupedSubtitles.get(groupKey)!;

    // Cross-source merge: find existing subtitle entry that does NOT have this source yet and matches HI status
    const existing = candidates.find(item => !item.sources.includes(source) && item.hi === hi);

    if (existing) {
      existing.sources.push(source);

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

      if (uploader && uploader !== 'Unknown' && !existing.uploader.includes(uploader)) {
        existing.uploader = existing.uploader === 'Unknown' ? uploader : `${existing.uploader}, ${uploader}`;
      }

      if (comment && comment.length > existing.comment.length) {
        existing.comment = comment;
      }

      if (extraProps?.fullSeason) {
        existing.fullSeason = true;
      }
      if (extraProps?.season !== undefined && extraProps.season !== null && !existing.season) {
        existing.season = extraProps.season;
      }
    } else {
      // Create new subtitle entry (never overwriting another subtitle from the same source!)
      const subId = `${groupKey}:${source}:${downloadUrl}`;
      const unifiedSub: UnifiedSubtitle = {
        id: subId,
        release_name: cleanReleaseName,
        language: standardLang,
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
        const path = toRelativePath(downloadUrl);
        unifiedSub.downloads.subdl = `/api/download?source=subdl&path=${encodeURIComponent(path)}`;
        unifiedSub.pages.subdl = pageUrl;
      } else if (source === 'subsource') {
        unifiedSub.downloads.subsource = `/api/download?source=subsource&id=${downloadUrl}`;
        unifiedSub.pages.subsource = pageUrl;
      } else {
        unifiedSub.downloads.opensubtitles = `/api/download?source=opensubtitles&id=${downloadUrl}`;
        unifiedSub.pages.opensubtitles = pageUrl;
      }

      candidates.push(unifiedSub);
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

  let mergedList: UnifiedSubtitle[] = [];
  for (const group of groupedSubtitles.values()) {
    mergedList.push(...group);
  }

  // Populate fullSeason flag using isFullSeasonSubtitle helper
  for (const sub of mergedList) {
    sub.fullSeason = isFullSeasonSubtitle(sub, type);
  }

  if (fullSeason) {
    // Keep only full season subtitles
    mergedList = mergedList.filter(sub => sub.fullSeason);
  }

  // Sort: English first, then Arabic, Spanish, French, etc., then alphabetically
  const priorityLangs = ['English', 'Arabic', 'Spanish', 'French', 'Farsi/Persian', 'Vietnamese'];
  const langPriorityMap = new Map(priorityLangs.map((l, index) => [l.toLowerCase(), index]));

  mergedList.sort((a, b) => {
    const aLang = a.language.toLowerCase();
    const bLang = b.language.toLowerCase();
    
    const aPriority = langPriorityMap.has(aLang) ? langPriorityMap.get(aLang)! : 999;
    const bPriority = langPriorityMap.has(bLang) ? langPriorityMap.get(bLang)! : 999;

    if (aPriority !== bPriority) return aPriority - bPriority;
    if (a.language !== b.language) return a.language.localeCompare(b.language);
    return a.release_name.localeCompare(b.release_name);
  });

  return {
    title,
    imdbId,
    subtitles: mergedList
  };
}
