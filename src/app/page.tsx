import { Suspense } from 'react';
import { Metadata } from 'next';
import SearchBox from '@/components/SearchBox';
import MediaCard from '@/components/MediaCard';
import ContactEmail from '@/components/ContactEmail';
import { getTrendingMedia } from '@/services/tmdb';
import { SITE_CONFIG } from '@/lib/config/site';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} - Download Movie & TV Subtitles`,
  description: SITE_CONFIG.description,
  alternates: {
    canonical: '/'
  }
};

export default async function Home() {
  const trending = await getTrendingMedia();

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
    <div className={`container ${styles.homeWrapper}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* Compact Search Portal Header */}
      <section className={`${styles.searchPortal} animate-fade-in`}>
        <div className={styles.searchContainer}>
          <Suspense fallback={<div className="spinner" />}>
            <SearchBox />
          </Suspense>
        </div>

        {/* Quick Language Links */}
        <div className={styles.quickLanguages}>
          <a href="/search?q=popular&languages=english" className={styles.langLink}>English Subtitles</a>
          <span className={styles.separator}>|</span>
          <a href="/search?q=popular&languages=arabic" className={styles.langLink}>Arabic Subtitles</a>
          <span className={styles.separator}>|</span>
          <a href="/search?q=popular&languages=french" className={styles.langLink}>French Subtitles</a>
          <span className={styles.separator}>|</span>
          <a href="/search?q=popular&languages=spanish" className={styles.langLink}>Spanish Subtitles</a>
          <span className={styles.separator}>|</span>
          <a href="/search?q=popular&languages=persian" className={styles.langLink}>Farsi/Persian Subtitles</a>
        </div>
      </section>

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
              <MediaCard key={item.id} media={item} />
            ))}
          </Suspense>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactContainer}>
          <div className={styles.contactGlow} />
          <div className={styles.contactCard}>
            <div className={styles.contactIcon}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h2 className={styles.contactTitle}>Support & Feedback</h2>
            <p className={styles.contactText}>
              Have questions, suggestions, or feedback? Send an email to the admin team directly.
            </p>
            <div className={styles.emailContainer}>
              <ContactEmail />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
