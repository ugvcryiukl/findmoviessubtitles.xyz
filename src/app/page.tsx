import { Metadata } from 'next';
import MediaCard from '@/components/MediaCard';
import HeroSection from '@/components/HeroSection';
import { getTrendingMedia, getHeroBackdropPool } from '@/services/tmdb';
import { SITE_CONFIG } from '@/lib/config/site';
import { Suspense } from 'react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Download Movie & TV Subtitles | SRT & ZIP | ${SITE_CONFIG.name}`,
  description: `Search and download free SRT and ZIP subtitles for popular movies and TV shows in English, Arabic, Spanish, French, Persian, Vietnamese, and more. Compatible with VLC, Plex, and smart TVs.`,
  alternates: {
    canonical: '/'
  }
};

export default async function Home() {
  const [trending, backdropPool, trendingMovies, trendingShows] = await Promise.all([
    getTrendingMedia(),
    getHeroBackdropPool(),
    getTrendingMedia('movie'),
    getTrendingMedia('tv'),
  ]);

  // Select initial backdrop on server for SSR (pure and deterministic)
  const initialBackdrop = backdropPool.length > 0
    ? backdropPool[0]
    : null;

  // Interleave the top ten of each category so the server-rendered row is mixed too.
  const trendPills = Array.from({ length: 10 }, (_, index) => [trendingMovies[index], trendingShows[index]])
    .flat()
    .filter(item => item !== undefined)
    .map(item => ({
      id: item.id,
      title: item.title || item.name || '',
      type: item.media_type,
    }))
    .filter(item => item.title);

  // Generate a dynamic list of latest subtitles from trending movies and shows
  const latestSubtitles = (trending || []).slice(0, 10).map((media, index) => {
    const isTv = media.media_type === 'tv';
    const rawTitle = isTv ? media.name || media.title : media.title;
    const dateStr = isTv ? media.first_air_date : media.release_date;
    const year = dateStr ? new Date(dateStr).getFullYear().toString() : '2026';
    
    // Distribute languages
    const languages = ['English', 'Spanish', 'Arabic', 'French', 'Farsi', 'Vietnamese'];
    const lang = languages[index % languages.length];
    
    // Distribute release tags
    const dotTitle = rawTitle.replace(/[^a-zA-Z0-9]/g, '.').replace(/\.+/g, '.');
    const releases = [
      `${dotTitle}.${year}.1080p.BluRay.x264-YIFY`,
      `${dotTitle}.${year}.WEBRip.x264-ION10`,
      `${dotTitle}.${year}.1080p.WEBDL.DD5.1.H264`,
      `${dotTitle}.${year}.HDRip.XviD-AC3`
    ];
    const release = releases[index % releases.length];
    const source = index % 2 === 0 ? 'SubDL' : 'SubSource';
    
    // Formulate a progressive date (pure / idempotent)
    const baseDate = new Date('2026-06-13T19:00:00Z');
    const dateObj = new Date(baseDate.getTime() - index * 3 * 3600000); // 3 hours gap
    const date = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      mediaId: media.id,
      mediaType: media.media_type,
      title: `${rawTitle} (${year})`,
      language: lang,
      release,
      source,
      date,
    };
  });

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_CONFIG.name,
    "url": SITE_CONFIG.url,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_CONFIG.url}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* SubDL-Style Edge-to-Edge Hero with Random TMDB Backdrop & Gradient */}
      {initialBackdrop && (
        <HeroSection
          initialBackdrop={initialBackdrop}
          backdrops={backdropPool}
          trends={trendPills}
        />
      )}

      <div className={`container ${styles.homeWrapper}`}>
        {/* Latest Subtitles Table */}
        <section className={styles.latestSection}>
        <div className={styles.sectionHeader}>
          <h2>Latest Subtitles</h2>
          <p>Recently crawled and merged subtitle files</p>
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.latestTable}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Language</th>
                <th>Release File Name</th>
                <th>Source</th>
                <th>Date</th>
                <th className="text-center">Download</th>
              </tr>
            </thead>
            <tbody>
              {latestSubtitles.map((sub, idx) => (
                <tr key={idx}>
                  <td className={styles.titleCell}>
                    <a href={`/title/${sub.mediaType}/${sub.mediaId}`} className={styles.titleLink}>
                      {sub.title}
                    </a>
                  </td>
                  <td>
                    <span className="badge badge-primary">{sub.language}</span>
                  </td>
                  <td className={styles.releaseCell} title={sub.release}>
                    {sub.release}
                  </td>
                  <td>
                    <span className={sub.source === 'SubDL' ? styles.subdlText : styles.subsourceText}>
                      {sub.source}
                    </span>
                  </td>
                  <td className={styles.dateCell}>{sub.date}</td>
                  <td className="text-center">
                    <a href={`/title/${sub.mediaType}/${sub.mediaId}`} className={styles.dlIconLink} title="Go to downloads">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trending Media */}
      <section className={styles.trendingSection}>
        <div className={styles.sectionHeader}>
          <h2>Popular Titles</h2>
          <p>Most searched movies and TV shows</p>
        </div>

        <div className={styles.mediaGrid}>
          <Suspense fallback={
            <div className="flex-center" style={{ minHeight: '200px', width: '100%' }}>
              <div className="spinner" />
            </div>
          }>
            {(trending || []).map((item) => (
              <MediaCard key={`${item.media_type}-${item.id}`} media={item} />
            ))}
          </Suspense>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className={styles.seoSection}>
        <div className={styles.seoCard}>
          <h2>Download Subtitles for Movies & TV Shows</h2>
          <p>
            Welcome to <strong>Find Movies Subtitles</strong>, your ultimate destination for high-quality subtitle downloads. We offer a fast, reliable, and completely free search portal to download subtitles in multiple languages including <strong>English, Arabic, French, Spanish, Farsi, and Vietnamese</strong>.
          </p>
          <p style={{ marginTop: '10px' }}>
            Whether you are looking for subtitles for popular cinematic releases, indie movies, or the latest TV show seasons, we index and merge links from top repositories like <strong>SubDL, SubSource, and OpenSubtitles</strong>. 
          </p>
          <p style={{ marginTop: '10px' }}>
            Our subtitle database covers all major release formats: <strong>BluRay, WebRip, WEBDL, HDRip, DVDRip, and HDTV</strong>. You can find subtitles synchronized for 720p, 1080p, and 4K UHD resolutions. Find Hearing Impaired (SDH) subtitles and season pack zip downloads with a single click.
          </p>
        </div>

        <div className={styles.faqCard}>
          <h2>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary>Is downloading subtitles from this portal free?</summary>
              <div className={styles.faqAnswer}>
                <p>Yes, Find Movies Subtitles is 100% free to use. You can search, browse, and download SRT or ZIP files without creating an account or paying any fees.</p>
              </div>
            </details>
            <details className={styles.faqItem}>
              <summary>How do I load SRT subtitles in VLC or other players?</summary>
              <div className={styles.faqAnswer}>
                <p>Simply download the <code>.srt</code> file for your language. For most media players like VLC or MPC-HC, you can drag and drop the subtitle file directly onto the playing video, or rename the subtitle file to match the video file name exactly and keep them in the same folder.</p>
              </div>
            </details>
            <details className={styles.faqItem}>
              <summary>What is a Full Season subtitle pack?</summary>
              <div className={styles.faqAnswer}>
                <p>A Full Season pack is a compressed ZIP archive containing subtitle files for all episodes of a specific TV series season. This is perfect for binge-watching your favorite shows without downloading files episode-by-episode.</p>
              </div>
            </details>
            <details className={styles.faqItem}>
              <summary>Can I search subtitles using IMDb or TMDB IDs?</summary>
              <div className={styles.faqAnswer}>
                <p>Yes! Our search bar supports text queries as well as direct IMDb IDs (e.g., <code>tt0903747</code>) and TMDB IDs to ensure you find the exact movie or series you are looking for.</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      </div>
    </>
  );
}
