import {stations as baseStations} from './data.js';
import {guides} from './guides.js';
import {photos,heroPhoto} from './media.js';
const stations=baseStations.map(s=>({...s,guide:guides[s.id],photo:photos[s.id],searchText:[guides[s.id]?.tagline,...(guides[s.id]?.specialties||[]),...(guides[s.id]?.localProducts||[])].join(' ')}));
import {areas,facilityLabels,filterStations,randomIndex,landingAngle,readRecord} from './core.js';
const $ = selector => document.querySelector(selector);
const icons={hotSpring:'onsen',restaurant:'food',produce:'basket',dogRun:'dog',ev:'ev'};
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameParts={'あびら D51(デゴイチ)ステーション':['あびら','D51（デゴイチ）','ステーション'],'ガーデンスパ十勝川温泉':['ガーデンスパ','十勝川温泉'],'かみゆうべつ温泉チューリップの湯':['かみゆうべつ温泉','チューリップの湯'],'はなやか（葉菜野花）小清水':['はなやか','（葉菜野花）','小清水'],'あしょろ銀河ホール21':['あしょろ','銀河ホール21']};
const stationName = value => (nameParts[value]||value.split(/\s+/)).map(part=>`<span class="station-name-part">${escapeHTML(part)}</span>`).join(' ');
let storage;try{storage=window.localStorage;}catch{}
let record=readRecord(storage), filters={areas:[],facilities:[],query:'',excludeVisited:false,favoritesOnly:false};
let candidates=[], selected=stations.find(s=>s.id==='949'), detailStation=null, resultKind='preview', view='roulette', journal='history', spinning=false, rotation=0, animation=null, tickerTimer=null, completionTimer=null, toastTimer=null, spinPool=null, spinIndex=null;
const canvas=$('#wheel'),ctx=canvas.getContext('2d'),reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
$('#area-options').innerHTML=areas.map(area=>`<label class="area-option"><input type="checkbox" name="area" value="${area}"><span>${area}</span></label>`).join('');
$('#facility-options').innerHTML=Object.entries(facilityLabels).map(([key,label])=>`<label class="facility-row"><input type="checkbox" name="facility" value="${key}">${icon(icons[key])}<span>${label}</span></label>`).join('');
const filterButton=document.createElement('button');filterButton.type='button';filterButton.className='mobile-filter-button';filterButton.textContent='条件を開く ＋';filterButton.setAttribute('aria-expanded','false');filterButton.setAttribute('aria-controls','filters');$('.filter-card').append(filterButton);$('.filter-card').classList.add('collapsed');
filterButton.addEventListener('click',()=>{const collapsed=$('.filter-card').classList.toggle('collapsed');filterButton.textContent=collapsed?'条件を開く ＋':'条件を閉じる −';filterButton.setAttribute('aria-expanded',String(!collapsed));});
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3200);}
function persist(){try{storage.setItem('michikuji-v1',JSON.stringify(record));return true;}catch{toast('保存できませんでした。この画面を開いている間は記録が残ります。');return false;}}
function announce(message){$('#announcement').textContent=message;}
function getFilters(){filters={areas:[...document.querySelectorAll('[name="area"]:checked')].map(x=>x.value),facilities:[...document.querySelectorAll('[name="facility"]:checked')].map(x=>x.value),query:$('#search').value,excludeVisited:$('#exclude-visited').checked,favoritesOnly:$('#favorites-only').checked};}
function resetFilters(){if(spinning)return;$('#filters').reset();getFilters();render();toast('条件をリセットしました');}
$('#reset').addEventListener('click',resetFilters);
$('#filters').addEventListener('submit',event=>event.preventDefault());
$('#filters').addEventListener('change',()=>{if(spinning)return;getFilters();render();});
$('#search').addEventListener('input',()=>{if(spinning)return;getFilters();render();});
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
function empty(title,description,reset=false){return `<div class="empty-state">${icon('mountain')}<b>${title}</b>${description}${reset?'<button data-action="reset">条件をリセットする ↺</button>':''}</div>`;}
function row(s,at){const fav=record.favorites.includes(s.id),visited=record.visited.includes(s.id);return `<article class="station-row"><span class="station-number">${String(s.number).padStart(3,'0')}</span><button class="station-open" data-action="open" data-id="${s.id}" aria-label="${escapeHTML(s.name)}の詳細を見る"><span class="pill">${s.area} · ${s.town}</span><h3>${stationName(s.name)}</h3><p>${s.facilities.map(x=>facilityLabels[x]).join(' · ')||'地域の情報を公式サイトでチェック'}</p></button><div class="row-buttons"><button class="row-icon ${fav?'selected':''}" data-action="favorite" data-id="${s.id}" aria-label="${escapeHTML(s.name)}を${fav?'お気に入りから外す':'お気に入りに追加'}" aria-pressed="${fav}">${icon('bookmark')}</button><button class="row-icon ${visited?'selected':''}" data-action="visit" data-id="${s.id}" aria-label="${escapeHTML(s.name)}を${visited?'未訪問に戻す':'訪問済みにする'}" aria-pressed="${visited}">${icon('check')}</button></div>${at?`<time class="history-date" datetime="${new Date(at).toISOString()}">${new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(at)}</time>`:''}</article>`;}
function photoCredit(p){return `<a href="${escapeHTML(p.source)}" target="_blank" rel="noopener noreferrer">写真：${escapeHTML(p.author)}</a> · <a href="${escapeHTML(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.license)}</a>`;}
function photoFigure(s,{eager=false,small=false}={}){const p=s.photo;return `<figure class="station-photo ${small?'small-photo':''}"><div class="photo-frame"><img src="${escapeHTML(p.src)}" alt="道の駅${escapeHTML(s.name)}の${s.id==='825'?'旧施設の写真':'写真'}" loading="${eager?'eager':'lazy'}" decoding="async" width="${p.width}" height="${p.height}"><span class="photo-fallback">写真を読み込めませんでした</span>${p.note?'<span class="photo-notice">旧施設の写真</span>':''}</div><figcaption>${photoCredit(p)}${p.note?`<span class="photo-note">${escapeHTML(p.note)}</span>`:''}</figcaption></figure>`;}
function productGroup(title,items,cls=''){return items.length?`<div class="guide-group ${cls}"><span class="guide-label">${title}</span><p>${items.map(escapeHTML).join('・')}</p></div>`:'';}
function stationCard(s){const g=s.guide,fav=record.favorites.includes(s.id),visited=record.visited.includes(s.id);return `<article class="station-card">${photoFigure(s,{small:true})}<div class="station-card-body"><div class="station-card-meta"><span class="pill">${s.area} · ${s.town}</span><span class="station-number">NO.${String(s.number).padStart(3,'0')}</span></div><h3>${stationName(s.name)}</h3><p class="station-tagline">${escapeHTML(g.tagline)}</p>${productGroup('この駅の名物・楽しみ',g.specialties)}${productGroup(s.town+'の特産品',g.localProducts,'local-products')}<div class="station-card-bottom"><button class="detail-button" data-action="open" data-id="${s.id}" aria-label="${escapeHTML(s.name)}を詳しく見る">詳しく見る <span>↗</span></button><button class="row-icon ${fav?'selected':''}" data-action="favorite" data-id="${s.id}" aria-label="${escapeHTML(s.name)}を${fav?'お気に入りから外す':'お気に入りに追加'}" aria-pressed="${fav}">${icon('bookmark')}</button><button class="row-icon ${visited?'selected':''}" data-action="visit" data-id="${s.id}" aria-label="${escapeHTML(s.name)}を${visited?'未訪問に戻す':'訪問済みにする'}" aria-pressed="${visited}">${icon('check')}</button></div></div></article>`;}
function renderDetail(){
  if(!detailStation)return;const s=detailStation,g=s.guide,fav=record.favorites.includes(s.id),visited=record.visited.includes(s.id);
  $('#detail-content').innerHTML=`${photoFigure(s,{eager:true})}<div class="detail-body"><span class="pill">${s.area} · ${s.town}</span><h2 id="detail-title">${stationName(s.name)}</h2><p class="detail-tagline">${escapeHTML(g.tagline)}</p><p class="detail-summary">${escapeHTML(g.summary)}</p><div class="detail-products">${productGroup('この駅の名物・楽しみ',g.specialties)}${productGroup(s.town+'の特産品',g.localProducts,'local-products')}</div><section class="detail-highlights"><h3>寄り道のポイント</h3><ul>${g.highlights.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul></section>${g.nearby.length?productGroup('周辺の見どころ',g.nearby):''}<div class="facility-tags">${s.facilities.map(key=>`<span>${icon(icons[key])}${facilityLabels[key]}</span>`).join('')}</div><dl class="station-facts"><div><dt>所在地</dt><dd>${escapeHTML(s.address)}</dd></div>${Object.entries(g.profile||{}).map(([key,value])=>`<div><dt>${escapeHTML(key)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><p class="source-note">情報確認：${g.verifiedAt} · <a href="${g.sourceUrl}" target="_blank" rel="noopener noreferrer">出典：北の道の駅 ↗</a>${g.guideSourceUrl&&g.guideSourceUrl!==g.localProductSourceUrl?` · <a href="${g.guideSourceUrl}" target="_blank" rel="noopener noreferrer">施設の紹介 ↗</a>`:''}${g.localProductSourceUrl?` · <a href="${g.localProductSourceUrl}" target="_blank" rel="noopener noreferrer">特産品の出典 ↗</a>`:''}<br>営業時間・休館日・メニューは変更される場合があります。</p><div class="detail-actions"><a class="outline-button maps-button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('道の駅 '+s.name+' '+s.address)}" target="_blank" rel="noopener noreferrer">${icon('pin')} Google マップで開く ↗</a><a class="outline-button" href="${s.url}" target="_blank" rel="noopener noreferrer">駅の公式情報 ↗</a><a class="outline-button" href="${escapeHTML(g.townUrl)}" target="_blank" rel="noopener noreferrer">${s.town}の情報 ↗</a><button class="outline-button ${fav?'selected':''}" data-action="favorite" data-id="${s.id}" aria-pressed="${fav}">${icon('bookmark')}${fav?'お気に入り登録済み':'お気に入りに追加'}</button><button class="outline-button ${visited?'selected':''}" data-action="visit" data-id="${s.id}" aria-pressed="${visited}">${icon('check')}${visited?'訪問済み':'訪問済みにする'}</button><button class="choose-station" data-action="choose" data-id="${s.id}">この駅を行き先にする ↗</button></div></div>`;
}
function openDetail(s){detailStation=s;renderDetail();$('#station-dialog').showModal();$('#station-dialog').scrollTop=0;}
$('#close-detail').addEventListener('click',()=>$('#station-dialog').close());
$('#station-dialog').addEventListener('click',e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();});
$('#station-dialog').addEventListener('close',()=>{detailStation=null;});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&e.target.closest('.photo-frame'))e.target.closest('.photo-frame').classList.add('photo-failed');},true);
$('#hero-credit').innerHTML=photoCredit(heroPhoto);
$('#landscape-credit').innerHTML=photoCredit(heroPhoto);
function renderResult(){
  if(!selected)return;
  const s=selected,g=s.guide,fav=record.favorites.includes(s.id),visited=record.visited.includes(s.id);
  $('#result-photo').innerHTML=photoFigure(s,{eager:true});
  $('#result-card').classList.add('has-result');
  $('#result-heading').textContent=resultKind==='draw'?'今回の行き先は、ここ。':'気になる寄り道';
  const outside=!candidates.some(x=>x.id===s.id);
  $('#result-content').innerHTML=`${resultKind==='draw'?`<p class="result-meta">YOUR NEXT STOP${outside?' · 現在の絞り込み条件の対象外です':''}</p>`:''}<span class="pill">${s.area} · ${s.town}</span><h3>${stationName(s.name)}</h3><p class="result-guide-summary">${escapeHTML(g.summary)}</p>${productGroup('この駅の名物・楽しみ',g.specialties)}${productGroup(s.town+'の特産品',g.localProducts,'local-products')}<button class="result-more" data-action="open" data-id="${s.id}">見どころ・営業情報を詳しく見る ↗</button><p class="address">${icon('pin')}<span>${escapeHTML(s.address)}</span></p><div class="facility-tags">${s.facilities.map(key=>`<span>${icon(icons[key])}${facilityLabels[key]}</span>`).join('')}</div><div class="destination-actions"><a class="outline-button maps-button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('道の駅 '+s.name+' '+s.address)}" target="_blank" rel="noopener noreferrer">${icon('pin')} Google マップで開く ↗</a><a class="outline-button" href="${s.url}" target="_blank" rel="noopener noreferrer">公式の駅情報を見る ↗</a><button class="outline-button ${fav?'selected':''}" data-action="favorite" data-id="${s.id}" aria-label="${fav?'お気に入りから外す':'お気に入りに追加'}" aria-pressed="${fav}">${icon('bookmark')}</button></div><button class="visit-button ${visited?'selected':''}" data-action="visit" data-id="${s.id}" aria-pressed="${visited}">${icon('check')}${visited?'訪問済み ✓（押すと元に戻す）':'行ったら、訪問済みにする'}</button>`;
}
function renderJournal(){
  $('#stats').innerHTML=`<div><strong>${record.visited.length}</strong><span>訪問した駅 / 128</span></div><div><strong>${record.favorites.length}</strong><span>お気に入り</span></div><div><strong>${record.history.length}</strong><span>最近の抽選</span></div>`;
  document.querySelectorAll('[data-journal]').forEach(el=>el.classList.toggle('selected',el.dataset.journal===journal));
  const byId=new Map(stations.map(s=>[s.id,s]));
  const entries=journal==='history'?record.history.map(h=>({s:byId.get(h.id),at:h.at})):record[journal].map(id=>({s:byId.get(id)}));
  $('#journal-list').innerHTML=entries.filter(x=>x.s).map(({s,at})=>row(s,at)).join('')||empty(journal==='history'?'旅のはじまりは、ここから。':journal==='visited'?'最初の寄り道を、記録しよう。':'気になる駅を、集めよう。',journal==='history'?'ルーレットを回すと、ここに履歴が残ります。':journal==='visited'?'駅の詳細や一覧のチェックマークから記録できます。':'駅のしおりマークを押すと、お気に入りに追加できます。');
  $('.history-dot').hidden=!record.history.length;
}
function render(){
  candidates=filterStations(stations,filters,record);
  $('#candidate-count').textContent=candidates.length;
  $('#area-hint').textContent=filters.areas.length?filters.areas.join('・')+'から選びます。':'未選択なら、北海道まるごと。';
  $('#list-count').textContent=candidates.length+'駅の寄り道';
  $('#spin').disabled=!candidates.length;
  $('#spin span').textContent=candidates.length?'ルーレットを回す':'条件を変えてみよう';
  $('#wheel-note').textContent=candidates.length?`${candidates.length}駅すべて、同じ確率で。${candidates.length>16?'（表示は登録番号）':''}`:'候補がありません。条件を少しゆるめてみよう。';
  if(!spinning){rotation=0;canvas.style.transform='rotate(0deg)';drawWheel(candidates);}
  $('#station-list').innerHTML=candidates.map(s=>stationCard(s)).join('')||empty('まだ見ぬ寄り道を、もう一度。','条件を少しゆるめると、行き先が見つかるかも。',true);
  const preferred=['949','13542','3143','19505'];
  const preview=[...candidates].sort((a,b)=>{const ai=preferred.indexOf(a.id),bi=preferred.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);}).slice(0,4);
  $('#candidate-preview').innerHTML=preview.map(s=>stationCard(s)).join('')||empty('ぴったりの駅を、探そう。','条件を変えてみてください。',true);
  renderResult();renderJournal();
}
function setView(next){
  if(spinning)return;
  view=next;$('#roulette-view').hidden=next!=='roulette';$('#result-card').hidden=next!=='roulette';$('#catalog-view').hidden=next!=='stations';$('#history-view').hidden=next!=='history';$('#candidate-section').hidden=next!=='roulette';
  document.querySelectorAll('[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===next);if(el.dataset.view===next)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  render();
}
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
$('#see-all').addEventListener('click',()=>{setView('stations');$('#catalog-heading').scrollIntoView({block:'start',behavior:reducedMotion.matches?'instant':'smooth'});});
document.querySelectorAll('[data-journal]').forEach(el=>el.addEventListener('click',()=>{journal=el.dataset.journal;renderJournal();}));
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||spinning)return;
  const {action,id}=button.dataset;if(action==='reset'){resetFilters();return;}
  const s=stations.find(s=>s.id===id);if(!s)return;
  if(action==='open'){openDetail(s);return;}
  if(action==='choose'){$('#station-dialog').close();selected=s;resultKind='preview';setView('roulette');renderResult();$('#result-card').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'nearest'});return;}
  const field=action==='favorite'?'favorites':action==='visit'?'visited':null;if(!field)return;
  const removing=record[field].includes(id);record[field]=removing?record[field].filter(x=>x!==id):[...record[field],id];
  const saved=persist();render();if($('#station-dialog').open){renderDetail();$('#detail-content').querySelector(`[data-action="${action}"]`)?.focus();}if(saved)toast(action==='favorite'?(removing?'お気に入りから外しました':'お気に入りに追加しました'):(removing?'未訪問に戻しました':'旅の記録に追加しました。いい寄り道でしたね。'));
});
function setLocked(locked){document.querySelectorAll('#filters input, #reset, [data-view], #see-all, .mobile-filter-button').forEach(el=>el.disabled=locked);$('#spin').disabled=locked||!candidates.length;}
function finishSpin(){
  if(!spinning)return;
  clearInterval(tickerTimer);clearTimeout(completionTimer);if(animation)animation.cancel();animation=null;
  rotation=landingAngle(spinIndex,spinPool.length);canvas.style.transform=`rotate(${rotation}deg)`;
  selected=spinPool[spinIndex];resultKind='draw';spinning=false;setLocked(false);
  record.history.unshift({id:selected.id,at:Date.now()});record.history=record.history.slice(0,30);persist();
  $('#finish-spin').hidden=true;$('#spin span').textContent='もう一度、回す';$('#ticker').textContent=selected.name;renderResult();renderJournal();
  $('#result-card').classList.remove('reveal');requestAnimationFrame(()=>$('#result-card').classList.add('reveal'));
  announce(`行き先は、${selected.area}、${selected.town}の道の駅、${selected.name}に決まりました。`);
  if(window.matchMedia('(max-width:700px)').matches)$('#result-card').scrollIntoView({block:'nearest',behavior:reducedMotion.matches?'instant':'smooth'});
}
$('#spin').addEventListener('click',()=>{
  if(spinning||!candidates.length)return;
  spinPool=[...candidates];spinIndex=randomIndex(spinPool.length);spinning=true;setLocked(true);$('#spin span').textContent='次の寄り道を、探しています';$('#finish-spin').hidden=false;
  announce(spinPool.length+'駅から抽選中です。');
  const target=360*6+landingAngle(spinIndex,spinPool.length);
  let tick=0;tickerTimer=setInterval(()=>{$('#ticker').textContent=spinPool[tick++%spinPool.length].name;},110);
  if(reducedMotion.matches){finishSpin();return;}
  if(typeof canvas.animate!=='function'){finishSpin();return;}
  animation=canvas.animate([{transform:`rotate(${rotation}deg)`},{transform:`rotate(${target}deg)`}],{duration:4700,easing:'cubic-bezier(.12,.7,.12,1)',fill:'forwards'});
  animation.onfinish=finishSpin;completionTimer=setTimeout(finishSpin,5100);
});
$('#finish-spin').addEventListener('click',finishSpin);
// A second tab may change the journal; never mutate an in-flight drawing pool.
window.addEventListener('storage',event=>{if(event.key==='michikuji-v1'&&!spinning){record=readRecord(storage);render();}});
record.visited=record.visited.filter(id=>stations.some(s=>s.id===id));record.favorites=record.favorites.filter(id=>stations.some(s=>s.id===id));record.history=record.history.filter(h=>stations.some(s=>s.id===h.id));
render();setView('roulette');
