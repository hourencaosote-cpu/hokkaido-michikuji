import {mkdirSync,copyFileSync,rmSync} from 'node:fs';
const root=new URL('./',import.meta.url),dist=new URL('./dist/',import.meta.url);
rmSync(dist,{recursive:true,force:true});mkdirSync(dist,{recursive:true});
for(const file of ['index.html','styles.css','app.js','core.js','data.js','landscape.svg','favicon.svg','guides.js','media.js','hokkaido-biei.jpg'])copyFileSync(new URL(file,root),new URL(file,dist));
console.log('Built static site → dist/');
