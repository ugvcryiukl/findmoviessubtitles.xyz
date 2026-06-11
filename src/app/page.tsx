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

  const quickSuggestions = [
    { label: 'English subtitles', href: '/search?q=popular&languages=english' },
    { label: 'Arabic subtitles', href: '/search?q=popular&languages=arabic' },
    { label: 'Latest movies', href: '/search?q=popular&type=movie' },
    { label: 'TV shows', href: '/search?q=popular&type=tv' },
    { label: '2026 movies', href: '/search?q=popular&type=movie&year=2026' }
  ];

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

      {/* Hero Section */}
      <section className={`${styles.hero} animate-fade-in`}>
        <div className={styles.heroGlow} />
        <h1 className={styles.heroTitle}>
          Find the Perfect Subtitles, <span className="gradient-text">Instantly</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Simultaneously search and download merged, deduplicated subtitle files from **SubDL** and **SubSource** in one clean, dark, ad-free interface.
        </p>

        <div className={styles.searchContainer}>
          <Suspense fallback={<div className="spinner" />}>
            <SearchBox />
          </Suspense>
        </div>

        {/* Quick Suggestions */}
        <div className={styles.languagesRow}>
          <span className={styles.languagesLabel}>Quick Suggestions:</span>
          <div className={styles.languagesBadges}>
            {quickSuggestions.map((suggestion, idx) => (
              <a
                key={idx}
                href={suggestion.href}
                className="badge badge-secondary"
              >
                {suggestion.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Media */}
      <section className={styles.trendingSection}>
        <div className={styles.sectionHeader}>
          <h2>Trending Movies & Shows</h2>
          <p>Frequently searched titles with active subtitle communities</p>
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
