import test from 'node:test';
import assert from 'node:assert/strict';
import { getBrowseMode } from '../src/lib/catalog.ts';
import { pickMixedTrends, trendKey } from '../src/lib/trends.ts';
import { getBrowseMedia, getTrendingMedia, getHeroBackdropPool, pickNextHeroBackdrop } from '../src/services/tmdb.ts';

test('navigation requests a catalog; actual movie queries remain searches', () => {
  assert.equal(getBrowseMode('', 'top-rated', 'tv'), 'top-rated');
  assert.equal(getBrowseMode('popular', undefined, 'movie'), 'top-rated');
  assert.equal(getBrowseMode('popular', undefined, 'tv'), 'top-rated');
  assert.equal(getBrowseMode('popular'), 'popular');
  assert.equal(getBrowseMode('Breaking Bad', undefined, 'tv'), undefined);
});

test('refresh selects five unique titles, mixes both types, and changes the set', () => {
  const candidates = ['movie', 'tv'].flatMap(type => Array.from({ length: 15 }, (_, id) => ({ id, type, title: `${type} ${id}` })));
  let previous = [];
  for (let refresh = 0; refresh < 100; refresh++) {
    const selected = pickMixedTrends(candidates, previous);
    const keys = selected.map(trendKey);
    assert.equal(keys.length, 5);
    assert.equal(new Set(keys).size, 5);
    assert.equal(new Set(selected.map(item => item.type)).size, 2);
    assert.ok(selected.every(item => item.id < 10));
    assert.notDeepEqual([...keys].sort(), [...previous].sort());
    previous = keys;
  }
});

test('small or single-category pools remain usable without duplicates', () => {
  assert.deepEqual(pickMixedTrends([]), []);
  const item = { id: 1, title: 'Movie', type: 'movie' };
  assert.deepEqual(pickMixedTrends([item, item]), [item]);
});

test('hero backdrops are IMDb classics before 2000 and never repeat consecutively', async () => {
  const pool = await getHeroBackdropPool();
  assert.ok(pool.length >= 10);
  assert.equal(new Set(pool.map(item => item.imdbId)).size, pool.length);
  assert.ok(pool.every(item => item.mediaType === 'movie' && Number(item.year) < 2000 && /^tt\d+$/.test(item.imdbId)));
  let previousId;
  for (let refresh = 0; refresh < 100; refresh++) {
    const next = pickNextHeroBackdrop(pool, previousId);
    assert.ok(pool.includes(next));
    assert.notEqual(next.id, previousId);
    previousId = next.id;
  }
  assert.equal(pickNextHeroBackdrop([]), undefined);
  assert.equal(pickNextHeroBackdrop([pool[0]], pool[0].id), pool[0]);
});

test('live top rated results use the correct endpoints, media types, and rating order', async () => {
  const previousKey = process.env.TMDB_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.TMDB_API_KEY = 'test-only-key';
  const requests = [];
  globalThis.fetch = async url => {
    const path = new URL(url).pathname;
    requests.push(path);
    return Response.json({ results: path.includes('/tv/')
      ? [{ id: 1, name: 'Top show', vote_average: 9.5 }]
      : [{ id: 2, title: 'Top movie', vote_average: 9 }] });
  };
  try {
    const catalog = await getBrowseMedia('top-rated');
    assert.deepEqual(requests.sort(), ['/3/movie/top_rated', '/3/tv/top_rated']);
    assert.equal(catalog.isDemo, false);
    assert.deepEqual(catalog.results.map(item => item.media_type), ['tv', 'movie']);
    assert.deepEqual(catalog.results.map(item => item.vote_average), [9.5, 9]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousKey;
  }
});

test('without credentials both catalogs and the trend pools contain sample titles', async () => {
  const previousKey = process.env.TMDB_API_KEY;
  delete process.env.TMDB_API_KEY;
  try {
    const catalog = await getBrowseMedia('top-rated');
    assert.equal(catalog.isDemo, true);
    assert.ok(catalog.results.some(item => item.media_type === 'movie'));
    assert.ok(catalog.results.some(item => item.media_type === 'tv'));
    assert.ok(catalog.results.every((item, index, all) => index === 0 || all[index - 1].vote_average >= item.vote_average));
    for (const type of ['movie', 'tv']) {
      const candidates = await getTrendingMedia(type);
      assert.ok(candidates.length >= 10);
      assert.ok(candidates.every(item => item.media_type === type));
    }
  } finally {
    if (previousKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = previousKey;
  }
});
