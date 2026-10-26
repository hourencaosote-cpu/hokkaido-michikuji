import {stations,stationById,stampLabels} from './model.js';
import {areas,facilityLabels,filterStations,randomIndex,landingAngle,readRecord} from './core.js';
import {esc,photoCredit,stationCard,stampRow,resultMarkup,historyRow,empty} from './components.js';
import {heroSlides} from './gallery.js';
const $=selector=>document.querySelector(selector);
const page=document.body.dataset.page,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let storage;try{storage=window.localStorage;}catch{}
let record=readRecord(storage),toastTimer;
for(const key of ['favorites','visited'])record[key]=record[key].filter(id=>stationById.has(id));
record.history=record.history.filter(item=>stationById.has(item.id));
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3000);}
function persist(){try{storage.setItem('michikuji-v1',JSON.stringify(record));return true;}catch{toast('保存できませんでした。この画面を開いている間は記録が残ります。');return false;}}
function announce(message){$('#announcement').textContent=message;}
function syncRecordButtons(){
  document.querySelectorAll('[data-action="favorite"],[data-action="visit"]').forEach(button=>{const favorite=button.dataset.action==='favorite',field=favorite?'favorites':'visited',active=record[field].includes(button.dataset.id);button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',button.dataset.name+'を'+(favorite?(active?'お気に入りから外す':'お気に入りに追加'):(active?'未訪問に戻す':'訪問済みにする')));const label=button.querySelector('[data-record-label]');if(label)label.textContent=favorite?(active?'お気に入り登録済み':'お気に入りに追加'):(active?'訪問済み':'訪問済みにする');});
  document.querySelectorAll('.history-dot').forEach(dot=>dot.hidden=!record.history.length);
}
document.addEventListener('error',event=>{if(event.target.tagName==='IMG'&&event.target.closest('.photo-frame'))event.target.closest('.photo-frame').classList.add('photo-failed');},true);
document.querySelectorAll('.photo-frame img').forEach(img=>{if(img.complete&&!img.naturalWidth)img.closest('.photo-frame').classList.add('photo-failed');});
const params=new URLSearchParams(location.search);
let filters={areas:params.getAll('area').filter(a=>areas.includes(a)),facilities:params.getAll('facility').filter(f=>facilityLabels[f]),query:params.get('q')||'',stamp:stampLabels[params.get('stamp')]?params.get('stamp'):'',excludeVisited:params.get('unvisited')==='1',favoritesOnly:params.get('favorites')==='1'};
let slotAnimation, candidates=[],selected=stationById.get(params.get('station'))||stationById.get('949'),spinning=false,rotation=0,animation,tickerTimer,completionTimer,spinPool,spinIndex;
const form=$('#filters'),canvas=$('#wheel'),ctx=canvas?.getContext('2d');
function readFilters(){filters={areas:[...form.querySelectorAll('[name="area"]:checked')].map(x=>x.value),facilities:[...form.querySelectorAll('[name="facility"]:checked')].map(x=>x.value),query:$('#search').value,stamp:$('#stamp-filter').value,excludeVisited:$('#exclude-visited').checked,favoritesOnly:$('#favorites-only').checked};}
function writeFilterURL(){const q=new URLSearchParams();for(const a of filters.areas)q.append('area',a);for(const f of filters.facilities)q.append('facility',f);if(filters.query)q.set('q',filters.query);if(filters.stamp)q.set('stamp',filters.stamp);if(filters.excludeVisited)q.set('unvisited','1');if(filters.favoritesOnly)q.set('favorites','1');if(page==='roulette'&&params.has('station'))q.set('station',selected.id);const suffix=q.toString();history.replaceState(null,'',location.pathname+(suffix?'?'+suffix:''));const all=$('#see-all');if(all)all.href='/stations/'+(suffix?'?'+suffix:'');}
function resetFilters(){if(spinning||!form)return;form.reset();readFilters();writeFilterURL();renderCandidates();toast('条件をリセットしました');}
if(form){
  form.querySelectorAll('[name="area"]').forEach(input=>input.checked=filters.areas.includes(input.value));form.querySelectorAll('[name="facility"]').forEach(input=>input.checked=filters.facilities.includes(input.value));$('#search').value=filters.query;$('#stamp-filter').value=filters.stamp;$('#exclude-visited').checked=filters.excludeVisited;$('#favorites-only').checked=filters.favoritesOnly;
  form.addEventListener('submit',event=>event.preventDefault());
  const update=()=>{if(spinning)return;readFilters();writeFilterURL();renderCandidates();};
  form.addEventListener('change',update);$('#search').addEventListener('input',update);$('#reset').addEventListener('click',resetFilters);
  $('#toggle-filters').addEventListener('click',()=>{const collapsed=$('.filter-card').classList.toggle('collapsed');$('#toggle-filters').textContent=collapsed?'条件を開く ＋':'条件を閉じる −';$('#toggle-filters').setAttribute('aria-expanded',String(!collapsed));});
}
function drawWheel(pool){
  const n=pool.length,c=480,r=460;ctx.clearRect(0,0,960,960);
  if(!n){ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.fillStyle='#e5e7d8';ctx.fill();return;}
  const palette=['#254f40','#e9e4d0','#aab795','#f3eedf','#365b47','#d3d6bb','#839e7d','#efe9d6'];
  const step=2*Math.PI/n;
  for(let i=0;i<n;i++){
    const start=-Math.PI/2+i*step,end=start+step;
    const colorIndex=n<=12?i%palette.length:Math.floor(i*8/n);
    ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,start,end);ctx.closePath();ctx.fillStyle=palette[colorIndex];ctx.fill();
    ctx.strokeStyle=n>24?'#f9f5e929':'#f9f5e9a0';ctx.lineWidth=n>40?1:2;ctx.stroke();
    if(n>24 && i%Math.ceil(n/16)!==0)continue;
    ctx.save();ctx.translate(c,c);ctx.rotate(start+step/2);ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle=[0,4,6].includes(colorIndex)?'#f7f2e5':'#294c3d';
    if(n<=16){ctx.font=`600 ${n<=6?30:25}px sans-serif`;const name=pool[i].name.length>10?pool[i].name.slice(0,9)+'…':pool[i].name;ctx.fillText(name,r-34,0,280);}
    else{ctx.font='500 23px sans-serif';ctx.fillText(String(pool[i].number).padStart(2,'0'),r-30,0);}
    ctx.restore();
  }
  ctx.beginPath();ctx.arc(c,c,r-2,0,2*Math.PI);ctx.strokeStyle='#31513b';ctx.lineWidth=3;ctx.stroke();
}
function renderResult(draw=false){if(!$('#result-card'))return;$('#result-card').innerHTML=resultMarkup(selected,record,draw);syncRecordButtons();}
function renderCandidates(){
  if(!form)return;candidates=filterStations(stations,filters,record);$('#candidate-count').textContent=candidates.length;$('#area-hint').textContent=filters.areas.length?filters.areas.join('・')+'から選びます。':'未選択なら、北海道まるごと。';
  if($('#list-count'))$('#list-count').textContent=candidates.length+'駅';
  const noResults=empty('条件に合う駅が見つかりません。','条件を少しゆるめて、次の寄り道を探してみよう。',true);
  if($('#station-list'))$('#station-list').innerHTML=candidates.map(s=>stationCard(s,record)).join('')||noResults;
  if($('#stamp-list'))$('#stamp-list').innerHTML=candidates.map(stampRow).join('')||noResults;
  if(canvas){rotation=0;canvas.style.transform='rotate(0deg)';drawWheel(candidates);$('#spin').disabled=!candidates.length;$('#spin .spin-label').textContent=candidates.length?'ルーレットを回す':'条件を変えてみよう';$('#wheel-note').textContent=candidates.length?`${candidates.length}駅すべて、同じ確率で。${candidates.length>16?'（表示は登録番号）':''}`:'候補がありません。条件を少しゆるめてみよう。';const preferred=['949','13542','3143','19505'];const preview=[...candidates].sort((a,b)=>(preferred.includes(a.id)?preferred.indexOf(a.id):999)-(preferred.includes(b.id)?preferred.indexOf(b.id):999)).slice(0,4);$('#candidate-preview').innerHTML=preview.map(s=>stationCard(s,record)).join('')||noResults;}
  syncRecordButtons();
}
let journal='history';
function renderJournal(){if(!$('#journal-list'))return;$('#stats').innerHTML=`<div><strong>${record.visited.length}</strong><span>訪問した駅 / 128</span></div><div><strong>${record.favorites.length}</strong><span>お気に入り</span></div><div><strong>${record.history.length}</strong><span>最近の抽選</span></div>`;document.querySelectorAll('[data-journal]').forEach(button=>{const active=button.dataset.journal===journal;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});const entries=journal==='history'?record.history.map(h=>({s:stationById.get(h.id),at:h.at})):record[journal].map(id=>({s:stationById.get(id)}));$('#journal-list').innerHTML=entries.filter(x=>x.s).map(({s,at})=>historyRow(s,at,record)).join('')||empty(journal==='history'?'旅のはじまりは、ここから。':journal==='visited'?'最初の寄り道を、記録しよう。':'気になる駅を、集めよう。',journal==='history'?'ルーレットを回すと、ここに履歴が残ります。':'駅のページのボタンから、旅の記録を残せます。');syncRecordButtons();}
document.querySelectorAll('[data-journal]').forEach(button=>button.addEventListener('click',()=>{journal=button.dataset.journal;renderJournal();}));
document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button||spinning)return;const {action,id}=button.dataset;if(action==='reset'){resetFilters();return;}if(!stationById.has(id)||!['favorite','visit'].includes(action))return;const field=action==='favorite'?'favorites':'visited',removing=record[field].includes(id);record[field]=removing?record[field].filter(x=>x!==id):[...record[field],id];const saved=persist();syncRecordButtons();if(form&&(filters.excludeVisited||filters.favoritesOnly))renderCandidates();renderJournal();if(saved)toast(action==='favorite'?(removing?'お気に入りから外しました':'お気に入りに追加しました'):(removing?'未訪問に戻しました':'旅の記録に追加しました。'));});
function setLocked(locked){document.querySelectorAll('#filters input,#filters select,#reset,#toggle-filters').forEach(el=>el.disabled=locked);$('#spin').disabled=locked||!candidates.length;}
function finishSpin(){if(!spinning)return;clearInterval(tickerTimer);clearTimeout(completionTimer);animation?.cancel();slotAnimation?.cancel();animation=null;slotAnimation=null;$('#slot-track').innerHTML=`<div class="slot-name">${esc(spinPool[spinIndex].name)}</div>`;rotation=landingAngle(spinIndex,spinPool.length);canvas.style.transform=`rotate(${rotation}deg)`;selected=spinPool[spinIndex];spinning=false;setLocked(false);record.history.unshift({id:selected.id,at:Date.now()});record.history=record.history.slice(0,30);persist();$('#finish-spin').hidden=true;$('#spin .spin-label').textContent='もう一度、回す';$('#ticker').textContent=selected.name;renderResult(true);$('#result-card').classList.remove('reveal');requestAnimationFrame(()=>$('#result-card').classList.add('reveal'));announce(`行き先は、${selected.area}、${selected.town}の道の駅、${selected.name}に決まりました。`);if(matchMedia('(max-width:700px)').matches)$('#result-card').scrollIntoView({block:'start',behavior:reducedMotion.matches?'instant':'smooth'});}
if(canvas){$('#spin').addEventListener('click',()=>{if(spinning||!candidates.length)return;spinPool=[...candidates];spinIndex=randomIndex(spinPool.length);spinning=true;setLocked(true);$('#spin .spin-label').textContent='次の行き先を抽選中';$('#finish-spin').hidden=false;announce(spinPool.length+'駅から抽選中です。');const drum=Array.from({length:25},(_,i)=>spinPool[i%spinPool.length]);drum.push(spinPool[spinIndex]);$('#slot-track').innerHTML=drum.map(s=>`<div class="slot-name">${esc(s.name)}</div>`).join('');if(reducedMotion.matches||typeof canvas.animate!=='function'){finishSpin();return;}const target=360*5+landingAngle(spinIndex,spinPool.length);animation=canvas.animate([{transform:`rotate(${rotation}deg)`,offset:0},{transform:`rotate(${target+3}deg)`,offset:.94},{transform:`rotate(${target}deg)`,offset:1}],{duration:2800,easing:'cubic-bezier(.1,.68,.12,1)',fill:'forwards'});slotAnimation=$('#slot-track').animate([{transform:'translateY(0)'},{transform:`translateY(${-25*52-7}px)`,offset:.94},{transform:`translateY(${-25*52}px)`}],{duration:2800,easing:'cubic-bezier(.1,.68,.12,1)',fill:'forwards'});animation.onfinish=finishSpin;completionTimer=setTimeout(finishSpin,3200);});$('#finish-spin').addEventListener('click',finishSpin);renderResult();}
window.addEventListener('storage',event=>{if(event.key==='michikuji-v1'&&!spinning){record=readRecord(storage);syncRecordButtons();renderCandidates();renderJournal();}});
renderCandidates();renderJournal();syncRecordButtons();

if(page==='home'){let slide=0,paused=reducedMotion.matches,sliderTimer;const slides=[...document.querySelectorAll('.hero-slide')];const showSlide=next=>{slide=(next+slides.length)%slides.length;slides.forEach((img,i)=>img.classList.toggle('is-active',i===slide));$('#hero-credit').innerHTML=photoCredit(heroSlides[slide]);$('#hero-slide-count').textContent=`${slide+1} / ${slides.length}`;};const start=()=>{clearInterval(sliderTimer);if(!paused&&!document.hidden)sliderTimer=setInterval(()=>showSlide(slide+1),8000);};$('#hero-next').addEventListener('click',()=>{showSlide(slide+1);start();});$('#hero-previous').addEventListener('click',()=>{showSlide(slide-1);start();});$('#hero-pause').addEventListener('click',()=>{paused=!paused;$('#hero-pause').textContent=paused?'再生':'一時停止';$('#hero-pause').setAttribute('aria-pressed',String(paused));$('#hero-pause').setAttribute('aria-label',paused?'写真の自動切り替えを再開':'写真の自動切り替えを停止');start();});document.addEventListener('visibilitychange',start);if(reducedMotion.matches){$('#hero-pause').textContent='再生';$('#hero-pause').setAttribute('aria-pressed','true');}start();}
if(canvas&&params.get('autospin')==='1'){params.delete('autospin');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));requestAnimationFrame(()=>$('#spin').click());}
