'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { TMDBMedia, getPosterUrl } from '@/services/tmdb';
import styles from './MediaCard.module.css';

interface MediaCardProps {
  media: TMDBMedia;
}

export default function MediaCard({ media }: MediaCardProps) {
  const isTv = media.media_type === 'tv';
  const title = isTv ? media.name || media.title : media.title;
  const dateStr = isTv ? media.first_air_date : media.release_date;
  const year = dateStr ? new Date(dateStr).getFullYear() : 'N/A';
  
  const posterUrl = getPosterUrl(media.poster_path, 'w500');
  const searchParams = useSearchParams();
  const queryStr = searchParams.toString();
  const linkHref = `/title/${media.media_type}/${media.id}${queryStr ? `?${queryStr}` : ''}`;

  return (
    <Link href={linkHref} className={styles.card}>
      <div className={styles.posterWrapper}>
        {media.poster_path ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={styles.poster}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.posterPlaceholder}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <line x1="2" y1="7" x2="7" y2="7"></line>
              <line x1="2" y1="17" x2="7" y2="17"></line>
              <line x1="17" y1="17" x2="22" y2="17"></line>
              <line x1="17" y1="7" x2="22" y2="7"></line>
            </svg>
            <span className={styles.placeholderText}>No Poster</span>
          </div>
        )}
        <div className={styles.typeBadge}>
          {isTv ? 'TV Show' : 'Movie'}
        </div>
        
        {media.vote_average > 0 && (
          <div className={styles.ratingBadge}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>{media.vote_average.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.title} title={title}>
          {title}
        </h3>
        <p className={styles.meta}>{year}</p>
      </div>
    </Link>
  );
}
