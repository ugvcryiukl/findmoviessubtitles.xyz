export interface TrendPill {
  id: number;
  title: string;
  type: 'movie' | 'tv';
}

export function trendKey(item: TrendPill): string {
  return `${item.type}-${item.id}`;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

// Pick five from the top ten of each category, with both categories represented.
export function pickMixedTrends(candidates: TrendPill[], previous: string[] = []): TrendPill[] {
  const unique = [...new Map(candidates.map(item => [trendKey(item), item])).values()];
  const movies = unique.filter(item => item.type === 'movie').slice(0, 10);
  const shows = unique.filter(item => item.type === 'tv').slice(0, 10);
  const pool = [...movies, ...shows];
  const movieCount = Math.random() < 0.5 ? 2 : 3;
  const selected = [...shuffle(movies).slice(0, movieCount), ...shuffle(shows).slice(0, 5 - movieCount)];
  const selectedKeys = new Set(selected.map(trendKey));
  selected.push(...shuffle(pool.filter(item => !selectedKeys.has(trendKey(item)))).slice(0, 5 - selected.length));

  // Avoid repeating the same five titles on consecutive refreshes when possible.
  if (selected.length && selected.length === previous.length && selected.every(item => previous.includes(trendKey(item)))) {
    const replacement = shuffle(pool.filter(item => !previous.includes(trendKey(item))))[0];
    if (replacement) {
      const index = selected.findIndex(item => item.type === replacement.type);
      selected[index >= 0 ? index : 0] = replacement;
    }
  }
  return shuffle(selected);
}
