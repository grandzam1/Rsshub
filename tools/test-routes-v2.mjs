import fs from 'node:fs/promises';
import Parser from 'rss-parser';

const base = process.env.RSSHUB_BASE ?? 'http://127.0.0.1:1200';
const routes = [
  // Previous 16 distinct routes.
  ['previous', 'dev', 'GitHub trending (old example)', '/github/trending/daily'],
  ['previous', 'forum', 'Reddit programming (old example)', '/reddit/subreddit/programming'],
  ['previous', 'dev', 'GitHub repositories', '/github/repos/DIYgod'],
  ['previous', 'video', 'YouTube channel', '/youtube/channel/UCDwDMPOZfxVV0x_dz0eQ8KQ'],
  ['previous', 'social', 'Telegram blog', '/telegram/blog'],
  ['previous', 'dev', 'Hacker News best', '/hackernews/best'],
  ['previous', 'news', 'BBC World Asia', '/bbc/world-asia'],
  ['previous', 'video', 'Bilibili user dynamic', '/bilibili/user/dynamic/2267573'],
  ['previous', 'blog', 'Medium user feed', '/medium/feed/zhgchgli'],
  ['previous', 'blog', 'Substack mangoread', '/substack/subscribe/mangoread'],
  ['previous', 'social', 'Mastodon account', '/mastodon/acct/Mastodon@mastodon.social/statuses'],
  ['previous', 'social', 'Pixiv weekly ranking', '/pixiv/ranking/week'],
  ['previous', 'shopping/dev', 'Amazon AWS blogs', '/amazon/awsblogs'],
  ['previous', 'government', 'Beijing education notices', '/gov/beijing/jw/tzgg'],
  ['previous', 'forum', 'V2EX latest topics', '/v2ex/topics/latest'],
  ['previous', 'blog/dev', 'CNBlogs top diggs', '/cnblogs/aggsite/topdiggs'],
  // Ten new source-confirmed routes.
  ['new', 'dev', 'GitHub open issues', '/github/issue/DIYgod/RSSHub/open'],
  ['new', 'video', 'YouTube charts', '/youtube/charts'],
  ['new', 'dev/blog', 'Juejin frontend category', '/juejin/category/frontend'],
  ['new', 'social/news', 'Zhihu hot', '/zhihu/hot'],
  ['new', 'news', '9to5Mac Apple tag', '/9to5/mac/aapl'],
  ['new', 'dev/research', 'arXiv electron search', '/arxiv/search_query=all:electron&start=0&max_results=10'],
  ['new', 'dev/awards', 'ACM Turing Award', '/acm/amturingaward'],
  ['new', 'government', 'Anhui science and technology notices', '/gov/ah/kjt'],
  ['new', 'video', 'Bilibili user article', '/bilibili/user/article/334958638'],
  ['new', 'blog', 'Medium cybersecurity tag', '/medium/tag/imsingee/cybersecurity'],
  // Required fresh public retry probes for the previously blocked providers.
  ['retry', 'video', 'Bilibili different public account', '/bilibili/user/dynamic/208259'],
  ['retry', 'blog', 'Substack different public feed', '/substack/subscribe/stratechery'],
];

const parser = new Parser({ customFields: { item: [['media:content', 'mediaContent', {keepArray: true}], ['content:encoded', 'contentEncoded']] } });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const text = (v) => (v == null ? '' : String(v));
const validFeed = (body, contentType) => /<(rss|feed|rdf:RDF)(?:\s|>)/i.test(body.slice(0, 10000)) || /application\/(rss|atom)\+xml|application\/xml|text\/xml/i.test(contentType);
const sourceMissing = (path) => path === '/github/trending/daily' || path === '/reddit/subreddit/programming';

async function one(path) {
  const url = `${base}${path}`;
  const started = performance.now();
  let httpStatus = 0, contentType = '', body = '', error = '';
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'user-agent': 'RSSHub-sandbox-v2/1.0' } });
    httpStatus = response.status;
    contentType = response.headers.get('content-type') ?? '';
    body = await response.text();
    if (!response.ok) error = `HTTP ${response.status}`;
  } catch (e) { error = `${e.name}: ${e.message}`; }
  const responseMs = Math.round((performance.now() - started) * 100) / 100;
  const feed = { valid: false, title: '', description: '', link: '', itemCount: 0, pubDate: false, author: false, categories: false, imagesMedia: false, fullContent: false, summary: false };
  if (body) {
    try {
      const parsed = await parser.parseString(body);
      feed.valid = Boolean(parsed.title || parsed.items?.length) && validFeed(body, contentType);
      feed.title = text(parsed.title); feed.description = text(parsed.description); feed.link = text(parsed.link);
      const items = parsed.items ?? []; feed.itemCount = items.length;
      feed.pubDate = items.some(i => i.pubDate || i.isoDate);
      feed.author = items.some(i => i.creator || i.author || i['dc:creator']);
      feed.categories = items.some(i => (i.categories?.length ?? 0) > 0);
      feed.imagesMedia = items.some(i => i.enclosure?.url || i.mediaContent || i['media:content'] || i.image || i.itunes?.image);
      feed.fullContent = items.some(i => text(i.contentEncoded || i['content:encoded'] || i.content).length > text(i.contentSnippet || i.summary).length + 100);
      feed.summary = items.some(i => i.contentSnippet || i.summary || i.description);
    } catch (e) { if (!error) error = `Feed parse error: ${e.message}`; }
  }
  if (!feed.valid && !error) error = body ? `Not a valid RSS/Atom feed (${contentType || 'no content-type'})` : 'Empty response';
  return { url, httpStatus, responseMs, contentType, feed, error, bodyPreview: body.replace(/\s+/g, ' ').slice(0, 300) };
}

function classify(path, result) {
  if (sourceMissing(path) || result.httpStatus === 404 && sourceMissing(path)) return 'NOT IN THIS VERSION';
  if (path.startsWith('/pixiv/')) return 'NEEDS CREDENTIALS';
  if (path.startsWith('/bilibili/') && (result.httpStatus === 503 || /412/.test(result.error))) return 'BLOCKED';
  if (path.startsWith('/substack/') && (result.httpStatus === 503 || /403/.test(result.error))) return 'BLOCKED';
  if (result.httpStatus >= 200 && result.httpStatus < 300 && result.feed.valid && result.feed.itemCount > 0) return 'WORKS';
  if (result.httpStatus >= 200 && result.httpStatus < 300 && result.feed.valid) return 'PARTIAL';
  return 'FAILS';
}

const results = [];
for (const [set, category, name, path] of routes) {
  const first = await one(path);
  await sleep(150);
  const repeat = await one(path);
  const status = classify(path, first);
  const row = { set, category, name, path, url: first.url, status, httpStatus: first.httpStatus, responseMs: first.responseMs, repeatMs: repeat.responseMs, repeatHttpStatus: repeat.httpStatus, repeatValidFeed: repeat.feed.valid, feed: first.feed, error: first.error, repeatError: repeat.error, bodyPreview: first.bodyPreview };
  results.push(row);
  console.log(JSON.stringify(row));
  await sleep(150);
}
const counts = Object.fromEntries([...new Set(results.map(r => r.status))].map(s => [s, results.filter(r => r.status === s).length]));
const output = { base, generatedAt: new Date().toISOString(), redisUrlConfigured: Boolean(process.env.REDIS_URL), routeCount: results.length, counts, routes: results };
await fs.writeFile(process.env.RSSHUB_RESULTS_JSON ?? 'route-results.json', JSON.stringify(output, null, 2));

const cols = ['set','category','name','path','url','status','httpStatus','responseMs','repeatMs','repeatHttpStatus','repeatValidFeed','feedValid','itemCount','title','description','link','pubDate','author','categories','imagesMedia','fullContent','summary','error','repeatError'];
const csvEscape = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
const csvRows = [cols.join(',')];
for (const r of results) {
  const f = r.feed;
  const vals = [r.set,r.category,r.name,r.path,r.url,r.status,r.httpStatus,r.responseMs,r.repeatMs,r.repeatHttpStatus,r.repeatValidFeed,f.valid,f.itemCount,f.title,f.description,f.link,f.pubDate,f.author,f.categories,f.imagesMedia,f.fullContent,f.summary,r.error,r.repeatError];
  csvRows.push(vals.map(csvEscape).join(','));
}
await fs.writeFile(process.env.RSSHUB_RESULTS_CSV ?? 'route-results.csv', csvRows.join('\n') + '\n');
console.log(JSON.stringify({ counts, routeCount: results.length }));
