'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import { HeroBackdropItem } from '@/services/tmdb';
import styles from './HeroSection.module.css';

interface TrendPill {
  id: number;
  title: string;
  type: 'movie' | 'tv';
}

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

  // Pick a fresh random backdrop from TMDB pool every time user opens or refreshes the page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (backdrops && backdrops.length > 0) {
        const randomIndex = Math.floor(Math.random() * backdrops.length);
        setCurrentBackdrop(backdrops[randomIndex]);
      }
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
            quality={90}
            className={styles.backdropImage}
            onLoad={() => setImageLoaded(true)}
            style={{
              opacity: imageLoaded ? 1 : 0.7,
            }}
          />
        )}
      </div>

      {/* SubDL Atmospheric Multi-Tier Dark Gradient Overlay */}
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
        {trends.length > 0 && (
          <div className={styles.trendsRow}>
            <span className={styles.trendsLabel}>⚡ Trends:</span>
            {trends.slice(0, 5).map((item) => (
              <Link
                key={item.id}
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
