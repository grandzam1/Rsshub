import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const base=process.env.RSSHUB_BASE ?? 'http://127.0.0.1:1200';
const routes=[
'/github/repos/DIYgod','/github/issue/DIYgod/RSSHub/open','/youtube/channel/UCDwDMPOZfxVV0x_dz0eQ8KQ','/telegram/blog','/hackernews/best','/bbc/world-asia','/medium/feed/zhgchgli','/mastodon/acct/Mastodon@mastodon.social/statuses','/amazon/awsblogs','/gov/beijing/jw/tzgg','/v2ex/topics/latest','/cnblogs/aggsite/topdiggs','/juejin/category/frontend','/zhihu/hot','/9to5/mac/aapl','/arxiv/search_query=all:electron&start=0&max_results=10','/acm/amturingaward','/bilibili/user/article/334958638','/github/issue/DIYgod/RSSHub/closed','/youtube/charts'
];
const duration=Number(process.env.SOAK_SECONDS||1800), interval=30;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now(); let reqTotal=0, errors=0, latency=[];
async function request(path){const t=performance.now(); try {const r=await fetch(base+path,{signal:AbortSignal.timeout(45000),headers:{'user-agent':'RSSHub-v3-soak/1.0'}}); await r.arrayBuffer(); const ms=+(performance.now()-t).toFixed(2); reqTotal++; latency.push(ms); if(!r.ok) errors++; return {status:r.status,ms};} catch(e){const ms=+(performance.now()-t).toFixed(2); reqTotal++; errors++; latency.push(ms); return {status:0,ms,error:e.message};}}
async function procStats(){
  let rsshub={pid:'',rssMB:0,cpuPct:0}, redis={memoryMB:0,keys:0};
  try { const {stdout}=await exec('bash',['-lc',"p=$(pgrep -f 'node dist/index.mjs' | head -1); if [ -n \"$p\" ]; then ps -p $p -o pid=,rss=,pcpu=; fi"]); const a=stdout.trim().split(/\s+/); if(a.length>=3) rsshub={pid:a[0],rssMB:+(Number(a[1])/1024).toFixed(2),cpuPct:+Number(a[2]).toFixed(2)}; } catch{}
  try { const {stdout}=await exec('bash',['-lc',"m=$(redis-cli info memory 2>/dev/null | awk -F: '/^used_memory:/{print $2}'); k=$(redis-cli dbsize 2>/dev/null | tr -d '\r'); echo \"$m $k\""]); const a=stdout.trim().split(/\s+/); redis={memoryMB:+(Number(a[0]||0)/1048576).toFixed(4),keys:Number(a[1]||0)}; } catch{}
  let disk={installMB:0,nodeModulesMB:0,distMB:0,logsMB:0,redisDumpMB:0};
  try { const {stdout}=await exec('bash',['-lc',"du -sm /home/ubuntu/rsshub /home/ubuntu/rsshub/node_modules /home/ubuntu/rsshub/dist /home/ubuntu/rsshub/*.log /var/lib/redis/dump.rdb 2>/dev/null | awk '{sum[$2]+=$1} END{for(k in sum) print k,sum[k]}'"]); for(const line of stdout.trim().split('\n')){const [path,mb]=line.trim().split(/\s+/); if(path==='/home/ubuntu/rsshub')disk.installMB=+mb; else if(path.includes('/node_modules'))disk.nodeModulesMB=+mb; else if(path.includes('/dist'))disk.distMB=+mb; else if(path.includes('.log'))disk.logsMB+=+mb; else if(path.includes('dump.rdb'))disk.redisDumpMB=+mb;}}catch{}
  let net={rxBytes:0,txBytes:0};
  try {const {stdout}=await exec('bash',['-lc',`awk -F'[: ]+' '$1!="" && $1!="lo" {rx+=$3; tx+=$11} END{print rx,tx}' /proc/net/dev`]);const a=stdout.trim().split(/\s+/);net={rxBytes:Number(a[0]||0),txBytes:Number(a[1]||0)};}catch{}
  return {elapsedSec:Math.round((Date.now()-t0)/1000),rsshub,redis,disk,net,requestTotal:reqTotal,errorTotal:errors,intervalAvgMs:latency.length?+(latency.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,latency.length)).toFixed(2):0};
}
const rows=[]; let tick=0; console.log(`SOAK_START ${new Date().toISOString()} duration=${duration}s routes=${routes.length}`);
while((Date.now()-t0)/1000 < duration){
  const due=Math.round((Date.now()-t0)/1000);
  if(tick%2===0){ const batch=routes.slice((tick/2)%routes.length).concat(routes).slice(0,20); const rs=await Promise.all(batch.map(request)); console.log(`TRAFFIC t=${due} n=${rs.length} ok=${rs.filter(x=>x.status>=200&&x.status<300).length}`); }
  if(tick%10===0 && tick>0){ const batch=routes.slice((tick/10)%routes.length, (tick/10)%routes.length+5); const rs=await Promise.all(batch.map(request)); console.log(`PARALLEL t=${due} n=${rs.length} ok=${rs.filter(x=>x.status>=200&&x.status<300).length}`); }
  const s=await procStats(); rows.push(s); await fs.appendFile(process.env.RSSHUB_RESOURCE_LOG ?? 'resource-log.csv', `${s.elapsedSec},${s.rsshub.pid},${s.rsshub.rssMB},${s.rsshub.cpuPct},${s.redis.memoryMB},${s.redis.keys},${s.disk.installMB},${s.disk.nodeModulesMB},${s.disk.distMB},${s.disk.logsMB},${s.disk.redisDumpMB},${s.net.rxBytes},${s.net.txBytes},${s.requestTotal},${s.errorTotal},${s.intervalAvgMs}\n`); tick++; await sleep(Math.max(1000, interval*1000-(Date.now()-(t0+due*1000))));
}
await fs.writeFile(process.env.RSSHUB_SOAK_SUMMARY ?? 'soak-summary-v3.json',JSON.stringify({startedAt:new Date(t0).toISOString(),durationSeconds:Math.round((Date.now()-t0)/1000),samples:rows.length,requests:reqTotal,errors,rows},null,2)); console.log(`SOAK_DONE samples=${rows.length} requests=${reqTotal} errors=${errors}`);
