'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './HistoryPanel.module.css';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HistoryItem {
  id: string | number;
  mediaTitle: string;
  release_name: string;
  language: string;
  source: string;
  downloadUrl: string;
  timestamp: number;
}

interface FavoriteTitle {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  year: string;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favoriteTitles, setFavoriteTitles] = useState<FavoriteTitle[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Reload data from local storage whenever drawer opens or changes tab
  useEffect(() => {
    if (isOpen) {
      const savedHistory = localStorage.getItem('download_history');
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          requestAnimationFrame(() => {
            setHistory(parsedHistory);
          });
        } catch {
          requestAnimationFrame(() => {
            setHistory([]);
          });
        }
      }

      const savedFavs = localStorage.getItem('favorite_titles');
      if (savedFavs) {
        try {
          const parsedFavs = JSON.parse(savedFavs);
          requestAnimationFrame(() => {
            setFavoriteTitles(parsedFavs);
          });
        } catch {
          requestAnimationFrame(() => {
            setFavoriteTitles([]);
          });
        }
      }
    }
  }, [isOpen]);

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your download history?')) {
      localStorage.removeItem('download_history');
      setHistory([]);
    }
  };

  const removeFavoriteTitle = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = favoriteTitles.filter(item => item.id !== id);
    setFavoriteTitles(updated);
    localStorage.setItem('favorite_titles', JSON.stringify(updated));
  };

  const handleDownload = async (event: React.MouseEvent, item: HistoryItem) => {
    event.preventDefault();
    event.stopPropagation();

    const targetId = String(item.id);
    if (downloadingId === targetId) return;
    if (!item.downloadUrl) return;

    setDownloadingId(targetId);
    try {
      const res = await fetch(item.downloadUrl);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to download (Status ${res.status})`);
      }

      const blob = await res.blob();

      // Extract filename from response headers or fallback
      const disposition = res.headers.get('Content-Disposition');
      let filename = '';
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      if (!filename) {
        const cleanTitle = item.mediaTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_').toLowerCase();
        const cleanLang = item.language.toLowerCase();
        let baseName = item.release_name;
        baseName = baseName.replace(/\.(zip|rar|srt|txt)$/i, '');
        const cleanRelease = baseName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/__+/g, '_');
        filename = `${cleanTitle}_${cleanLang}_${cleanRelease}_[${item.source}].zip`;
      }

      if (!filename.endsWith('.zip')) {
        filename = `${filename}.zip`;
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to download subtitle file');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Library</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close drawer">
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
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Downloads
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'favorites' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            My Favorites
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'history' && (
            <div className={styles.historyList}>
              {history.length > 0 ? (
                <>
                  <button className={styles.clearBtn} onClick={clearHistory}>
                    Clear History
                  </button>
                  <div className={styles.itemsWrapper}>
                    {history
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((item, idx) => (
                        <div key={idx} className={styles.historyItem}>
                          <div className={styles.itemMeta}>
                            <span className={styles.itemDate}>
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                            <span className={styles.itemSource}>{item.source}</span>
                          </div>
                          <p className={styles.itemShowTitle}>{item.mediaTitle}</p>
                          <p className={styles.itemFileName} title={item.release_name}>
                            {item.release_name}
                          </p>
                          <div className={styles.itemFooter}>
                            <span className="badge badge-primary">{item.language}</span>
                            <button
                              type="button"
                              onClick={(e) => handleDownload(e, item)}
                              className={`${styles.redownloadBtn} ${
                                downloadingId === String(item.id) ? styles.redownloadBtnDisabled : ''
                              }`}
                              disabled={!!downloadingId}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                              {downloadingId === String(item.id) ? 'Downloading...' : 'Download Again'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <p>Your download history is empty</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className={styles.favoritesList}>
              {favoriteTitles.length > 0 ? (
                <div className={styles.favGrid}>
                  {favoriteTitles.map((item) => (
                    <Link
                      key={item.id}
                      href={`/title/${item.type}/${item.id}`}
                      onClick={onClose}
                      className={styles.favCard}
                    >
                      <div className={styles.favPoster}>
                        {item.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                            alt={item.title}
                            fill
                            sizes="120px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <div className={styles.favPosterPlaceholder}>🎬</div>
                        )}
                        <button
                          className={styles.favRemoveBtn}
                          onClick={(e) => removeFavoriteTitle(item.id, e)}
                          title="Remove from favorites"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                      <div className={styles.favInfo}>
                        <h4 className={styles.favTitle}>{item.title}</h4>
                        <span className={styles.favYear}>
                          {item.year} &bull; {item.type === 'tv' ? 'TV' : 'Movie'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
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
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <p>No favorite movies or TV shows saved yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
