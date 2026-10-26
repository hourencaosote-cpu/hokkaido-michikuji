import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stations,stationPath} from './model.js';
import {filterStations} from './core.js';
import {esc} from './components.js';
const routes=['/','/roulette/','/stations/','/stamps/','/journal/',...stations.map(stationPath)];
test('all 133 real pages contain primary HTML, unique metadata, valid internal links and no placeholder credits',()=>{
 const titles=new Set();
 for(const route of routes){const html=readFileSync(new URL('./dist'+route+'index.html',import.meta.url),'utf8');assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,route);const title=html.match(/<title>(.*?)<\/title>/)[1];assert.ok(!titles.has(title),route);titles.add(title);assert.ok(html.includes(`rel="canonical" href="https://hokkaido-michikuji.vercel.app${route}"`),route);for(const [,href] of html.matchAll(/href="(\/[^"]*)"/g)){const url=new URL(href,'https://hokkaido-michikuji.vercel.app');const file='./dist'+url.pathname+(url.pathname.endsWith('/')?'index.html':'');assert.ok(existsSync(new URL(file,import.meta.url)),route+' -> '+href);}assert.ok(html.includes('Adam Jones'));}
 for(const s of stations){const html=readFileSync(new URL('./dist'+stationPath(s)+'index.html',import.meta.url),'utf8');assert.ok(html.includes(esc(s.guide.summary)));assert.ok(html.includes('id="stamp"'));assert.ok(html.includes(esc(s.stamp.hours)));}
});
test('stamp data cover all stations, separate conditions, and do not infer unconfirmed locations',()=>{
 const statuses=new Set(['24h','hours','conditional','unconfirmed']);
 for(const s of stations){const t=s.stamp;assert.ok(statuses.has(t.status),s.name);assert.ok(t.hours&&t.location&&t.sourceUrl&&t.checkedAt,s.name);assert.equal(typeof t.locationConfirmed,'boolean');assert.ok(new URL(t.sourceUrl).protocol.startsWith('http'));if(!t.locationConfirmed)assert.match(t.location,/記載なし|確認でき|未確認|不明/);}
 const filtered=filterStations(stations,{areas:[],facilities:[],query:'',stamp:'24h'});assert.ok(filtered.length>0);assert.ok(filtered.every(s=>s.stamp.status==='24h'));assert.ok(!filtered.some(s=>['3070','842','33477','2959'].includes(s.id)));
});

test('station OGPs have exact PNG dimensions and share variants preserve the chosen fortune',async()=>{
 const {fortuneGrades}=await import('./fortune.js');const {shareData,xIntent}=await import('./share.js');
 for(const s of stations)for(const f of [null,...fortuneGrades]){const name=s.id+(f?'-'+f.key:'')+'.png',png=readFileSync(new URL('./dist/ogp/'+name,import.meta.url));assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);if(f){const data=shareData(s,f.key),html=readFileSync(new URL('./dist/share/'+s.id+'/'+f.key+'/index.html',import.meta.url),'utf8');assert.ok(data.url.endsWith('/'+f.key+'/'));assert.ok(html.includes('/ogp/'+name));assert.ok(data.text.includes(f.label));assert.ok(xIntent(data).startsWith('https://twitter.com/intent/tweet?'));}}
});
