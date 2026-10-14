// Historical observations and explicit projection assumptions; never a current Pirro aforo.
export const TRAFFIC_SOURCE = Object.freeze({
  baselineYear:2019, baselineDaily:27534, station:125,
  fleet2019:1565811, fleet2024:1887571, lastFleetYear:2024,
  fleetURL:'https://repositorio.mopt.go.cr/bitstreams/c12904ff-adce-4ba1-ada3-923b9450cf33/download',
  baselineURL:'https://repositorio.mopt.go.cr/bitstreams/a22e3b10-ec6f-4d87-8a3d-fd3d9e71d93e/download',
  hourlyURL:'https://repositorio.mopt.go.cr/bitstreams/409ea570-d404-4eb8-999b-963a70cf1818/download',
  hourlyStation:'E9 La Puebla · Ruta 5', hourlyYear:2016,
  fleetDefinition:'Vehículos con obligaciones de pago cumplidas ante el INS; no equivale a viajes.'
});
export const HOURLY_PERCENT = Object.freeze([1.88,1.20,.87,.66,.73,2.65,4.53,5.23,5.56,5.64,5.60,5.59,5.44,5.43,5.63,5.58,5.54,5.35,5.25,5.08,4.78,4.71,4.24,2.85]);
const total=HOURLY_PERCENT.reduce((s,x)=>s+x,0);
export const HOURLY_SHARES=Object.freeze(HOURLY_PERCENT.map(x=>x/total));
export const PERIODS=Object.freeze([
  {id:'early',start:5,end:6,label:'Temprano · 05–06'},
  {id:'morning',start:6,end:8,label:'Mañana · 06–08'},
  {id:'midmorning',start:8,end:11,label:'Media mañana · 08–11'},
  {id:'midday',start:11,end:14,label:'Mediodía · 11–14'},
  {id:'prepeak',start:14,end:15,label:'Antes de la tarde · 14–15'},
  {id:'afternoon',start:15,end:17,label:'Tarde · 15–17'},
  {id:'evening',start:17,end:19,label:'Salida de tarde · 17–19'},
  {id:'night',start:19,end:22,label:'Noche · 19–22'},
  {id:'custom',start:0,end:24,label:'Escenario libre'}
]);
export function estimateTraffic(year=2026){
  if(!Number.isInteger(year)||year<2019||year>2035)throw Error('Año fuera del rango 2019–2035');
  const ratio=TRAFFIC_SOURCE.fleet2024/TRAFFIC_SOURCE.fleet2019;
  const annual=ratio**(1/5)-1;
  const factor=(1+annual)**(year-2019);
  return {year,annual,factor,daily:TRAFFIC_SOURCE.baselineDaily*factor,fleet:TRAFFIC_SOURCE.fleet2019*factor,projected:year!==2019&&year!==2024};
}
export function hourlyVolumes(year=2026){const e=estimateTraffic(year);return HOURLY_SHARES.map((share,hour)=>({hour,share,vehicles:Math.round(e.daily*share)}));}
// Integrate each individual hour, including midnight and partial hours.
export function demandSegments(startHour,duration,year=2026){
  const daily=estimateTraffic(year).daily,result=[];let t=0;
  while(t<duration-1e-8){const clock=startHour*3600+t,hour=Math.floor(clock/3600)%24,end=Math.min(duration,t+3600-clock%3600),rate=daily*HOURLY_SHARES[hour];result.push({start:t,end,hour,rate,expected:rate*(end-t)/3600});t=end;}
  return result;
}
export function expectedVehicles(startHour,duration,year=2026){return demandSegments(startHour,duration,year).reduce((s,x)=>s+x.expected,0);}
