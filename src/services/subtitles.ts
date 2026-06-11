import { getMediaDetails } from '@/services/tmdb';
import { fetchSubdlSubtitles } from '@/services/subdl';
import { searchSubsourceMovie, fetchSubsourceSubtitles } from '@/services/subsource';

export interface UnifiedSubtitle {
  id: string;
  release_name: string;
  language: string;
  uploader: string;
  comment: string;
  hi: boolean;
  sources: ('subdl' | 'subsource')[];
  downloads: {
    subdl?: string;
    subsource?: string;
  };
  pages: {
    subdl?: string;
    subsource?: string;
  };
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
  languagesStr = 'english,spanish,french,arabic,persian,vietnamese'
}: {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  languagesStr?: string;
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

  console.log(`[fetchUnifiedSubtitles] Searching subtitles for ${title} (IMDb: ${imdbId || 'None'}, TMDB: ${tmdbId})`);

  // 2. Query SubDL & SubSource simultaneously
  const subdlPromise = fetchSubdlSubtitles({
    imdb_id: imdbId,
    tmdb_id: tmdbId,
    film_name: title,
    languages: languagesStr,
    type,
    season_number: season,
    episode_number: episode
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
          fetchSubsourceSubtitles(subsourceMovieId, lang, season, episode).catch(err => {
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

  // Resolve both API promises
  const [subdlSubs, subsourceSubs] = await Promise.all([subdlPromise, subsourcePromise]);

  // 3. Merge and Deduplicate
  const subtitleMap = new Map<string, UnifiedSubtitle>();

  const mergeSubtitle = (
    releaseName: string,
    lang: string,
    uploader: string,
    comment: string,
    hi: boolean,
    source: 'subdl' | 'subsource',
    downloadUrl: string,
    pageUrl: string
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
      } else {
        existing.downloads.subsource = `/api/download?source=subsource&id=${downloadUrl}`;
        existing.pages.subsource = pageUrl;
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
        pages: {}
      };

      if (source === 'subdl') {
        // SubDL uses url path
        const path = toRelativePath(downloadUrl);
        unifiedSub.downloads.subdl = `/api/download?source=subdl&path=${encodeURIComponent(path)}`;
        unifiedSub.pages.subdl = pageUrl;
      } else {
        // SubSource uses ID
        unifiedSub.downloads.subsource = `/api/download?source=subsource&id=${downloadUrl}`;
        unifiedSub.pages.subsource = pageUrl;
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
      sub.page_url
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
      `https://subsource.net${sub.link}`
    );
  }

  const mergedList = Array.from(subtitleMap.values());

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
