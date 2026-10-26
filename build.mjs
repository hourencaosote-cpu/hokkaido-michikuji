import {generatePwa} from './pwa.mjs';
import {generateOgp,ogpPNG} from './ogp.mjs';
import {fortuneGrades} from './fortune.js';
import {mkdirSync,copyFileSync,rmSync,writeFileSync} from 'node:fs';
import {stations,stationPath} from './model.js';
import {renderPage} from './pages.mjs';
const root=new URL('./',import.meta.url),dist=new URL('./dist/',import.meta.url);
rmSync(dist,{recursive:true,force:true});mkdirSync(dist,{recursive:true});
for(const file of ['styles.css','app.js','core.js','data.js','favicon.svg','guides.js','media.js','stamps.js','model.js','components.js','hokkaido-biei.jpg','hokkaido-biei-road.jpg','gallery.js','geo.js','coordinates.js','fortune.js','share.js','motion.js','pwa-client.js'])copyFileSync(new URL(file,root),new URL(file,dist));
const routes=['home','roulette','stations','stamps','journal'];
for(const page of routes){const path=page==='home'?'':page+'/';mkdirSync(new URL(path,dist),{recursive:true});writeFileSync(new URL(path+'index.html',dist),renderPage(page));}
for(const station of stations){const path=stationPath(station).slice(1);mkdirSync(new URL(path,dist),{recursive:true});writeFileSync(new URL(path+'index.html',dist),renderPage('station',station));}
for(const s of stations)for(const f of fortuneGrades){const path=`share/${s.id}/${f.key}/`;mkdirSync(new URL(path,dist),{recursive:true});writeFileSync(new URL(path+'index.html',dist),renderPage('station',s,f));}
const generated=generateOgp(stations,dist);writeFileSync(new URL('ogp/default.png',dist),ogpPNG({name:'次の寄り道は、運まかせ。',area:'北海道',town:'128の道の駅'},null));console.log('OGP images newly rendered:',generated);
writeFileSync(new URL('404.html',dist),renderPage('404'));
const origin='https://hokkaido-michikuji.vercel.app';
const paths=['/','/roulette/','/stations/','/stamps/','/journal/',...stations.map(stationPath)];
writeFileSync(new URL('sitemap.xml',dist),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>`<url><loc>${origin+path}</loc></url>`).join('')+'</urlset>');
writeFileSync(new URL('robots.txt',dist),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
generatePwa(dist,renderPage('404'));
writeFileSync(new URL('index.html',root),renderPage('home'));
console.log(`Built ${paths.length} real static pages + 404 → dist/`);
