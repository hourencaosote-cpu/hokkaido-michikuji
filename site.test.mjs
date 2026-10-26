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

test('service worker serves a previously visited station offline and isolates cache updates',async()=>{
 const vm=await import('node:vm'),events={},stores=new Map(),origin='https://hokkaido-michikuji.vercel.app';let online=true;
 const key=input=>new URL(typeof input==='string'?input:input.url,origin).href;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return{async addAll(paths){for(const p of paths)store.set(key(p),new Response('precached '+p));},async match(request){return store.get(key(request))?.clone();},async put(request,response){store.set(key(request),response.clone());},async keys(){return [...store.keys()].map(url=>({url}));},async delete(request){return store.delete(key(request));}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 stores.set('another-app-cache',new Map());stores.set('michikuji-v-obsolete',new Map());
 const scope={self:{location:{origin},clients:{async claim(){}},addEventListener(name,fn){events[name]=fn;},skipWaiting(){}},caches,URL,Response,fetch:async request=>{if(!online)throw Error('offline');return new Response('station page '+key(request));}};
 vm.runInNewContext(readFileSync(new URL('./dist/sw.js',import.meta.url),'utf8'),scope);let pending;events.install({waitUntil(p){pending=p;}});await pending;events.activate({waitUntil(p){pending=p;}});await pending;assert.ok(stores.has('another-app-cache'));assert.ok(!stores.has('michikuji-v-obsolete'));
 const load=async path=>{let response;events.fetch({request:{url:origin+path,method:'GET',mode:'navigate'},respondWith(p){response=p;}});return(await response).text();};
 const saved=await load('/stations/949/');online=false;assert.equal(await load('/stations/949/'),saved);assert.match(await load('/stations/not-saved/'),/precached \/offline.html/);
 let intercepted=false;events.fetch({request:{url:'https://www.google-analytics.com/g/collect',method:'GET'},respondWith(){intercepted=true;}});assert.equal(intercepted,false);
 const manifest=JSON.parse(readFileSync(new URL('./dist/manifest.webmanifest',import.meta.url)));assert.equal(manifest.display,'standalone');for(const icon of manifest.icons){const png=readFileSync(new URL('./dist'+icon.src,import.meta.url));assert.equal(png.readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
});
