export const areas = ['道央','道南','道北','オホーツク','十勝','釧路・根室'];
export const facilityLabels = {hotSpring:'温泉',restaurant:'レストラン',produce:'産地直売所',dogRun:'ドッグラン',ev:'EV充電器'};
export const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[\s・☆★♡「」()（）]/g,'');
export function filterStations(stations, filters, record = {}) {
  const words = normalize(filters.query || '');
  const visited = new Set(record.visited || []), favorites = new Set(record.favorites || []);
  return stations.filter(s =>
    (!filters.areas.length || filters.areas.includes(s.area)) &&
    (!words || normalize(s.name+s.town+s.address).includes(words)) &&
    filters.facilities.every(f=>s.facilities.includes(f)) &&
    (!filters.excludeVisited || !visited.has(s.id)) &&
    (!filters.favoritesOnly || favorites.has(s.id))
  );
}
// Rejection sampling avoids modulo bias for every possible pool size.
export function randomIndex(length, cryptoSource = globalThis.crypto) {
  if (!Number.isInteger(length) || length<1 || length>0x100000000) throw new RangeError('Invalid pool size');
  const limit = Math.floor(0x100000000/length)*length;
  const values = new Uint32Array(1);
  do { cryptoSource.getRandomValues(values); } while (values[0]>=limit);
  return values[0]%length;
}
export function landingAngle(index, count) { return 360-(index+.5)*360/count; }
export function readRecord(storage) {
  try {
    const value = JSON.parse(storage.getItem('michikuji-v1') || '{}');
    const ids = v => Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'))]:[];
    return {visited:ids(value.visited),favorites:ids(value.favorites),history:Array.isArray(value.history)?value.history.filter(h=>h&&typeof h.id==='string'&&Number.isFinite(h.at)).slice(0,30):[]};
  } catch { return {visited:[],favorites:[],history:[]}; }
}
