'use client';

import { useState } from 'react';
import SearchBox from '@/components/SearchBox';
import MediaCard from '@/components/MediaCard';
import { TMDBMedia } from '@/services/tmdb';
import styles from './page.module.css';

interface SearchResultsClientProps {
  initialResults: TMDBMedia[];
  query: string;
  initialType: 'all' | 'movie' | 'tv';
  initialYear: string;
}

export default function SearchResultsClient({
  initialResults,
  query,
  initialType,
  initialYear,
}: SearchResultsClientProps) {
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>(initialType);
  const [filterYear, setFilterYear] = useState<string>(initialYear);
  const [prevQuery, setPrevQuery] = useState(query);
  const [prevInitialType, setPrevInitialType] = useState(initialType);
  const [prevInitialYear, setPrevInitialYear] = useState(initialYear);

  if (query !== prevQuery || initialType !== prevInitialType || initialYear !== prevInitialYear) {
    setPrevQuery(query);
    setPrevInitialType(initialType);
    setPrevInitialYear(initialYear);
    setFilterType(initialType);
    setFilterYear(initialYear);
  }

  // Apply filters on the retrieved TMDB results
  const filteredResults = initialResults.filter((item) => {
    const matchesType = filterType === 'all' || item.media_type === filterType;
    
    const dateStr = item.media_type === 'tv' ? item.first_air_date : item.release_date;
    const year = dateStr ? new Date(dateStr).getFullYear().toString() : '';
    const matchesYear = filterYear === 'all' || year === filterYear;

    return matchesType && matchesYear;
  });

  // Extract unique years from results for the filters list
  const uniqueYears = Array.from(
    new Set(
      initialResults
        .map((item) => {
          const dateStr = item.media_type === 'tv' ? item.first_air_date : item.release_date;
          return dateStr ? new Date(dateStr).getFullYear().toString() : '';
        })
        .filter((y) => y !== '')
    )
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className={`container ${styles.searchPage}`}>
      {/* Search Bar Header */}
      <div className={styles.header}>
        <SearchBox initialQuery={query} initialType={filterType} />
      </div>

      <div className={styles.layout}>
        {/* Sidebar Filters */}
        <aside className={styles.sidebar}>
          <div className={styles.filterSection}>
            <h3>Type</h3>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="type"
                  checked={filterType === 'all'}
                  onChange={() => setFilterType('all')}
                />
                <span>All Media</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="type"
                  checked={filterType === 'movie'}
                  onChange={() => setFilterType('movie')}
                />
                <span>Movies</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="type"
                  checked={filterType === 'tv'}
                  onChange={() => setFilterType('tv')}
                />
                <span>TV Shows</span>
              </label>
            </div>
          </div>

          <div className={styles.filterSection}>
            <h3>Release Year</h3>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className={styles.yearSelect}
            >
              <option value="all">All Years</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* Results Main Grid */}
        <main className={styles.mainContent}>
          <h2 className={styles.resultsTitle}>
            {query === 'popular' ? 'Popular Media' : `Search results for "${query}"`}
          </h2>
          <p className={styles.resultsCount}>
            Found {filteredResults.length} matching titles
          </p>

          {filteredResults.length > 0 ? (
            <div className={styles.resultsGrid}>
              {filteredResults.map((item) => (
                <MediaCard key={item.id} media={item} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <h3>No titles found</h3>
              <p>We could not find any Movies or TV Shows matching your query.</p>
              <p>Check the spelling, try searching by general words, or remove year filters.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
