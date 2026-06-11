import { NextResponse } from 'next/server';
import { getSeasonDetails } from '@/services/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tvIdStr = searchParams.get('tvId');
  const seasonNumberStr = searchParams.get('seasonNumber');

  if (!tvIdStr || !seasonNumberStr) {
    return NextResponse.json(
      { error: 'Missing parameters "tvId" or "seasonNumber"' },
      { status: 400 }
    );
  }

  const tvId = parseInt(tvIdStr, 10);
  const seasonNumber = parseInt(seasonNumberStr, 10);

  try {
    const seasonDetails = await getSeasonDetails(tvId, seasonNumber);
    if (!seasonDetails) {
      return NextResponse.json({ error: 'Season details not found' }, { status: 404 });
    }
    return NextResponse.json({ episodes: seasonDetails.episodes || [] });
  } catch (error) {
    console.error(`API Season Details Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch season details' }, { status: 500 });
  }
}
