import { NextResponse } from 'next/server';
import { searchMedia, getPosterUrl, getBackdropUrl } from '@/services/tmdb';
import { SearchSuggestion } from '@/lib/types/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const mediaResults = await searchMedia(query.trim());
    
    const suggestions: SearchSuggestion[] = mediaResults
      .slice(0, 8)
      .map((item) => {
        const isTv = item.media_type === 'tv';
        const title = isTv ? item.name || item.title : item.title;
        const dateStr = isTv ? item.first_air_date : item.release_date;
        const year = dateStr ? new Date(dateStr).getFullYear().toString() : 'N/A';
        
        // Use w92 for tiny poster thumbnail and w300 for backdrop in suggestion card
        const posterUrl = item.poster_path ? getPosterUrl(item.poster_path, 'w200') : null;
        const backdropUrl = item.backdrop_path ? getBackdropUrl(item.backdrop_path, 'w780') : null;

        return {
          id: `${item.media_type}-${item.id}`,
          tmdbId: item.id,
          subsourceId: null,
          type: item.media_type as 'movie' | 'tv',
          title,
          year,
          poster: posterUrl,
          backdrop: backdropUrl,
          overview: item.overview || '',
          source: 'tmdb'
        };
      });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('API Suggestions Error:', error);
    // Fail gracefully/silently and return empty suggestions list
    return NextResponse.json({ suggestions: [] });
  }
}
