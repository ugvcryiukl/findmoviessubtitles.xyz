'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import { pickNextHeroBackdrop, type HeroBackdropItem } from '@/services/tmdb';
import { pickMixedTrends, trendKey, type TrendPill } from '@/lib/trends';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  initialBackdrop: HeroBackdropItem;
  backdrops: HeroBackdropItem[];
  trends?: TrendPill[];
}

export default function HeroSection({
  initialBackdrop,
  backdrops,
  trends = []
}: HeroSectionProps) {
  const [currentBackdrop, setCurrentBackdrop] = useState<HeroBackdropItem>(initialBackdrop);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [visibleTrends, setVisibleTrends] = useState(trends.slice(0, 5));

  useEffect(() => {
    const timer = setTimeout(() => {
      let previous: string[] = [];
      try {
        const saved = JSON.parse(sessionStorage.getItem('home_trends') || '[]');
        if (Array.isArray(saved)) previous = saved.filter(item => typeof item === 'string');
      } catch { /* Trends also work when storage is unavailable. */ }
      const selected = pickMixedTrends(trends, previous);
      setVisibleTrends(selected);
      try {
        sessionStorage.setItem('home_trends', JSON.stringify(selected.map(trendKey)));
      } catch { /* Storage is optional. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [trends]);

  // Rotate only within the curated IMDb classics, avoiding the last displayed film.
  useEffect(() => {
    const timer = setTimeout(() => {
      let previousId: number | undefined;
      try {
        const saved = sessionStorage.getItem('home_backdrop');
        if (saved) previousId = Number(saved);
      } catch { /* Random selection still works without browser storage. */ }
      const next = pickNextHeroBackdrop(backdrops, previousId);
      if (!next) return;
      setCurrentBackdrop(next);
      try {
        sessionStorage.setItem('home_backdrop', String(next.id));
      } catch { /* Storage is optional. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [backdrops]);

  return (
    <section className={styles.heroWrapper} aria-label="Subtitle search portal">
      {/* Background Image Layer */}
      <div className={styles.backdropLayer}>
        {currentBackdrop?.backdropUrl && (
          <Image
            src={currentBackdrop.backdropUrl}
            alt={currentBackdrop.title || 'Movie Backdrop'}
            fill
            priority
            sizes="100vw"
            quality={75}
            className={styles.backdropImage}
            onLoad={() => setImageLoaded(true)}
            style={{
              opacity: imageLoaded ? 1 : 0.7,
            }}
          />
        )}
      </div>

      {/* Fade only the bottom edge into the page background. */}
      <div className={styles.gradientOverlay} />

      {/* Centered Hero Content */}
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          Find perfect subtitles in any language for all your favorite films and shows!
        </h1>
        <p className={styles.heroSubtitle}>
          Download Free SRT &amp; ZIP Subtitles in Multiple Languages
        </p>

        {/* Central Search Box */}
        <div className={styles.searchContainer}>
          <Suspense fallback={<div className="spinner" />}>
            <SearchBox />
          </Suspense>
        </div>

        {/* SubDL Trends Row (⚡ Trends: Silo, Reacher, Mutiny...) */}
        {visibleTrends.length > 0 && (
          <div className={styles.trendsRow} aria-label="Trending movies and TV shows">
            <span className={styles.trendsLabel}>⚡ Trends:</span>
            {visibleTrends.map((item) => (
              <Link
                key={trendKey(item)}
                href={`/title/${item.type}/${item.id}`}
                className={styles.trendLink}
              >
                {item.title}
              </Link>
            ))}
          </div>
        )}

        {/* Quick Language Shortcuts */}
        <div className={styles.quickLanguages}>
          <Link href="/search?q=popular&languages=english" className={styles.langLink}>
            English Subtitles
          </Link>
          <span className={styles.separator}>|</span>
          <Link href="/search?q=popular&languages=arabic" className={styles.langLink}>
            Arabic Subtitles
          </Link>
          <span className={styles.separator}>|</span>
          <Link href="/search?q=popular&languages=french" className={styles.langLink}>
            French Subtitles
          </Link>
          <span className={styles.separator}>|</span>
          <Link href="/search?q=popular&languages=spanish" className={styles.langLink}>
            Spanish Subtitles
          </Link>
          <span className={styles.separator}>|</span>
          <Link href="/search?q=popular&languages=persian" className={styles.langLink}>
            Farsi/Persian Subtitles
          </Link>
        </div>
      </div>

      {/* Subtle Bottom Backdrop Attribution Badge */}
      {currentBackdrop && (
        <Link
          href={`/title/${currentBackdrop.mediaType}/${currentBackdrop.id}`}
          className={styles.backdropBadge}
          title={`View subtitles for ${currentBackdrop.title}`}
        >
          <span>🎬 {currentBackdrop.title} {currentBackdrop.year ? `(${currentBackdrop.year})` : ''}</span>
        </Link>
      )}
    </section>
  );
}
