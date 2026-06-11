import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMediaDetails, getSeasonDetails, getPosterUrl } from '@/services/tmdb';
import { fetchUnifiedSubtitles, UnifiedSubtitle } from '@/services/subtitles';
import { SITE_CONFIG } from '@/lib/config/site';
import TitleDetailsClient from './TitleDetailsClient';
import styles from './page.module.css';

interface Episode {
  episode_number: number;
  name: string;
  overview: string;
}

interface TitlePageProps {
  params: Promise<{ type: 'movie' | 'tv'; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: TitlePageProps): Promise<Metadata> {
  const { type, id } = await params;
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId) || (type !== 'movie' && type !== 'tv')) {
    return {};
  }

  const details = await getMediaDetails(parsedId, type);
  if (!details) {
    return {
      title: `Title Not Found | ${SITE_CONFIG.name}`,
      description: 'The requested movie or TV show could not be found.',
    };
  }

  const title = type === 'tv' ? details.name || details.title : details.title;
  const dateStr = type === 'tv' ? details.first_air_date : details.release_date;
  const year = dateStr ? new Date(dateStr).getFullYear().toString() : '';
  const mediaTypeName = type === 'tv' ? 'TV Show' : 'Movie';
  
  const pageTitle = `Download ${title} (${year}) Subtitles | SRT & ZIP | ${SITE_CONFIG.name}`;
  const pageDescription = `Looking for ${title} (${year}) ${mediaTypeName} subtitles? Download free SRT subtitles for ${title} in English, Spanish, French, Arabic, and other languages.`;
  const posterUrl = getPosterUrl(details.poster_path, 'w500');

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: `/title/${type}/${id}`,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `/title/${type}/${id}`,
      images: [
        {
          url: posterUrl,
          width: 500,
          height: 750,
          alt: `${title} Poster`,
        },
      ],
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [posterUrl],
    },
  };
}

export default async function Page({ params, searchParams }: TitlePageProps) {
  const { type, id } = await params;
  const { languages = '' } = await searchParams;
  const parsedId = parseInt(id, 10);
  
  if (isNaN(parsedId) || (type !== 'movie' && type !== 'tv')) {
    notFound();
  }

  const details = await getMediaDetails(parsedId, type);
  if (!details) {
    notFound();
  }

  const title = type === 'tv' ? details.name || details.title : details.title;
  const dateStr = type === 'tv' ? details.first_air_date : details.release_date;
  const year = dateStr ? new Date(dateStr).getFullYear().toString() : 'N/A';
  const posterUrl = getPosterUrl(details.poster_path, 'w500');

  // Prefetch TV episodes for season 1
  let initialEpisodes: Episode[] = [];
  if (type === 'tv' && details.seasons && details.seasons.length > 0) {
    const firstSeasonNum = details.seasons.filter(s => s.season_number > 0)[0]?.season_number || details.seasons[0].season_number;
    const seasonData = await getSeasonDetails(parsedId, firstSeasonNum);
    initialEpisodes = seasonData?.episodes || [];
  }

  // Prefetch subtitles
  let initialSubtitles: UnifiedSubtitle[] = [];
  try {
    const subsResult = await fetchUnifiedSubtitles({
      tmdbId: parsedId,
      type,
      season: type === 'tv' ? 1 : undefined,
      episode: type === 'tv' ? 1 : undefined,
      languagesStr: typeof languages === 'string' && languages ? languages : undefined
    });
    initialSubtitles = subsResult.subtitles;
  } catch (err) {
    console.error('Failed to prefetch subtitles on server:', err);
  }

  // Schema.org JSON-LD structures
  const breadcrumbListSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': `${SITE_CONFIG.url}/`
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': type === 'movie' ? 'Movies' : 'TV Shows',
        'item': `${SITE_CONFIG.url}/search?type=${type}`
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': title,
        'item': `${SITE_CONFIG.url}/title/${type}/${id}`
      }
    ]
  };

  const mainSchema = type === 'movie' ? {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    'name': title,
    'description': details.overview,
    'image': posterUrl,
    'datePublished': details.release_date,
    'genre': details.genres?.map(g => g.name) || [],
    'aggregateRating': details.vote_average ? {
      '@type': 'AggregateRating',
      'ratingValue': details.vote_average,
      'bestRating': '10',
      'ratingCount': '100'
    } : undefined
  } : {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    'name': title,
    'description': details.overview,
    'image': posterUrl,
    'dateFirstAired': details.first_air_date,
    'genre': details.genres?.map(g => g.name) || [],
    'numberOfSeasons': details.number_of_seasons,
    'numberOfEpisodes': details.number_of_episodes
  };

  const langListStr = 'English, Spanish, French, Arabic, Persian, Vietnamese';

  return (
    <>
      {/* Schema.org Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mainSchema) }}
      />

      <div className="container" style={{ paddingTop: '24px' }}>
        {/* Semantic Breadcrumbs navigation */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>
            Home
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href={`/search?type=${type}`} className={styles.breadcrumbLink}>
            {type === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>{title}</span>
        </nav>
      </div>

      <TitleDetailsClient
        id={parsedId}
        type={type}
        details={details}
        initialEpisodes={initialEpisodes}
        initialSubtitles={initialSubtitles}
        initialLanguage={typeof languages === 'string' ? languages : undefined}
      />

      {/* SEO content blocks and FAQ Accordion */}
      <div className={`container ${styles.seoTextBlock}`}>
        <h2>About {title} Subtitles</h2>
        <div className={styles.seoTextContent}>
          <p>
            Get ready to watch <strong>{title} ({year})</strong> with perfect subtitle sync! Our portal lists subtitle downloads for this {type === 'movie' ? 'movie' : 'TV show'} in popular languages including {langListStr}.
          </p>
          <p style={{ marginTop: '12px' }}>
            We list and index downloads matching all major releases, including: <strong>BluRay, WebRip, HDRip, WEBDL, DVDRip</strong>, and HDTV copies. High-definition releases like 720p, 1080p, and 4K UHD are fully supported. Find hearing impaired (HI) tags and customized translations tailored to your favorite audio format.
          </p>
        </div>

        <h2>Frequently Asked Questions (FAQ)</h2>
        <div className={styles.faqSection}>
          <details className={styles.faqItem}>
            <summary>How can I download subtitles for {title}?</summary>
            <div className={styles.faqAnswer}>
              <p>
                To download subtitles for <strong>{title}</strong>, simply browse the list of available subtitles above, select your desired language (such as English, Spanish, or French), and click the download icon or link. For TV series, make sure to choose the correct season and episode first.
              </p>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary>What subtitle formats are supported?</summary>
            <div className={styles.faqAnswer}>
              <p>
                We index and provide subtitles in the standard <strong>SRT (.srt)</strong> format, as well as compressed <strong>ZIP (.zip)</strong> files. These are compatible with almost all modern media players, including VLC, Plex, PotPlayer, MPC-HC, and smart TV apps.
              </p>
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary>Are the subtitles properly synchronized with {title} releases?</summary>
            <div className={styles.faqAnswer}>
              <p>
                Yes! Subtitles are matched directly to their corresponding video release group (e.g., RARBG, YIFY, SPARKS, FGT, ION10). To ensure perfect sync, match the file name of the video you are playing with the release name listed in the subtitle details.
              </p>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
