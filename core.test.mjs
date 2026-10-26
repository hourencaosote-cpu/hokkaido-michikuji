import test from 'node:test';
import assert from 'node:assert/strict';
import {stations} from './data.js';
import {areas,filterStations,randomIndex,landingAngle,readRecord} from './core.js';
const base=()=>({areas:[],facilities:[],query:'',excludeVisited:false,favoritesOnly:false});
test('128 active official stations, unique ids, valid regions and excluded deregistered stations',()=>{
  assert.equal(stations.length,128);assert.equal(new Set(stations.map(s=>s.id)).size,128);
  for(const s of stations){assert.ok(areas.includes(s.area));assert.ok(s.address&&s.town);assert.match(s.url,/^https:\/\/hokkaido-michinoeki.jp\/michinoeki\/\d+\/$/);assert.ok(![10,15,33].includes(s.number));}
  assert.equal(filterStations(stations,base()).length,128);
});
test('region is OR, facilities are AND, and search normalizes Japanese width',()=>{
  const actual=filterStations(stations,{...base(),areas:['道央','道南'],facilities:['restaurant','produce']});
  assert.ok(actual.length>10);assert.ok(actual.every(s=>['道央','道南'].includes(s.area)&&s.facilities.includes('restaurant')&&s.facilities.includes('produce')));
  assert.equal(filterStations(stations,{...base(),query:'２７５'}).at(0).id,'53300');
  assert.equal(filterStations(stations,{...base(),query:'ニセコ町'}).at(0).id,'949');
  assert.equal(filterStations(stations,{...base(),query:'存在しない駅ABC'}).length,0);
});
test('visited exclusion and favorites narrow the actual draw pool',()=>{
  const record={visited:['949'],favorites:['949','13542']};
  assert.deepEqual(filterStations(stations,{...base(),excludeVisited:true,favoritesOnly:true},record).map(s=>s.id),['13542']);
  assert.equal(filterStations(stations,{...base(),favoritesOnly:true},{favorites:[]}).length,0);
});
test('wheel pointer lands at the chosen equal-probability segment for every pool size',()=>{
  for(const count of [1,2,3,7,16,45,128])for(let index=0;index<count;index++){
    const angle=landingAngle(index,count);const underPointer=((360-angle)%360+360)%360;
    assert.equal(Math.floor(underPointer/(360/count)),index);
  }
});
test('random index rejects modulo-biased overflow and supports a single candidate',()=>{
  const values=[0xffffffff,5];let calls=0;const source={getRandomValues(a){a[0]=values[calls++];}};
  assert.equal(randomIndex(3,source),2);assert.equal(calls,2);
  assert.equal(randomIndex(1,{getRandomValues(a){a[0]=42;}}),0);
  assert.throws(()=>randomIndex(0),RangeError);
});
test('corrupt, unavailable and invalid persisted state is safe',()=>{
  assert.deepEqual(readRecord({getItem(){throw new Error('denied')}}),{visited:[],favorites:[],history:[]});
  assert.deepEqual(readRecord({getItem(){return '{broken'}}),{visited:[],favorites:[],history:[]});
  assert.deepEqual(readRecord({getItem(){return JSON.stringify({visited:['949','949',4],favorites:null,history:[{id:'949',at:10},{id:1,at:4}]})}}),{visited:['949'],favorites:[],history:[{id:'949',at:10}]});
});

test('all stations have source-backed guides and licensed photo credits; products are searchable', async()=>{
  const {guides}=await import('./guides.js');
  const {photos,heroPhoto}=await import('./media.js');
  assert.equal(Object.keys(guides).length,stations.length);
  assert.equal(Object.keys(photos).length,stations.length);
  for(const station of stations){
    const g=guides[station.id],p=photos[station.id];
    assert.ok(g.summary&&g.tagline&&g.specialties.length&&g.localProducts.length&&g.highlights.length,station.name);
    assert.equal(g.sourceUrl,station.url);
    assert.ok(['thumb.wikimedia.org','upload.wikimedia.org'].includes(new URL(p.src).hostname));
    assert.ok(p.author&&p.license&&new URL(p.licenseUrl).protocol==='https:',station.name);
  }
  assert.equal(heroPhoto.src,'hokkaido-biei.jpg');
  const enriched=stations.map(s=>({...s,searchText:guides[s.id].localProducts.join(' ')}));
  const found=filterStations(enriched,{areas:[],facilities:[],query:'ニセコ産アスパラ'});
  assert.ok(found.some(s=>s.id==='949'));
});

test('official coordinates support private straight-line filters and navigation fallback',async()=>{
 const {stations:enriched}=await import('./model.js');const {distanceKm,navigationUrl,requestLocation}=await import('./geo.js');
 assert.ok(enriched.every(s=>s.coordinates&&s.coordinates.lat>41&&s.coordinates.lat<46&&s.coordinates.lng>139&&s.coordinates.lng<147));
 const s=enriched.find(s=>s.id==='949');assert.equal(distanceKm(s.coordinates,s.coordinates),0);
 assert.ok(Math.abs(distanceKm({lat:0,lng:0},{lat:0,lng:1})-111.195)<.01);
 const result=filterStations(enriched,{areas:[],facilities:[],query:'',position:s.coordinates,radiusKm:1});assert.ok(result.some(x=>x.id===s.id));assert.ok(result.every(x=>distanceKm(s.coordinates,x.coordinates)<=1));
 assert.match(navigationUrl(s),/maps\/dir\/\?api=1&destination=/);assert.match(navigationUrl({...s,coordinates:null}),/maps\/search/);
 await assert.rejects(requestLocation({getCurrentPosition(_success,error){error({code:1});}}),/許可されません/);
 await assert.rejects(requestLocation({getCurrentPosition(_success,error){error({code:3});}}),/時間切れ/);
});
