import { NextResponse } from 'next/server';
import { getMediaDetails } from '@/services/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get('id');
  const type = searchParams.get('type') as 'movie' | 'tv';

  if (!idStr || !type) {
    return NextResponse.json({ error: 'Missing parameters "id" or "type"' }, { status: 400 });
  }

  const id = parseInt(idStr, 10);

  try {
    const details = await getMediaDetails(id, type);
    if (!details) {
      return NextResponse.json({ error: 'Media details not found on TMDB' }, { status: 404 });
    }
    return NextResponse.json({ details });
  } catch (error) {
    console.error(`API Details Error for ${type} ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}
