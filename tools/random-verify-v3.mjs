import fs from 'node:fs/promises';
import Parser from 'rss-parser';

const base = process.env.RSSHUB_BASE ?? 'http://127.0.0.1:1200';
const parser = new Parser();
const candidates = [
  // Existing public routes.
  {file:'lib/routes/github/repos.ts', path:'/github/repos/DIYgod', cat:'dev', upstream:'https://github.com/DIYgod'},
  {file:'lib/routes/github/issue.ts', path:'/github/issue/DIYgod/RSSHub/open', cat:'dev', upstream:'https://github.com/DIYgod/RSSHub/issues'},
  {file:'lib/routes/github/activity.ts', path:'/github/activity/DIYgod', cat:'dev', upstream:'https://github.com/DIYgod'},
  {file:'lib/routes/github/pulls.ts', path:'/github/pull/DIYgod/RSSHub', cat:'dev', upstream:'https://github.com/DIYgod/RSSHub/pulls'},
  {file:'lib/routes/github/branches.ts', path:'/github/branches/DIYgod/RSSHub', cat:'dev', upstream:'https://github.com/DIYgod/RSSHub/branches'},
  {file:'lib/routes/github/discussions.ts', path:'/github/discussion/DIYgod/RSSHub', cat:'forum/dev', upstream:'https://github.com/DIYgod/RSSHub/discussions'},
  {file:'lib/routes/github/trending.tsx', path:'/github/trending/daily/javascript/en', cat:'dev', upstream:'https://github.com/trending/javascript?since=daily'},
  {file:'lib/routes/youtube/channel.ts', path:'/youtube/channel/UCDwDMPOZfxVV0x_dz0eQ8KQ', cat:'video', upstream:'https://www.youtube.com/feeds/videos.xml?channel_id=UCDwDMPOZfxVV0x_dz0eQ8KQ'},
  {file:'lib/routes/youtube/charts.ts', path:'/youtube/charts', cat:'video', upstream:'https://charts.youtube.com/charts/TopVideos/global'},
  {file:'lib/routes/youtube/playlist.ts', path:'/youtube/playlist/PLqQ1RwlxOgeLTJ1f3fNMSwhjVgaWKo_9Z', cat:'video', upstream:'https://www.youtube.com/playlist?list=PLqQ1RwlxOgeLTJ1f3fNMSwhjVgaWKo_9Z'},
  {file:'lib/routes/telegram/blog.ts', path:'/telegram/blog', cat:'social', upstream:'https://telegram.org/blog'},
  {file:'lib/routes/telegram/channel.ts', path:'/telegram/channel/awesomeRSSHub', cat:'social', upstream:'https://t.me/awesomeRSSHub'},
  {file:'lib/routes/hackernews/index.ts', path:'/hackernews/best', cat:'dev/news', upstream:'https://news.ycombinator.com/best'},
  {file:'lib/routes/bbc/index.ts', path:'/bbc/world-asia', cat:'news', upstream:'https://feeds.bbci.co.uk/news/world/asia/rss.xml'},
  {file:'lib/routes/medium/feed.ts', path:'/medium/feed/zhgchgli', cat:'blog', upstream:'https://medium.com/feed/@zhgchgli'},
  {file:'lib/routes/mastodon/acct.ts', path:'/mastodon/acct/Mastodon@mastodon.social/statuses', cat:'social', upstream:'https://mastodon.social/@Mastodon.rss'},
  {file:'lib/routes/amazon/awsblogs.ts', path:'/amazon/awsblogs', cat:'shopping/dev', upstream:'https://aws.amazon.com/blogs/aws/feed/'},
  {file:'lib/routes/gov/beijing/jw/tzgg.ts', path:'/gov/beijing/jw/tzgg', cat:'government', upstream:'http://jw.beijing.gov.cn/tzgg'},
  {file:'lib/routes/v2ex/topics.ts', path:'/v2ex/topics/latest', cat:'forum', upstream:'https://www.v2ex.com/?tab=latest'},
  {file:'lib/routes/cnblogs/common.ts', path:'/cnblogs/aggsite/topdiggs', cat:'blog/dev', upstream:'https://www.cnblogs.com/aggsite/topdiggs'},
  {file:'lib/routes/bilibili/article.ts', path:'/bilibili/user/article/334958638', cat:'video/blog', upstream:'https://space.bilibili.com/334958638/article'},
  // Five specifically added routes not in the previous report.
  {file:'lib/routes/abc/index.ts', path:'/abc/wa', cat:'news', upstream:'https://abcnews.go.com/International'},
  {file:'lib/routes/arxiv/query.ts', path:'/arxiv/search_query=all:electron&start=0&max_results=10', cat:'research/dev', upstream:'https://export.arxiv.org/api/query?search_query=all:electron&start=0&max_results=10'},
  {file:'lib/routes/acm/amturingaward.ts', path:'/acm/amturingaward', cat:'awards/dev', upstream:'https://amturing.acm.org/byyear.cfm'},
  {file:'lib/routes/juejin/category.ts', path:'/juejin/category/frontend', cat:'dev/blog', upstream:'https://juejin.cn/frontend'},
  {file:'lib/routes/zhihu/hot.ts', path:'/zhihu/hot', cat:'social/news', upstream:'https://www.zhihu.com/hot'},
  // Additional public documented routes to provide a random pool.
  {file:'lib/routes/9to5/subsite.ts', path:'/9to5/mac/aapl', cat:'news', upstream:'https://9to5mac.com/guides/aapl/feed/'},
  {file:'lib/routes/medium/tag.ts', path:'/medium/tag/imsingee/cybersecurity', cat:'blog', upstream:'https://medium.com/@imsingee/feed'},
  {file:'lib/routes/juejin/trending.ts', path:'/juejin/trending/ios/monthly', cat:'dev/blog', upstream:'https://juejin.cn/trending/ios/monthly'},
  {file:'lib/routes/zhihu/daily.ts', path:'/zhihu/daily', cat:'social/news', upstream:'https://daily.zhihu.com/'},
  {file:'lib/routes/zhihu/bookstore/newest.ts', path:'/zhihu/bookstore/newest', cat:'shopping/books', upstream:'https://www.zhihu.com/pub/bookstore'},
  {file:'lib/routes/gov/ccdi/index.ts', path:'/gov/ccdi/yaowenn', cat:'government', upstream:'https://www.ccdi.gov.cn/yaowenn/'},
  {file:'lib/routes/gov/caict/bps.ts', path:'/gov/caict/bps', cat:'government', upstream:'https://www.caict.ac.cn/kxyj/qwfb/bps/'},
  {file:'lib/routes/gov/beijing/bjedu/gh.ts', path:'/gov/beijing/bjedu/gh', cat:'government', upstream:'https://gh.bjedu.cn/ghsite/'},
  {file:'lib/routes/abc/index.ts', path:'/abc/technology', cat:'news', upstream:'https://abcnews.go.com/Technology'},
  {file:'lib/routes/acm/amturingaward.ts', path:'/acm/amturingaward', cat:'awards/dev', upstream:'https://amturing.acm.org/byyear.cfm'},
  {file:'lib/routes/arxiv/query.ts', path:'/arxiv/search_query=cat:cs.AI&start=0&max_results=10', cat:'research/dev', upstream:'https://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=10'},
  {file:'lib/routes/youtube/user.ts', path:'/youtube/user/@JFlaMusic', cat:'video/music', upstream:'https://www.youtube.com/@JFlaMusic'},
  {file:'lib/routes/youtube/shows.ts', path:'/youtube/shows/@LinusTechTips', cat:'video/tech', upstream:'https://www.youtube.com/@LinusTechTips/shows'},
  {file:'lib/routes/telegram/stories.ts', path:'/telegram/stories/telegram', cat:'social', upstream:'https://t.me/telegram'},
  {file:'lib/routes/v2ex/tab.ts', path:'/v2ex/tab/hot', cat:'forum', upstream:'https://www.v2ex.com/?tab=hot'},
  {file:'lib/routes/v2ex/xna.ts', path:'/v2ex/xna', cat:'forum', upstream:'https://www.v2ex.com/xna'},
  {file:'lib/routes/amazon/awsblogs.ts', path:'/amazon/awsblogs/en_US', cat:'shopping/dev', upstream:'https://aws.amazon.com/blogs/aws/feed/'},
  {file:'lib/routes/bilibili/app.ts', path:'/bilibili/app/android', cat:'video', upstream:'https://app.bilibili.com/'},
  {file:'lib/routes/bilibili/bilibili-recommend.ts', path:'/bilibili/precious', cat:'video', upstream:'https://www.bilibili.com/'},
  {file:'lib/routes/juejin/books.ts', path:'/juejin/books', cat:'shopping/dev', upstream:'https://juejin.cn/books'},
  {file:'lib/routes/juejin/aicoding.ts', path:'/juejin/aicoding', cat:'dev', upstream:'https://aicoding.juejin.cn/'},
  {file:'lib/routes/github/topic.ts', path:'/github/topics/framework', cat:'dev', upstream:'https://github.com/topics/framework'},
  {file:'lib/routes/github/search.ts', path:'/github/search/RSSHub/bestmatch/desc', cat:'dev', upstream:'https://github.com/search?q=RSSHub&type=repositories'},
  {file:'lib/routes/github/wiki.ts', path:'/github/wiki/flutter/flutter/Roadmap', cat:'dev', upstream:'https://github.com/flutter/flutter/wiki/Roadmap'},
  {file:'lib/routes/9to5/subsite.ts', path:'/9to5/iphone/apple', cat:'news', upstream:'https://9to5mac.com/guides/apple/feed/'},
];

async function existsAndExample(c) {
  try {
    const s = await fs.readFile(new URL(`../${c.file}`, import.meta.url), 'utf8');
    return s.includes(`example: '${c.path}'`) || s.includes(`example: \"${c.path}\"`);
  } catch { return false; }
}
const excludedCredentialPaths = new Set(['/medium/tag/imsingee/cybersecurity']);
const pool = [];
for (const c of candidates) if (!excludedCredentialPaths.has(c.path) && await existsAndExample(c)) pool.push(c);
if (pool.length < 30) throw new Error(`Only ${pool.length} valid documented candidates; need at least 30`);

function rng(seed) { let x = seed >>> 0; return () => ((x = Math.imul(1664525, x) + 1013904223) >>> 0) / 4294967296; }
function sample(seed, n) { const a = [...pool], r = rng(seed), out=[]; while (out.length<n) { const i=Math.floor(r()*a.length); out.push(a.splice(i,1)[0]); } return out; }
const seeds = [20261117, 20261118];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = u => { try { const x=new URL(u); x.hash=''; x.search=''; return x.toString().replace(/\/$/,''); } catch { return String(u).replace(/\/$/,''); } };
const dateValue = x => x?.isoDate || x?.pubDate || x?.published || x?.updated || '';
const compare = (a,b) => {
  const title = normText(a?.title) === normText(b?.title);
  const link = norm(a?.link||'') === norm(b?.link||'') || norm(a?.link||'').endsWith(norm(b?.link||'')) || norm(b?.link||'').endsWith(norm(a?.link||''));
  const da = dateValue(a), db=dateValue(b); const date = !da || !db ? false : Math.abs(new Date(da)-new Date(db)) < 86400000;
  return {title,link,date,matched:title&&link&&date};
};
const normText = s => String(s||'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().toLowerCase();
async function fetchRSSHub(path) {
  const t=performance.now(); let res, body='', error='';
  try { res=await fetch(base+path,{signal:AbortSignal.timeout(45000),headers:{'user-agent':'RSSHub-v3-verifier/1.0'}}); body=await res.text(); } catch(e) { error=`${e.name}: ${e.message}`; }
  const ms=+(performance.now()-t).toFixed(2); let feed={valid:false,title:'',description:'',link:'',items:[]};
  if (body) try { const p=await parser.parseString(body); feed={valid:/<(rss|feed|rdf:RDF)(?:\s|>)/i.test(body.slice(0,10000)),title:p.title||'',description:p.description||'',link:p.link||'',items:p.items||[]}; } catch(e) { error=error||`Feed parse error: ${e.message}`; }
  return {httpStatus:res?.status||0,responseMs:ms,feed,error};
}
async function fetchUpstream(url) {
  const t=performance.now(); let res, body='', error='';
  try { res=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'user-agent':'Mozilla/5.0 RSSHub-v3-verifier/1.0','accept':'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9'}}); body=await res.text(); } catch(e) { error=`${e.name}: ${e.message}`; }
  let feed=null;
  if (body) try { const p=await parser.parseString(body); if (p.items?.length || /<(rss|feed|rdf:RDF)/i.test(body.slice(0,10000))) feed={title:p.title||'',description:p.description||'',link:p.link||'',items:p.items||[]}; } catch {}
  return {httpStatus:res?.status||0,responseMs:+(performance.now()-t).toFixed(2),contentType:res?.headers.get('content-type')||'',feed,error};
}
async function run(seed) {
  const selected=sample(seed,30), rows=[];
  console.log(`SEED ${seed} selected ${selected.length} routes from pool ${pool.length}`);
  for (const c of selected) {
    const first=await fetchRSSHub(c.path); await sleep(100); const second=await fetchRSSHub(c.path); const up=await fetchUpstream(c.upstream);
    let verification='UNVERIFIABLE', verificationReason='';
    if (!up.feed) verificationReason=`Upstream HTTP ${up.httpStatus} ${up.contentType || 'non-feed response'}; independent item comparison unavailable`;
    else if (!first.feed.valid || first.feed.items.length<3 || up.feed.items.length<3) verificationReason='Fewer than 3 parseable items on RSSHub or upstream feed';
    else {
      const checks=[0,1,2].map(i=>compare(first.feed.items[i],up.feed.items[i]));
      verification=checks.every(x=>x.matched)?'VERIFIED':'MISMATCH'; verificationReason=JSON.stringify(checks);
    }
    const status=first.httpStatus>=200&&first.httpStatus<300&&first.feed.valid&&first.feed.items.length?'WORKS':first.httpStatus===404?'NOT IN THIS VERSION':'FAILS';
    const f=first.feed; const metadata={title:!!f.title,description:!!f.description,link:!!f.link,pubDate:f.items.some(i=>i.pubDate||i.isoDate),author:f.items.some(i=>i.creator||i.author||i['dc:creator']),categories:f.items.some(i=>i.categories?.length),media:f.items.some(i=>i.enclosure?.url||i['media:content']),fullContent:f.items.some(i=>String(i.content||i['content:encoded']||'').length>String(i.contentSnippet||i.summary||'').length+100),summary:f.items.some(i=>i.contentSnippet||i.summary||i.description)};
    rows.push({seed,sourceFile:c.file,category:c.cat,routePath:c.path,url:base+c.path,upstreamUrl:c.upstream,status,httpStatus:first.httpStatus,responseMs:first.responseMs,repeatMs:second.responseMs,validRSSAtom:f.valid,itemCount:f.items.length,metadata,verification,verificationReason,error:first.error||'',repeatError:second.error||'',upstreamHttpStatus:up.httpStatus,upstreamResponseMs:up.responseMs});
  }
  return rows;
}
const runs=[]; for (const s of seeds) runs.push(await run(s));
const rows=runs.flat();
const summary={routeRows:rows.length,runCount:runs.length,perRun:runs.map(r=>({seed:r[0].seed,count:r.length,statuses:Object.fromEntries([...new Set(r.map(x=>x.status))].map(s=>[s,r.filter(x=>x.status===s).length])),verification:Object.fromEntries([...new Set(r.map(x=>x.verification))].map(s=>[s,r.filter(x=>x.verification===s).length]))})),statusCounts:Object.fromEntries([...new Set(rows.map(x=>x.status))].map(s=>[s,rows.filter(x=>x.status===s).length])),verificationCounts:Object.fromEntries([...new Set(rows.map(x=>x.verification))].map(s=>[s,rows.filter(x=>x.verification===s).length])),poolSize:pool.length,seeds};
await fs.writeFile(process.env.RSSHUB_RESULTS_JSON ?? 'route-results-v3.json',JSON.stringify({generatedAt:new Date().toISOString(),base,summary,runs},null,2));
const cols=['seed','sourceFile','category','routePath','url','upstreamUrl','status','httpStatus','responseMs','repeatMs','validRSSAtom','itemCount','title','description','link','pubDate','author','categories','media','fullContent','summary','verification','verificationReason','error','repeatError','upstreamHttpStatus','upstreamResponseMs'];
const esc=v=>`"${String(v??'').replaceAll('"','""')}"`; const lines=[cols.join(',')];
for(const r of rows){const m=r.metadata; lines.push([r.seed,r.sourceFile,r.category,r.routePath,r.url,r.upstreamUrl,r.status,r.httpStatus,r.responseMs,r.repeatMs,r.validRSSAtom,r.itemCount,m.title,m.description,m.link,m.pubDate,m.author,m.categories,m.media,m.fullContent,m.summary,r.verification,r.verificationReason,r.error,r.repeatError,r.upstreamHttpStatus,r.upstreamResponseMs].map(esc).join(','));}
await fs.writeFile(process.env.RSSHUB_RESULTS_CSV ?? 'route-results-v3.csv',lines.join('\n')+'\n');
console.log(JSON.stringify(summary));
