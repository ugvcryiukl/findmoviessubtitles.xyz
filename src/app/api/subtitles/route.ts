import { NextResponse } from 'next/server';
import { fetchUnifiedSubtitles } from '@/services/subtitles';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tmdbIdStr = searchParams.get('id');
  const type = searchParams.get('type') as 'movie' | 'tv';
  const seasonStr = searchParams.get('season');
  const episodeStr = searchParams.get('episode');
  const languagesParam = searchParams.get('languages');
  const languagesStr = languagesParam && languagesParam !== 'all' ? languagesParam : undefined;
  const fullSeasonStr = searchParams.get('fullSeason');

  if (!tmdbIdStr || !type) {
    return NextResponse.json({ error: 'Missing parameters "id" or "type"' }, { status: 400 });
  }

  const tmdbId = parseInt(tmdbIdStr, 10);
  const season = seasonStr ? parseInt(seasonStr, 10) : undefined;
  const episode = episodeStr ? parseInt(episodeStr, 10) : undefined;
  const fullSeason = fullSeasonStr === 'true';

  try {
    const result = await fetchUnifiedSubtitles({
      tmdbId,
      type,
      season,
      episode: fullSeason ? undefined : episode,
      languagesStr,
      fullSeason
    });

    return NextResponse.json({
      title: result.title,
      imdbId: result.imdbId,
      type,
      season,
      episode: fullSeason ? undefined : episode,
      fullSeason,
      subtitles: result.subtitles
    });
  } catch (error) {
    console.error('API Subtitles Fetch Error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch subtitles';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
