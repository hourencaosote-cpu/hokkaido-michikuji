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
