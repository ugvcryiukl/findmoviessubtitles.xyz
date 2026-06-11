import { NextResponse } from 'next/server';
import { getTrendingMedia } from '@/services/tmdb';

export async function GET() {
  try {
    const results = await getTrendingMedia();
    return NextResponse.json({ results });
  } catch (error) {
    console.error('API Trending Error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending media' }, { status: 500 });
  }
}
