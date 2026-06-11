import { MetadataRoute } from 'next';
import { getTrendingMedia } from '@/services/tmdb';
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

  // 4. Dynamic Trending Title Pages
  let trendingPages: MetadataRoute.Sitemap = [];
  try {
    const trendingMedia = await getTrendingMedia();
    trendingPages = (trendingMedia || []).map(item => ({
      url: `${baseUrl}/title/${item.media_type}/${item.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (err) {
    console.error('Failed to generate trending pages for sitemap:', err);
  }

  return [...staticPages, ...languagePages, ...categoryPages, ...trendingPages];
}
