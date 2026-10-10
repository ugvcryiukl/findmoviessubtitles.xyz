import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResultsClient from './SearchResultsClient';
import { getBrowseMedia, searchMedia } from '@/services/tmdb';
import { getBrowseMode } from '@/lib/catalog';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; browse?: string; type?: string; year?: string; languages?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q = '', browse, type, languages } = await searchParams;
  const browseMode = getBrowseMode(q, browse, type);
  if (browseMode === 'top-rated') {
    const category = type === 'movie' ? 'Movies' : type === 'tv' ? 'TV Shows' : 'Movies & TV Shows';
    return {
      title: `Top Rated ${category} of All Time | Find Subtitles`,
      description: `Browse the highest-rated ${category.toLowerCase()} on TMDB and find subtitles in your language.`,
      alternates: { canonical: `/search?browse=top-rated${type === 'movie' || type === 'tv' ? `&type=${type}` : ''}` },
    };
  }
  
  if (q && !browseMode) {
    return {
      title: `Search results for "${q}" | Find Subtitles`,
      description: `Find movie and TV show subtitles matching "${q}". Download subtitles in SRT, ZIP format for all languages.`,
      robots: {
        index: false,
        follow: true,
      },
      alternates: {
        canonical: `/search?q=${encodeURIComponent(q)}`,
      },
    };
  }

  // q is falsy or is "popular" -> allow indexation for sitemap landing page mapping
  const titleText = q === 'popular'
    ? `Popular ${languages ? languages.charAt(0).toUpperCase() + languages.slice(1) : ''} Movie & TV Subtitles | Find Subtitles`
    : 'Search Movies & TV Shows Subtitles | Find Subtitles';
  const descText = q === 'popular'
    ? `Browse and download free SRT & ZIP subtitles for popular movies and TV series in ${languages || 'multiple languages'}.`
    : 'Search and find subtitles for your favorite movies and TV shows in multiple languages.';
  
  let canonicalPath = '/search';
  if (q === 'popular') {
    canonicalPath = languages ? `/search?q=popular&languages=${encodeURIComponent(languages)}` : '/search?q=popular';
  }

  return {
    title: titleText,
    description: descText,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalPath,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '', browse, type = 'all', year = 'all' } = await searchParams;
  const browseMode = getBrowseMode(q, browse, type);
  const catalog = browseMode ? await getBrowseMedia(browseMode) : null;
  const results = catalog ? catalog.results : q.trim() ? await searchMedia(q) : [];
  const mediaType = type === 'movie' || type === 'tv' ? type : 'all';

  return (
    <Suspense fallback={
      <div className="container flex-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    }>
      <SearchResultsClient
        initialResults={results}
        key={`${browseMode || 'search'}-${q}-${mediaType}-${year}`}
        query={browseMode ? '' : q}
        browseMode={browseMode}
        isDemo={catalog?.isDemo ?? false}
        initialType={mediaType}
        initialYear={year}
      />
    </Suspense>
  );
}
