'use client';

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchSuggestion } from '@/lib/types/search';
import styles from './SearchBox.module.css';

interface SearchBoxProps {
  initialQuery?: string;
  initialType?: 'all' | 'movie' | 'tv';
  placeholder?: string;
}

interface RecentSearchItem {
  id: string;
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  year: string;
}

// Memory cache for suggestions in the same session
const suggestionCache: Record<string, SearchSuggestion[]> = {};

export default function SearchBox({
  initialQuery = '',
  initialType = 'all',
  placeholder = 'Search movies, TV shows, release files...'
}: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(initialQuery || searchParams.get('q') || '');
  const [type, setType] = useState<'all' | 'movie' | 'tv'>(
    initialType || (searchParams.get('type') as 'all' | 'movie' | 'tv') || 'all'
  );

  // Suggestions states
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside detection
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      requestAnimationFrame(() => {
        setSuggestions([]);
        setLoading(false);
        setSelectedIndex(-1);
      });
      return;
    }

    // Check memory cache
    if (suggestionCache[trimmed]) {
      requestAnimationFrame(() => {
        setSuggestions(suggestionCache[trimmed]);
        setLoading(false);
        setSelectedIndex(-1);
      });
      return;
    }

    requestAnimationFrame(() => {
      setLoading(true);
      setSelectedIndex(-1);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json();
          const fetchedSuggestions = data.suggestions || [];
          suggestionCache[trimmed] = fetchedSuggestions;
          setSuggestions(fetchedSuggestions);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Suggestions fetch error:', err);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  // Load recent searches on focus
  const handleFocus = () => {
    setShowDropdown(true);
    try {
      const saved = localStorage.getItem('recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      } else {
        setRecentSearches([]);
      }
    } catch {
      setRecentSearches([]);
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setShowDropdown(false);
    setSelectedIndex(-1);
    saveToRecentSearches(suggestion);
    router.push(`/title/${suggestion.type}/${suggestion.tmdbId}`);
  };

  const handleSelectRecent = (recent: RecentSearchItem) => {
    setShowDropdown(false);
    setSelectedIndex(-1);
    router.push(`/title/${recent.type}/${recent.tmdbId}`);
  };

  const saveToRecentSearches = (item: SearchSuggestion) => {
    try {
      const saved = localStorage.getItem('recent_searches');
      let list: RecentSearchItem[] = saved ? JSON.parse(saved) : [];
      
      list = list.filter((r) => r.id !== item.id);
      
      list.unshift({
        id: item.id,
        tmdbId: item.tmdbId,
        type: item.type,
        title: item.title,
        year: item.year
      });
      
      list = list.slice(0, 5);
      localStorage.setItem('recent_searches', JSON.stringify(list));
      setRecentSearches(list);
    } catch (e) {
      console.error('Failed to save to recent searches:', e);
    }
  };

  const removeRecentSearch = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = recentSearches.filter((item) => item.id !== id);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
    setSelectedIndex(-1);
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') {
        setShowDropdown(true);
        handleFocus();
      }
      return;
    }

    const itemsCount = query.trim().length >= 2 ? suggestions.length : recentSearches.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (itemsCount > 0 ? (prev + 1) % itemsCount : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (itemsCount > 0 ? (prev - 1 + itemsCount) % itemsCount : -1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < itemsCount) {
        e.preventDefault();
        if (query.trim().length >= 2) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSelectRecent(recentSearches[selectedIndex]);
        }
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setShowDropdown(false);
    setSelectedIndex(-1);

    const params = new URLSearchParams();
    params.set('q', query.trim());
    if (type !== 'all') {
      params.set('type', type);
    }
    
    router.push(`/search?${params.toString()}`);
  };

  const isQueryLongEnough = query.trim().length >= 2;

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={styles.searchInput}
            required
            autoComplete="off"
          />
        </div>

        <div className={styles.controls}>
          <div className={styles.selectWrapper}>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'all' | 'movie' | 'tv')}
              className={styles.typeSelect}
              aria-label="Filter by media type"
            >
              <option value="all">All Media</option>
              <option value="movie">Movies</option>
              <option value="tv">TV Shows</option>
            </select>
            <span className={styles.selectArrow}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </span>
          </div>

          <button type="submit" className={styles.submitBtn}>
            Search
          </button>
        </div>
      </form>

      {/* Suggestions and Recent Searches Dropdown */}
      {showDropdown && (
        <div className={styles.suggestionsDropdown}>
          {/* SKELETON LOADING STATE */}
          {loading && isQueryLongEnough && (
            <div className={styles.skeletonList}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className={styles.skeletonRow}>
                  <div className={styles.skeletonThumb} />
                  <div className={styles.skeletonDetails}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonSubtitle} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REAL SUGGESTIONS LIST */}
          {!loading && isQueryLongEnough && (
            <div className={styles.suggestionsList} role="listbox">
              {suggestions.length > 0 ? (
                suggestions.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`${styles.suggestionRow} ${
                      idx === selectedIndex ? styles.selectedRow : ''
                    }`}
                    onClick={() => handleSelectSuggestion(item)}
                    role="option"
                    aria-selected={idx === selectedIndex}
                  >
                    <div className={styles.suggestionPoster}>
                      {item.poster ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.poster} alt={item.title} className={styles.thumbImage} />
                      ) : (
                        <div className={styles.thumbPlaceholder}>🎬</div>
                      )}
                    </div>
                    <div className={styles.suggestionDetails}>
                      <div className={styles.suggestionTitleRow}>
                        <span className={styles.suggestionTitle}>{item.title}</span>
                        <span className={styles.suggestionYear}>{item.year}</span>
                      </div>
                      <div className={styles.suggestionMetaRow}>
                        <span className={`${styles.typeBadge} ${item.type === 'tv' ? styles.tvBadge : styles.movieBadge}`}>
                          {item.type === 'tv' ? 'TV Show' : 'Movie'}
                        </span>
                        {item.overview && (
                          <span className={styles.suggestionOverview} title={item.overview}>
                            {item.overview.length > 75 ? `${item.overview.slice(0, 75)}...` : item.overview}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noResults}>No results found</div>
              )}
            </div>
          )}

          {/* RECENT SEARCHES LIST */}
          {!isQueryLongEnough && (
            <div className={styles.recentSection}>
              <div className={styles.recentHeader}>
                <span className={styles.recentTitleLabel}>Recent Searches</span>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className={styles.clearAllBtn}
                  >
                    Clear recent
                  </button>
                )}
              </div>
              {recentSearches.length > 0 ? (
                <div className={styles.recentList}>
                  {recentSearches.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`${styles.recentRow} ${
                        idx === selectedIndex ? styles.selectedRow : ''
                      }`}
                      onClick={() => handleSelectRecent(item)}
                    >
                      <span className={styles.recentClockIcon}>🕒</span>
                      <span className={styles.recentText}>{item.title}</span>
                      <span className={styles.recentYear}>{item.year}</span>
                      <span className={`${styles.typeBadge} ${item.type === 'tv' ? styles.tvBadge : styles.movieBadge} ${styles.recentTypeBadge}`}>
                        {item.type === 'tv' ? 'TV' : 'Movie'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(item.id, e)}
                        className={styles.removeRecentBtn}
                        aria-label="Remove search"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noRecent}>No recent searches</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
