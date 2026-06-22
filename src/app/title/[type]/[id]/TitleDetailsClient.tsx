'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { TMDBShowDetails, getPosterUrl } from '@/services/tmdb';
import { UnifiedSubtitle } from '@/services/subtitles';
import SubtitleList from '@/components/SubtitleList';
import styles from './page.module.css';

interface Episode {
  episode_number: number;
  name: string;
  overview: string;
}

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
}

interface FavoriteItem {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  year: string;
}

interface TitleDetailsClientProps {
  id: number;
  type: 'movie' | 'tv';
  details: TMDBShowDetails;
  initialEpisodes: Episode[];
  initialSubtitles: UnifiedSubtitle[];
  initialLanguage?: string;
}

export default function TitleDetailsClient({
  id,
  type,
  details,
  initialEpisodes,
  initialSubtitles,
  initialLanguage,
}: TitleDetailsClientProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  // TV Episode states
  const [seasons] = useState<Season[]>(() => {
    if (type === 'tv' && details.seasons) {
      const validSeasons = details.seasons.filter((s: Season) => s.season_number > 0);
      return validSeasons.length > 0 ? validSeasons : details.seasons;
    }
    return [];
  });
  const [selectedSeason, setSelectedSeason] = useState<number>(() => {
    if (type === 'tv' && details.seasons) {
      const validSeasons = details.seasons.filter((s: Season) => s.season_number > 0);
      const list = validSeasons.length > 0 ? validSeasons : details.seasons;
      return list.length > 0 ? list[0].season_number : 1;
    }
    return 1;
  });
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Subtitles states
  const [subtitles, setSubtitles] = useState<UnifiedSubtitle[]>(initialSubtitles);
  const [loadingSubtitles, setLoadingSubtitles] = useState(false);
  const [subtitlesError, setSubtitlesError] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);
  const isInitialEpisodesRef = useRef(true);

  const title = type === 'tv' ? details.name || details.title : details.title;
  const dateStr = type === 'tv' ? details.first_air_date : details.release_date;
  const year = dateStr ? new Date(dateStr).getFullYear().toString() : 'N/A';
  const posterUrl = getPosterUrl(details.poster_path, 'w500');

  // Check favorites state in localStorage
  useEffect(() => {
    if (!id) return;
    const favs = localStorage.getItem('favorite_titles');
    if (favs) {
      try {
        const list = JSON.parse(favs) as FavoriteItem[];
        const favState = list.some((item) => item.id === id);
        setTimeout(() => {
          setIsFavorite(favState);
        }, 0);
      } catch {
        setTimeout(() => {
          setIsFavorite(false);
        }, 0);
      }
    }
  }, [id]);

  // Toggle favorite
  const toggleFavorite = () => {
    const favs = localStorage.getItem('favorite_titles');
    let list = favs ? JSON.parse(favs) : [];

    if (isFavorite) {
      list = list.filter((item: FavoriteItem) => item.id !== id);
      setIsFavorite(false);
    } else {
      list.push({
        id,
        title,
        type,
        poster_path: details.poster_path,
        year,
      });
      setIsFavorite(true);
    }
    localStorage.setItem('favorite_titles', JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
  };

  // TV: Fetch episodes list when season changes
  useEffect(() => {
    if (type !== 'tv' || !id || !selectedSeason) return;

    if (isInitialEpisodesRef.current) {
      isInitialEpisodesRef.current = false;
      return;
    }

    async function fetchEpisodes() {
      setLoadingEpisodes(true);
      try {
        const res = await fetch(`/api/details/season?tvId=${id}&seasonNumber=${selectedSeason}`);
        if (res.ok) {
          const data = await res.json();
          const epList = data.episodes || [];
          setEpisodes(epList);
          if (epList.length > 0) {
            setSelectedEpisode(epList[0].episode_number);
          }
        }
      } catch (err) {
        console.error('Error fetching episodes:', err);
      } finally {
        setLoadingEpisodes(false);
      }
    }
    fetchEpisodes();
  }, [id, type, selectedSeason]);

  // Fetch subtitles on season/episode selection change
  useEffect(() => {
    if (!id) return;
    if (type === 'tv' && (!selectedSeason || !selectedEpisode)) return;

    // Skip fetch for the initial load if we already have initial subtitles
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      if (initialSubtitles.length > 0) {
        return;
      }
    }

    async function loadSubtitles() {
      setLoadingSubtitles(true);
      setSubtitlesError(null);
      try {
        let url = `/api/subtitles?id=${id}&type=${type}&languages=english,spanish,french,arabic,persian,vietnamese`;
        if (type === 'tv') {
          url += `&season=${selectedSeason}&episode=${selectedEpisode}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch subtitles');
        }

        setSubtitles(data.subtitles || []);
      } catch (err) {
        console.error('Subtitles loading error:', err);
        const errMsg = err instanceof Error ? err.message : 'Error connecting to subtitles services.';
        setSubtitlesError(errMsg);
      } finally {
        setLoadingSubtitles(false);
      }
    }
    loadSubtitles();
  }, [id, type, selectedSeason, selectedEpisode, initialSubtitles]);

  // Label for local storage history tracking in SubtitleList
  const mediaLabel = type === 'tv' 
    ? `${title} - S${String(selectedSeason).padStart(2, '0')}E${String(selectedEpisode).padStart(2, '0')}`
    : title;

  return (
    <div className={styles.wrapper}>
      <div className={`container ${styles.infoContainer}`}>
        {/* Left Side: Poster */}
        <div className={styles.posterCol}>
          <div className={styles.posterWrapper}>
            <Image
              src={posterUrl}
              alt={title}
              width={280}
              height={420}
              className={styles.poster}
              priority
            />
          </div>
        </div>

        {/* Right Side: Metadata Details */}
        <div className={styles.detailsCol}>
          <div className={styles.titleHeader}>
            <h1 className={styles.title}>{title}</h1>
            <button 
              onClick={toggleFavorite}
              className={`${styles.favoriteBtn} ${isFavorite ? styles.favorited : ''}`}
              aria-label={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{isFavorite ? 'Saved' : 'Save Title'}</span>
            </button>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>{year}</span>
            <span className={styles.metaSeparator}>&bull;</span>
            <span className={styles.metaItem}>
              {type === 'tv' ? 'TV Series' : 'Movie'}
            </span>
            {details.runtime && (
              <>
                <span className={styles.metaSeparator}>&bull;</span>
                <span className={styles.metaItem}>{details.runtime} min</span>
              </>
            )}
            {details.vote_average > 0 && (
              <>
                <span className={styles.metaSeparator}>&bull;</span>
                <span className={`${styles.metaItem} ${styles.rating}`}>
                  ⭐ {details.vote_average.toFixed(1)}
                </span>
              </>
            )}
          </div>

          <div className={styles.genreTags}>
            {details.genres?.map((g) => (
              <span key={g.id} className={styles.genreTag}>{g.name}</span>
            ))}
          </div>

          <p className={styles.overview}>{details.overview}</p>
        </div>
      </div>

      {/* Subtitles Exploration & Episode Selector */}
      <div className={`container ${styles.subtitlesContainer}`}>
        <div className={styles.contentCard}>
          {type === 'tv' && (
            <div className={styles.tvSelectors}>
              <h2>Episode Selector</h2>
              <div className={styles.selectorsRow}>
                {/* Season Selector */}
                <div className={styles.selectorGroup}>
                  <label htmlFor="season-select">Season</label>
                  <select
                    id="season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(parseInt(e.target.value, 10))}
                    className={styles.select}
                  >
                    {seasons.map((s) => (
                      <option key={s.id} value={s.season_number}>
                        Season {s.season_number} ({s.episode_count} Episodes)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Episode Selector */}
                <div className={styles.selectorGroup}>
                  <label htmlFor="episode-select">Episode</label>
                  <select
                    id="episode-select"
                    value={selectedEpisode}
                    onChange={(e) => setSelectedEpisode(parseInt(e.target.value, 10))}
                    className={styles.select}
                    disabled={loadingEpisodes}
                  >
                    {episodes.map((ep) => (
                      <option key={ep.episode_number} value={ep.episode_number}>
                        Ep {ep.episode_number} - {ep.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Episode Description */}
              {episodes.length > 0 && (
                <div className={styles.episodeDetail}>
                  {episodes.find((ep) => ep.episode_number === selectedEpisode)?.overview && (
                    <p>
                      <strong>Plot:</strong>{' '}
                      {episodes.find((ep) => ep.episode_number === selectedEpisode)?.overview}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subtitles List area */}
          <div className={styles.subtitlesHeader}>
            <h2>Available Subtitles</h2>
            <p>Merged and deduplicated from SubDL and SubSource</p>
          </div>

          {loadingSubtitles ? (
            <div className={styles.skeletonRows}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className={styles.skeletonRow}>
                  <div className={styles.skeletonText1} />
                  <div className={styles.skeletonText2} />
                </div>
              ))}
            </div>
          ) : subtitlesError ? (
            <div className={styles.errorAlert}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{subtitlesError}</span>
            </div>
          ) : (
            <SubtitleList subtitles={subtitles} mediaTitle={mediaLabel} initialLanguage={initialLanguage || undefined} />
          )}
        </div>
      </div>
    </div>
  );
}
