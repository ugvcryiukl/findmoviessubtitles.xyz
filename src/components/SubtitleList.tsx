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
  source: 'subdl' | 'subsource' | 'opensubtitles';
  downloadUrl: string;
  timestamp: number;
}

function createHistoryItem(
  subtitle: UnifiedSubtitle,
  source: 'subdl' | 'subsource' | 'opensubtitles',
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
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Setup Dropdown option maps
  const languageOptions = [
    { key: 'all', label: 'All Languages' },
    ...SUBTITLE_LANGUAGES.map(lang => ({ key: lang.label, label: lang.label }))
  ];

  const releaseTypeOptions = RELEASE_TYPES.map(rt => ({ key: rt.key, label: rt.label }));
  const subtitleTypeOptions = SUBTITLE_TYPES.map(st => ({ key: st.key, label: st.label }));
  const sourceOptions = [
    { key: 'all', label: 'All Sources' },
    { key: 'subdl', label: 'SubDL' },
    { key: 'subsource', label: 'SubSource' },
    { key: 'opensubtitles', label: 'OpenSubtitles' }
  ];

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
    source: 'subdl' | 'subsource' | 'opensubtitles'
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const targetId = `${subtitle.id}-${source}`;
    if (downloadingId === targetId) return;

    const downloadUrl = subtitle.downloads[source];
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
        const ext = source === 'opensubtitles' ? 'srt' : 'zip';
        filename = `${cleanTitle}_${cleanLang}_${cleanRelease}_[${source}].${ext}`;
      }

      // Check if it's zipped or raw srt/vtt to prevent corrupt naming
      const isZip = res.headers.get('Content-Type') === 'application/zip' || filename.endsWith('.zip');
      if (!isZip && !filename.endsWith('.srt') && !filename.endsWith('.vtt')) {
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
    setSelectedSourceKey('all');
    setSearchQuery('');
  };

  // Filter subtitles based on language aliases, release keywords, HI status, source, and query
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

    // 4. Source Filter
    const matchesSource = selectedSourceKey === 'all' || sub.sources.includes(selectedSourceKey as any);
      
    // 5. Query text search
    const matchesQuery = 
      sub.release_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.uploader.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.comment.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLang && matchesReleaseType && matchesSubtitleType && matchesSource && matchesQuery;
  });

  const hasActiveFilters = 
    selectedLangKey !== 'all' || 
    selectedReleaseKey !== 'all' || 
    selectedTypeKey !== 'all' ||
    selectedSourceKey !== 'all' ||
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

            {/* Source Selection */}
            <div className={styles.filterGroup}>
              <label>Source</label>
              <CustomDropdown
                label="Source"
                selectedLabel={sourceOptions.find(o => o.key === selectedSourceKey)?.label || 'All Sources'}
                options={sourceOptions}
                selectedKey={selectedSourceKey}
                onChange={setSelectedSourceKey}
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

            {/* Source Chip */}
            {selectedSourceKey !== 'all' && (
              <div className={styles.chip}>
                <span>Source: {selectedSourceKey === 'opensubtitles' ? 'OpenSubtitles' : selectedSourceKey === 'subdl' ? 'SubDL' : 'SubSource'}</span>
                <button onClick={() => setSelectedSourceKey('all')} className={styles.chipRemove} aria-label="Remove source filter">
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

      {/* Subtitles List Table */}
      {filteredSubtitles.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table className={styles.subtitlesTable}>
            <thead>
              <tr>
                <th>Language</th>
                <th>Release Name</th>
                <th className="text-center">H.I.</th>
                <th>Source</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubtitles.map((sub, idx) => (
                <tr key={idx}>
                  <td className={styles.langCell}>
                    <span className="badge badge-primary">{sub.language}</span>
                  </td>
                  <td className={styles.releaseNameCell}>
                    <div className={styles.releaseHeader}>
                      <span className={styles.releaseNameText} title={sub.release_name}>
                        {sub.release_name}
                      </span>
                    </div>
                    {sub.comment && (
                      <div className={styles.noteText}>
                        <strong>Note:</strong> {sub.comment}
                      </div>
                    )}
                    <div className={styles.uploaderText}>
                      Uploaded by: <strong>{sub.uploader}</strong>
                      {sub.pages.subdl && (
                        <>
                          {' • '}
                          <a href={sub.pages.subdl} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>
                            SubDL original
                          </a>
                        </>
                      )}
                      {sub.pages.subsource && (
                        <>
                          {' • '}
                          <a href={sub.pages.subsource} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>
                            SubSource original
                          </a>
                        </>
                      )}
                      {sub.pages.opensubtitles && (
                        <>
                          {' • '}
                          <a href={sub.pages.opensubtitles} target="_blank" rel="noopener noreferrer" className={styles.originalLink}>
                            OpenSubtitles original
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    {sub.hi ? (
                      <span className={styles.hiBadge} title="Hearing Impaired / SDH">
                        Yes
                      </span>
                    ) : (
                      <span className={styles.mutedText}>-</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.sourcesWrapper}>
                      {sub.sources.map(src => (
                        <span
                          key={src}
                          className={`${styles.sourceBadge} ${
                            src === 'subdl'
                              ? styles.subdlColor
                              : src === 'subsource'
                              ? styles.subsourceColor
                              : styles.opensubtitlesColor
                          }`}
                        >
                          {src === 'subdl' ? 'SubDL' : src === 'subsource' ? 'SubSource' : 'OpenSubtitles'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className={styles.downloadWrapper}>
                      {sub.downloads.subdl && (
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, sub, 'subdl')}
                          className={`${styles.dlBtn} ${styles.subdlBtn} ${
                            downloadingId === `${sub.id}-subdl` ? styles.dlBtnDisabled : ''
                          }`}
                          disabled={!!downloadingId}
                        >
                          {downloadingId === `${sub.id}-subdl` ? '...' : 'SubDL'}
                        </button>
                      )}
                      {sub.downloads.subsource && (
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, sub, 'subsource')}
                          className={`${styles.dlBtn} ${styles.subsourceBtn} ${
                            downloadingId === `${sub.id}-subsource` ? styles.dlBtnDisabled : ''
                          }`}
                          disabled={!!downloadingId}
                        >
                          {downloadingId === `${sub.id}-subsource` ? '...' : 'SubSource'}
                        </button>
                      )}
                      {sub.downloads.opensubtitles && (
                        <button
                          type="button"
                          onClick={(e) => handleDownload(e, sub, 'opensubtitles')}
                          className={`${styles.dlBtn} ${styles.opensubtitlesBtn} ${
                            downloadingId === `${sub.id}-opensubtitles` ? styles.dlBtnDisabled : ''
                          }`}
                          disabled={!!downloadingId}
                        >
                          {downloadingId === `${sub.id}-opensubtitles` ? '...' : 'DL (OpenSubtitles)'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
