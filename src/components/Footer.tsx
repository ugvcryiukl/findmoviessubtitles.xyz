import Link from 'next/link';
import styles from './Footer.module.css';
import { SITE_CONFIG } from '@/lib/config/site';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerContainer}`}>
        <div className={styles.left}>
          <p className={styles.brand}>{SITE_CONFIG.domain}</p>
          <p className={styles.copy}>
            &copy; {new Date().getFullYear()} {SITE_CONFIG.domain}. All rights reserved.
            {' • '}
            <Link href="/#contact" className={styles.link}>
              Contact
            </Link>
          </p>
        </div>
        <div className={styles.right}>
          <p className={styles.credits}>
            Powered by{' '}
            <a href="https://subdl.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
              SubDL
            </a>
            ,{' '}
            <a href="https://subsource.net" target="_blank" rel="noopener noreferrer" className={styles.link}>
              SubSource
            </a>
            , and{' '}
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
              TMDB
            </a>.
          </p>
        </div>
      </div>
    </footer>
  );
}
