export type BrowseMode = 'top-rated' | 'popular';

export function getBrowseMode(query: string, browse?: string, type?: string): BrowseMode | undefined {
  if (browse === 'top-rated') return 'top-rated';
  // Keep old navigation bookmarks working without searching for the word "popular".
  if (query.trim().toLowerCase() === 'popular') {
    return type === 'movie' || type === 'tv' ? 'top-rated' : 'popular';
  }
  return undefined;
}
