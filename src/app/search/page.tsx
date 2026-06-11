import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResultsClient from './SearchResultsClient';
import { searchMedia } from '@/services/tmdb';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string; year?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  
  if (q) {
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

  return {
    title: 'Search Movies & TV Shows Subtitles | Find Subtitles',
    description: 'Search and find subtitles for your favorite movies and TV shows in multiple languages.',
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: '/search',
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
