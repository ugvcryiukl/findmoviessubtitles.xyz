import { MetadataRoute } from 'next';
import { 
  getPopularMovies, 
  getPopularTVShows, 
  getTopRatedMovies, 
  getTopRatedTVShows, 
  getMockPopularList 
} from '@/services/tmdb';
import { SITE_CONFIG } from '@/lib/config/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.url;

  // 1. Static Pages
  const staticPages = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ];

  // 2. Language Filter landing pages (for indexing key filters)
  const popularLanguages = ['english', 'arabic', 'spanish', 'french', 'vietnamese', 'persian'];
  const languagePages = popularLanguages.map(lang => ({
    url: `${baseUrl}/search?q=popular&languages=${lang}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // 3. Category/Year filter pages
  const categoryPages = [
    {
      url: `${baseUrl}/search?q=popular&type=movie`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search?q=popular&type=tv`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search?q=popular&type=movie&year=2026`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ];

  // 4. Dynamic Popular & Top Rated Title Pages
  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const promises = [];
    // Fetch 5 pages of popular/top rated movies and TV shows from TMDB in parallel
    for (let p = 1; p <= 5; p++) {
      promises.push(getPopularMovies(p));
      promises.push(getPopularTVShows(p));
      promises.push(getTopRatedMovies(p));
      promises.push(getTopRatedTVShows(p));
    }
    const results = await Promise.all(promises);
    const mediaItems = results.flat();
    
    // Deduplicate by media_type and id
    const seen = new Set<string>();
    const uniqueItems = mediaItems.filter(item => {
      if (!item || !item.id) return false;
      const key = `${item.media_type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    if (uniqueItems.length > 0) {
      dynamicPages = uniqueItems.map(item => ({
        url: `${baseUrl}/title/${item.media_type}/${item.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error('Failed to generate dynamic sitemap pages:', err);
  }

  // Fallback to top mock popular titles if TMDB query failed or returned empty results
  if (dynamicPages.length === 0) {
    const mockList = getMockPopularList();
    dynamicPages = mockList.map(item => ({
      url: `${baseUrl}/title/${item.media_type}/${item.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  }

  return [...staticPages, ...languagePages, ...categoryPages, ...dynamicPages];
}
