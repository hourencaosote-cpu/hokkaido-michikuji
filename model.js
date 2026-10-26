import {stations as baseStations} from './data.js';
import {guides} from './guides.js';
import {photos} from './media.js';
import {stamps} from './stamps.js';
export const stations=baseStations.map(s=>({...s,guide:guides[s.id],photo:photos[s.id],stamp:stamps[s.id],searchText:[guides[s.id].tagline,...guides[s.id].specialties,...guides[s.id].localProducts].join(' ')}));
export const stationById=new Map(stations.map(s=>[s.id,s]));
export const stationPath=s=>`/stations/${s.id}/`;
export const stampLabels={'24h':'24時間押印可',hours:'押印は時間内',conditional:'期間・条件あり',unconfirmed:'押印時間は要確認'};
