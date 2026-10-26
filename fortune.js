import {randomIndex} from './core.js';
export const fortuneGrades=[
 {key:'daikichi',label:'大吉',comments:['思いきった寄り道に、いい出会い。','ひとつ先の道に、旅のごほうび。','今日は、ちょっと遠回りしてみよう。']},
 {key:'chukichi',label:'中吉',comments:['おいしい偶然が、待っているかも。','気になった景色に、足を止めよう。','いつもの道にも、新しい発見。']},
 {key:'shokichi',label:'小吉',comments:['小さな寄り道が、いい思い出に。','急がず、のんびり。いい旅を。','ひと休みから、旅が広がる。']},
 {key:'kichi',label:'吉',comments:['今日のペースで、気ままにどうぞ。','次の一駅を、楽しんでいこう。','何気ない寄り道を、特別な一日に。']}
];
export const fortuneByKey=key=>fortuneGrades.find(g=>g.key===key)||null;

// This entropy is consumed independently after the station index is fixed.
export function drawFortune(source=globalThis.crypto){const grade=fortuneGrades[randomIndex(fortuneGrades.length,source)];return {...grade,comment:grade.comments[randomIndex(grade.comments.length,source)]};}
export function jstDateKey(date=new Date()){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');}
export function dateSeed(value){let seed=2166136261;for(const c of value)seed=Math.imul(seed^c.charCodeAt(0),16777619);return seed>>>0;}
export function dailyStation(stations,date=new Date()){const key=jstDateKey(date),ordered=[...stations].sort((a,b)=>a.number-b.number);return {date:key,station:ordered[dateSeed('michikuji-day-v1:'+key)%ordered.length]};}
export function areaProgress(stations,visited){const ids=new Set(visited),map=new Map();for(const s of stations){const p=map.get(s.area)||{area:s.area,total:0,visited:0};p.total++;if(ids.has(s.id))p.visited++;map.set(s.area,p);}return [...map.values()].map(p=>({...p,ratio:p.visited/p.total}));}
