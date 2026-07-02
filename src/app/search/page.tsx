import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResultsClient from './SearchResultsClient';
import { searchMedia } from '@/services/tmdb';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; year?: string; languages?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q, languages } = await searchParams;
  
  if (q && q !== 'popular') {
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
  const { q = '', type = 'all', year = 'all' } = await searchParams;
  
  // Fetch results on the server if query is present
  const results = q.trim() ? await searchMedia(q) : [];

  return (
    <Suspense fallback={
      <div className="container flex-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    }>
      <SearchResultsClient
        initialResults={results}
        query={q}
        initialType={type as 'all' | 'movie' | 'tv'}
        initialYear={year}
      />
    </Suspense>
  );
}
