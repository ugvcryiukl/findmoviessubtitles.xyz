'use client';

import { useState, useEffect, useRef } from 'react';
import { UnifiedSubtitle } from '@/services/subtitles';
import {
  RELEASE_TYPES,
  SUBTITLE_TYPES,
  SUBTITLE_LANGUAGES
} from '@/lib/constants/subtitleFilters';
import styles from './SubtitleList.module.css';

interface SubtitleListProps {
  subtitles: UnifiedSubtitle[];
  mediaTitle: string;
  initialLanguage?: string;
}

interface DropdownProps {
  label: string;
  selectedLabel: string;
  options: { key: string; label: string }[];
  selectedKey: string;
  onChange: (key: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

// Custom Dropdown Component
function CustomDropdown({
  label,
  selectedLabel,
  options,
  selectedKey,
  onChange,
  searchable = false,
  searchPlaceholder = 'Search...'
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ''}`} ref={containerRef}>
      <button
        type="button"
        className={styles.dropdownHeader}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setSearchTerm('');
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select ${label}`}
      >
        <span className={styles.dropdownLabel}>{selectedLabel}</span>
        <span className={styles.dropdownArrow}>
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
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {searchable && (
            <div className={styles.dropdownSearch}>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.dropdownSearchInput}
                autoFocus
              />
            </div>
          )}

          <div className={styles.dropdownList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.key}
                  onClick={() => {
                    onChange(opt.key);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`${styles.dropdownItem} ${
                    opt.key === selectedKey ? styles.dropdownItemSelected : ''
                  }`}
                  role="option"
                  aria-selected={opt.key === selectedKey}
                >
                  <span>{opt.label}</span>
                  {opt.key === selectedKey && (
                    <span className={styles.dropdownCheck}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className={styles.dropdownNoOptions}>No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Detect release type from release name based on keywords
function detectReleaseType(releaseName: string): string {
  const lower = releaseName.toLowerCase();
  
  if (lower.includes('webrip') || lower.includes('web-dl') || lower.includes('web ') || lower.includes('.web.') || lower.endsWith('web')) {
    return 'web';
  }
  if (lower.includes('bluray') || lower.includes('brrip') || lower.includes('bdrip') || lower.includes('blu-ray') || lower.includes('bd-rip') || lower.includes('1080p.bluray')) {
    return 'bluray';
  }
  if (lower.includes('hdtv') || lower.includes('hd-tv') || lower.includes('dsrip')) {
    return 'hdtv';
  }
  if (lower.includes('cam') || lower.includes('hdts') || lower.includes('hd-ts') || lower.includes('hdrip') || lower.includes('telesync') || lower.includes('screener') || lower.includes('.scr.')) {
    return 'cam';
  }
  if (lower.includes('dvdrip') || lower.includes('dvd-rip')) {
    return 'dvdrip';
  }
  if (lower.includes('unofficial') || lower.includes('leaked')) {
    return 'unofficial';
  }
  if (lower.includes('trailer') || lower.includes('promo')) {
    return 'trailer';
  }
  return 'other';
}

interface HistoryItem {
  id: string;
  mediaTitle: string;
  release_name: string;
  language: string;
  source: 'subdl' | 'subsource';
  downloadUrl: string;
  timestamp: number;
}

function createHistoryItem(
  subtitle: UnifiedSubtitle,
  source: 'subdl' | 'subsource',
  downloadUrl: string,
  mediaTitle: string
): HistoryItem {
  return {
    id: `${source}-${subtitle.release_name}-${Date.now()}`,
    mediaTitle,
    release_name: subtitle.release_name,
    language: subtitle.language,
    source,
    downloadUrl,
    timestamp: Date.now()
  };
}

export default function SubtitleList({ subtitles, mediaTitle, initialLanguage }: SubtitleListProps) {
  const [selectedLangKey, setSelectedLangKey] = useState<string>(() => {
    if (initialLanguage) {
      const matched = SUBTITLE_LANGUAGES.find(
        (lang) => lang.label.toLowerCase() === initialLanguage.toLowerCase() ||
                  lang.aliases.some(alias => alias.toLowerCase() === initialLanguage.toLowerCase())
      );
      return matched ? matched.label : 'all';
    }
    return 'all';
  });
  const [selectedReleaseKey, setSelectedReleaseKey] = useState<string>('all');
  const [selectedTypeKey, setSelectedTypeKey] = useState<'all' | 'standard' | 'hi'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Setup Dropdown option maps
  const languageOptions = [
    { key: 'all', label: 'All Languages' },
    ...SUBTITLE_LANGUAGES.map(lang => ({ key: lang.label, label: lang.label }))
  ];

  const releaseTypeOptions = RELEASE_TYPES.map(rt => ({ key: rt.key, label: rt.label }));
  const subtitleTypeOptions = SUBTITLE_TYPES.map(st => ({ key: st.key, label: st.label }));

  // Helper to get active labels for button display
  const getSelectedLangLabel = () => {
    return languageOptions.find(o => o.key === selectedLangKey)?.label || 'All Languages';
  };

  const getSelectedReleaseLabel = () => {
    return releaseTypeOptions.find(o => o.key === selectedReleaseKey)?.label || 'All Release Types';
  };

  const getSelectedTypeLabel = () => {
    return subtitleTypeOptions.find(o => o.key === selectedTypeKey)?.label || 'All Subtitles';
  };

  // Record download action to localStorage history and download file via blob
  const handleDownload = async (
    event: React.MouseEvent,
    subtitle: UnifiedSubtitle,
    source: 'subdl' | 'subsource'
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const targetId = `${subtitle.id}-${source}`;
    if (downloadingId === targetId) return;

    const downloadUrl = source === 'subdl' ? subtitle.downloads.subdl : subtitle.downloads.subsource;
    if (!downloadUrl) return;

    setDownloadingId(targetId);
    try {
      const res = await fetch(downloadUrl);
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
        const cleanTitle = mediaTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_').toLowerCase();
        const cleanLang = subtitle.language.toLowerCase();
        let baseName = subtitle.release_name;
        baseName = baseName.replace(/\.(zip|rar|srt|txt)$/i, '');
        const cleanRelease = baseName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/__+/g, '_');
        filename = `${cleanTitle}_${cleanLang}_${cleanRelease}_[${source}].zip`;
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

      // Record to local storage history
      try {
        const historyJson = localStorage.getItem('download_history');
        const history = historyJson ? JSON.parse(historyJson) : [];
        const newHistoryItem = createHistoryItem(subtitle, source, downloadUrl, mediaTitle);
        localStorage.setItem('download_history', JSON.stringify([newHistoryItem, ...history]));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error('Error saving download history:', e);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to download subtitle file');
    } finally {
      setDownloadingId(null);
    }
  };

  const clearAllFilters = () => {
    setSelectedLangKey('all');
    setSelectedReleaseKey('all');
    setSelectedTypeKey('all');
    setSearchQuery('');
  };

  // Filter subtitles based on language aliases, release keywords, HI status, and query
  const filteredSubtitles = subtitles.filter(sub => {
    // 1. Language Filter (checks aliases mapping)
    const matchesLang = selectedLangKey === 'all' || (() => {
      const option = SUBTITLE_LANGUAGES.find(l => l.label === selectedLangKey);
      if (!option) return false;
      const subLangLower = sub.language.toLowerCase();
      return (
        subLangLower === option.label.toLowerCase() ||
        option.aliases.some(alias => subLangLower === alias.toLowerCase())
      );
    })();

    // 2. Release Type Filter (uses keyword detection)
    const matchesReleaseType = selectedReleaseKey === 'all' || (() => {
      const detected = detectReleaseType(sub.release_name);
      return detected === selectedReleaseKey;
    })();

    // 3. Subtitle Type Filter (SDH vs Standard)
    const matchesSubtitleType = selectedTypeKey === 'all' || (() => {
      if (selectedTypeKey === 'hi') return sub.hi;
      if (selectedTypeKey === 'standard') return !sub.hi;
      return true;
    })();
      
    // 4. Query text search
    const matchesQuery = 
      sub.release_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.uploader.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.comment.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLang && matchesReleaseType && matchesSubtitleType && matchesQuery;
  });

  const hasActiveFilters = 
    selectedLangKey !== 'all' || 
    selectedReleaseKey !== 'all' || 
    selectedTypeKey !== 'all' ||
    searchQuery !== '';

  return (
    <div className={styles.wrapper}>
      {/* SubSource-style Filter Bar */}
      <div className={styles.filtersBar}>
        {/* Search row on top */}
        <div className={styles.searchRow}>
          <label htmlFor="release-search" className={styles.searchLabel}>Filter Release Name</label>
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              id="release-search"
              type="text"
              placeholder="Search subtitle filename, uploader, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Dropdowns in one row below, with apply/reset on the right */}
        <div className={styles.controlsRow}>
          <div className={styles.dropdownsCol}>
            {/* Language Selection */}
            <div className={styles.filterGroup}>
              <label>Language</label>
              <CustomDropdown
                label="Language"
                selectedLabel={getSelectedLangLabel()}
                options={languageOptions}
                selectedKey={selectedLangKey}
                onChange={setSelectedLangKey}
                searchable={true}
                searchPlaceholder="Search language..."
              />
            </div>

            {/* Release Type Selection */}
            <div className={styles.filterGroup}>
              <label>Release Type</label>
              <CustomDropdown
                label="Release Type"
                selectedLabel={getSelectedReleaseLabel()}
                options={releaseTypeOptions}
                selectedKey={selectedReleaseKey}
                onChange={setSelectedReleaseKey}
              />
            </div>

            {/* Subtitle Type Selection */}
            <div className={styles.filterGroup}>
              <label>Subtitle Type</label>
              <CustomDropdown
                label="Subtitle Type"
                selectedLabel={getSelectedTypeLabel()}
                options={subtitleTypeOptions}
                selectedKey={selectedTypeKey}
                onChange={(key) => setSelectedTypeKey(key as 'all' | 'standard' | 'hi')}
              />
            </div>
          </div>

          {/* Reset Action Buttons */}
          <div className={styles.actionsCol}>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className={styles.resetBtn}>
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className={styles.chipsRow}>
            <span className={styles.chipsLabel}>Active filters:</span>
            
            {/* Language Chip */}
            {selectedLangKey !== 'all' && (
              <div className={styles.chip}>
                <span>{selectedLangKey}</span>
                <button onClick={() => setSelectedLangKey('all')} className={styles.chipRemove} aria-label="Remove language filter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            {/* Release Type Chip */}
            {selectedReleaseKey !== 'all' && (
              <div className={styles.chip}>
                <span>{getSelectedReleaseLabel()}</span>
                <button onClick={() => setSelectedReleaseKey('all')} className={styles.chipRemove} aria-label="Remove release type filter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            {/* Subtitle Type Chip */}
            {selectedTypeKey !== 'all' && (
              <div className={styles.chip}>
                <span>{getSelectedTypeLabel()}</span>
                <button onClick={() => setSelectedTypeKey('all')} className={styles.chipRemove} aria-label="Remove subtitle type filter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            {/* Query Chip */}
            {searchQuery !== '' && (
              <div className={styles.chip}>
                <span>Search: &quot;{searchQuery}&quot;</span>
                <button onClick={() => setSearchQuery('')} className={styles.chipRemove} aria-label="Clear search text">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}

            <button onClick={clearAllFilters} className={styles.clearAllLink}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Subtitles Counter */}
      <p className={styles.countText}>
        Showing {filteredSubtitles.length} of {subtitles.length} subtitles found
      </p>

      {/* Subtitles List */}
      {filteredSubtitles.length > 0 ? (
        <div className={styles.list}>
          {filteredSubtitles.map((sub, idx) => (
            <div key={idx} className={styles.subtitleCard}>
              <div className={styles.cardHeader}>
                <div className={styles.titleInfo}>
                  <h4 className={styles.releaseName} title={sub.release_name}>
                    {sub.release_name}
                  </h4>
                  <div className={styles.badgeRow}>
                    <span className="badge badge-primary">{sub.language}</span>
                    {sub.hi && (
                      <span className="badge badge-hi" title="Hearing Impaired / SDH">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 12v-3a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"></path>
                          <path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"></path>
                          <circle cx="9" cy="11" r="1"></circle>
                          <circle cx="15" cy="11" r="1"></circle>
                        </svg>
                        SDH
                      </span>
                    )}
                    
                    {sub.sources.map(src => (
                      <span
                        key={src}
                        className={`${styles.sourceBadge} ${
                          src === 'subdl' ? styles.subdlColor : styles.subsourceColor
                        }`}
                      >
                        {src === 'subdl' ? 'SubDL' : 'SubSource'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.downloadSection}>
                  {sub.downloads.subdl && (
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, sub, 'subdl')}
                      className={`${styles.downloadBtn} ${styles.subdlBtn} ${
                        downloadingId === `${sub.id}-subdl` ? styles.downloadBtnDisabled : ''
                      }`}
                      title="Download from SubDL"
                      disabled={!!downloadingId}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      {downloadingId === `${sub.id}-subdl` ? 'Downloading...' : 'DL (SubDL)'}
                    </button>
                  )}

                  {sub.downloads.subsource && (
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, sub, 'subsource')}
                      className={`${styles.downloadBtn} ${styles.subsourceBtn} ${
                        downloadingId === `${sub.id}-subsource` ? styles.downloadBtnDisabled : ''
                      }`}
                      title="Download from SubSource"
                      disabled={!!downloadingId}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      {downloadingId === `${sub.id}-subsource` ? 'Downloading...' : 'DL (SubSource)'}
                    </button>
                  )}
                </div>
              </div>

              {sub.comment && (
                <div className={styles.commentContainer}>
                  <span className={styles.commentLabel}>Note:</span>
                  <p className={styles.commentText}>{sub.comment}</p>
                </div>
              )}

              <div className={styles.cardFooter}>
                <span className={styles.uploaderName}>
                  Uploaded by: <strong>{sub.uploader}</strong>
                </span>
                
                {/* External original links */}
                <div className={styles.originalLinks}>
                  {sub.pages.subdl && (
                    <a href={sub.pages.subdl} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                      SubDL Page &rarr;
                    </a>
                  )}
                  {sub.pages.subsource && (
                    <a href={sub.pages.subsource} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                      SubSource Page &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noResults}>
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
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0L20 8M4 8l6.3 13"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <h3>No subtitles match your filters</h3>
          <p>Try clearing your filters or search query to see more subtitles</p>
        </div>
      )}
    </div>
  );
}
