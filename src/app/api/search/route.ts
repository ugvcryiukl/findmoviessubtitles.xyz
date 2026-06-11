import { NextResponse } from 'next/server';
import { searchMedia } from '@/services/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!query) {
    return NextResponse.json({ error: 'Search query "q" is required' }, { status: 400 });
  }

  try {
    const results = await searchMedia(query, page);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('API Search Error:', error);
    return NextResponse.json({ error: 'Failed to search media' }, { status: 500 });
  }
}
