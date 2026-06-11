'use client';

import Link from 'next/link';
import styles from './Header.module.css';
import { useState } from 'react';
import Image from 'next/image';
import HistoryPanel from './HistoryPanel';
import { SITE_CONFIG } from '@/lib/config/site';

export default function Header() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.navContainer}`}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>
              <Image src="/brand/fs-logo-transparent.png" alt="Find Movies Subtitles logo" width={24} height={24} priority />
            </span>
            <span className="gradient-text">{SITE_CONFIG.shortName}</span>
          </Link>

          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
            <Link href="/#contact" className={styles.navLink}>
              Contact
            </Link>
            <button
              onClick={() => setPanelOpen(true)}
              className={styles.historyBtn}
              title="View History & Favorites"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 8v4l3 3"></path>
                <circle cx="12" cy="12" r="9"></circle>
              </svg>
              <span>Library</span>
            </button>
          </nav>
        </div>
      </header>

      <HistoryPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
