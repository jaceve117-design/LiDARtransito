import { createPair,csv } from './simulation.js';
import { CONFIG, MAP, pointOnEdge } from './network.js';
const $=id=>document.getElementById(id),format=new Intl.NumberFormat('es-CR',{maximumFractionDigits:1});
const ui={running:false,calculating:false,mode:'adaptive',selected:'pirro',zoom:1.65,panX:350,panY:-100,elapsed:0,lastRender:0,lastStats:0,frame:0};
let options={duration:900,demand:2000,seed:42,cycle:90,green:35,distribute:true},pair=createPair(options);
const net=pair.fixed.network;
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function point(edge,p,offset=1.5){return pointOnEdge(edge,p,offset);}
function drawBase(){
  $('map').setAttribute('viewBox',`0 0 ${MAP.width} ${MAP.height}`);
  $('mapViewport').innerHTML=`<image id="mapBase" href="/maps/heredia-limpia.png" width="${MAP.width}" height="${MAP.height}" preserveAspectRatio="none"/><g id="roads"></g><g id="trafficGuides"></g><g id="heat"></g><g id="sensors"></g><g id="vehicles"></g><g id="signals"></g><g id="nodeLabels"></g>`;
  const unique=new Map(net.edges.map(e=>[e.roadId,e]));
  $('roads').innerHTML=[...unique.values()].map(e=>`<polyline points="${e.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#526f7e" stroke-opacity=".18" stroke-width="1.2" stroke-linecap="butt" stroke-linejoin="miter"/>`).join('');
  $('trafficGuides').innerHTML=MAP.guides.map(g=>`<polyline points="${g.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#e5ad36" stroke-width="3" marker-end="url(#flowArrow)"/><title>${escape(g.label)}</title>`).join('');
  $('nodeLabels').innerHTML='';
  for(const n of net.nodes.filter(n=>n.signal)){
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.dataset.node=n.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',`Seleccionar ${n.name}`);g.classList.add('node-hit');
    const select=()=>{ui.selected=n.id;render();renderStats();};g.addEventListener('click',()=>{if(!drag?.moved)select();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});$('signals').appendChild(g);
  }
  $('networkSummary').textContent=`${unique.size} tramos municipales · 9 controles de tu referencia`;
  $('modelNetwork').textContent=`La red usa ${unique.size} tramos municipales y ${net.boundaries.length} accesos en los bordes del área. Los vehículos pueden desviarse y esperar si la siguiente calle está llena.`;
  transform();
}
const live=()=>pair[ui.mode];
function colors(signal){if(!signal)return {H:'#829173',V:'#829173'};const p=signal.phase(live().time),c=p.phase==='VERDE'?'#57a66d':p.phase==='AMARILLO'?'#d5b65b':'#c46a5d';return {H:p.axis==='H'?c:'#c46a5d',V:p.axis==='V'?c:'#c46a5d'};}
function render(){
  const sim=live();
  $('vehicles').innerHTML=sim.vehicles.map(v=>{const e=net.edgeById.get(v.path[v.index]),p=point(e,v.p),w=v.type==='bus'?6:4;return `<rect x="${-w}" y="-1.2" width="${w}" height="2.4" rx=".5" fill="${v.color}" stroke="#ffffff" stroke-width=".3" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.angle.toFixed(1)})"/>`;}).join('');
  for(const g of $('signals').children){const n=net.byId.get(g.dataset.node),c=colors(sim.signals.get(n.id));g.innerHTML=`${n.id===ui.selected?`<circle class="selected-halo" cx="${n.x}" cy="${n.y}" r="13" opacity=".7"/>`:''}<rect x="${n.x-7}" y="${n.y-14}" width="15" height="8" rx="2" fill="#fff" stroke="#546d77" stroke-width=".7"/><circle cx="${n.x-3}" cy="${n.y-10}" r="2.2" fill="${c.H}"/><circle cx="${n.x+4}" cy="${n.y-10}" r="2.2" fill="${c.V}"/><circle cx="${n.x}" cy="${n.y}" r="14" fill="transparent"/>`;}
  if($('heatToggle').checked){$('heat').innerHTML=[...sim.activeLanes].map(id=>{const e=net.edgeById.get(id),stopped=sim.lanes.get(e.id).filter(v=>v.v<.5);if(!stopped.length)return '';const front=Math.max(...stopped.map(v=>v.p)),back=Math.min(...stopped.map(v=>v.p)),points=[];for(let p=back;p<=front+1;p+=Math.max(1,(front-back)/10)){const q=point(e,p);points.push([q.x,q.y]);}return `<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${stopped.length>10?'#c87843':'#d5ad58'}" stroke-width="4" opacity=".6" stroke-linecap="butt"/>`;}).join('');}else $('heat').innerHTML='';
  const e=net.incoming.get(ui.selected).find(e=>e.axis==='H')??net.incoming.get(ui.selected)[0],out=net.outgoing.get(ui.selected).find(u=>u.to!==e?.from);
  $('sensors').innerHTML=$('sensorToggle').checked&&e?[{e,p:e.length-65,label:'A1'},{e,p:e.length-20,label:'A2'},...(out?[{e:out,p:35,label:'A3'}]:[])].map(s=>{const p=point(s.e,s.p,6);return `<circle cx="${p.x}" cy="${p.y}" r="8" fill="#aac88d" opacity=".16"/><circle cx="${p.x}" cy="${p.y}" r="3" fill="#edf6df" stroke="#658e55"/><text class="sensor-label" x="${p.x-5}" y="${p.y-8}">${s.label}</text>`;}).join(''):'';
}
function time(t){const s=Math.floor(t);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function phaseText(axis,signal){if(!signal)return ['SIN SEMÁFORO',''];const p=signal.phase(live().time);if(p.axis!==axis)return ['ROJO','phase-red'];return [p.phase,p.phase==='VERDE'?'phase-green':p.phase==='AMARILLO'?'phase-yellow':'phase-red'];}
function renderStats(){
  const sim=live(),s=sim.snapshot(),signal=sim.signals.get(ui.selected),n=net.byId.get(ui.selected),q=sim.queuesAt(ui.selected);
  $('metricActive').textContent=format.format(s.en_red);$('metricExit').textContent=format.format(s.salidas);$('metricQueue').textContent=format.format(s.cola);$('metricPending').textContent=`${format.format(s.pendientes)} esperando ingresar`;$('metricWait').textContent=s.salidas?`${format.format(s.espera_media_s)} s`:'—';
  $('clock').textContent=`${time(sim.time)} / ${time(options.duration)}`;$('junctionName').textContent=n.name;$('junctionType').textContent=signal?'Referencia del usuario · fases simuladas':'Cruce libre · prioridad simplificada';
  for(const axis of ['H','V']){const [text,color]=phaseText(axis,signal);$('phase'+axis).textContent=text;$('phase'+axis).className=color;}
  $('junctionQueue').textContent=`${q.H} / ${q.V}`;$('junctionGreen').textContent=signal?`${signal.green} s`:'—';$('sensor1').textContent=sim.sensor(ui.selected,65);$('sensor2').textContent=sim.sensor(ui.selected,20);
  $('sensor3').textContent=net.edges.filter(e=>e.from===ui.selected).reduce((sum,e)=>sum+sim.lanes.get(e.id).filter(v=>Math.abs(v.p-35)<8).length,0);
  renderComparison();drawChart();for(const id of ['export','exportCompare','exportQ'])$(id).disabled=sim.time<1;
}
const metrics=[['salidas','Viajes completados',true,'veh'],['en_red','Vehículos aún en la red',false,'veh'],['pendientes','Esperando ingresar',false,'veh'],['cola_promedio','Cola promedio de toda la red',false,'veh'],['espera_media_s','Espera media por viaje completado',false,'s'],['viaje_medio_s','Tiempo medio de viaje completado',false,'s'],['velocidad_kmh','Velocidad instantánea en la red',true,'km/h']];
function comparisons(){const f=pair.fixed.snapshot(),a=pair.adaptive.snapshot();return metrics.map(([key,label,more,unit])=>{const available=!(key==='espera_media_s'||key==='viaje_medio_s')||f.salidas>0&&a.salidas>0;const pct=available&&f[key]>0?(a[key]-f[key])/f[key]*100*(more?1:-1):null;return {metrica:label,unidad:unit,fijo:available?f[key]:null,adaptativo:available?a[key]:null,cambio_favorable_porcentaje:pct===null?null:+pct.toFixed(2),estado:pair.fixed.time>=options.duration?'FINAL':'PARCIAL'};});}
function renderComparison(){
  $('comparison').innerHTML=comparisons().map(r=>`<tr><td>${r.metrica}</td><td>${r.fijo===null?'—':format.format(r.fijo)}${r.fijo===null?'':' '+r.unidad}</td><td>${r.adaptativo===null?'—':format.format(r.adaptativo)}${r.adaptativo===null?'':' '+r.unidad}</td><td class="${r.cambio_favorable_porcentaje>0?'favorable':r.cambio_favorable_porcentaje<0?'unfavorable':''}">${r.cambio_favorable_porcentaje===null?'—':`${r.cambio_favorable_porcentaje>0?'+':''}${format.format(r.cambio_favorable_porcentaje)} %`}</td></tr>`).join('');
  $('comparisonTime').textContent=`${pair.fixed.time>=options.duration?'Comparación final':'Comparación parcial'} · ${time(pair.fixed.time)} simulados. Ambos escenarios avanzan al mismo tiempo.`;
}
function drawChart(){
  const c=$('queueChart'),dpr=Math.min(2,window.devicePixelRatio||1),w=c.clientWidth,h=c.clientHeight;c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);
  const series=[pair.fixed.records,pair.adaptive.records],max=Math.max(5,...series.flatMap(a=>a.map(r=>r.cola))),left=32,bottom=25,top=7;
  ctx.font='9px Segoe UI';ctx.strokeStyle='#e9ede2';ctx.fillStyle='#919c86';for(let i=0;i<4;i++){const y=top+(h-top-bottom)*i/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-4,y);ctx.stroke();ctx.fillText(String(Math.round(max*(1-i/3))),0,y+3);}
  series.forEach((data,i)=>{ctx.strokeStyle=['#b99961','#28664c'][i];ctx.lineWidth=1.6;ctx.beginPath();data.forEach((r,j)=>{const x=left+(w-left-4)*r.segundo/options.duration,y=top+(h-top-bottom)*(1-r.cola/max);j?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();});
  for(let i=0;i<4;i++){const x=left+(w-left-25)*i/3;ctx.fillText(time(options.duration*i/3),x,h-5);}
}
function updateStatus(){const done=pair.fixed.time>=options.duration;const text=ui.calculating?'Calculando':done?'Completado':ui.running?'En ejecución':pair.fixed.time>0?'En pausa':'Preparado';$('runStatus').innerHTML=`<span class="dot"></span>${text}`;$('play').textContent=ui.running?'Pausar':done?'Completado':'Iniciar';$('play').disabled=ui.calculating||done;$('finish').disabled=ui.calculating||done;}
function reset(){ui.frame++;ui.running=false;ui.calculating=false;ui.elapsed=0;pair=createPair(options);$('feedback').textContent='Listo. Inicia la simulación para ver el tránsito.';$('apply').disabled=false;updateStatus();render();renderStats();}
function readOptions(){const values={duration:+$('duration').value,demand:+$('demand').value,seed:+$('seed').value,cycle:+$('cycle').value,green:+$('green').value,distribute:$('distribute').checked};if(![values.duration,values.demand,values.seed,values.cycle,values.green].every(Number.isFinite)||!Number.isInteger(values.seed)||values.seed<0||values.seed>4294967295||values.demand<0||values.demand>5000||values.duration<300||values.duration>3600||values.cycle<90||values.cycle>180||values.green<25||values.green>55)throw Error('Revisa duración, demanda, semilla y tiempos del semáforo.');return values;}
$('settings').addEventListener('submit',e=>{e.preventDefault();try{options=readOptions();reset();$('feedback').textContent='Escenario aplicado. Ambos controladores usan las mismas llegadas.';}catch(err){$('feedback').textContent=err.message;}});
$('demand').addEventListener('input',()=>{$('demandValue').textContent=`${format.format(+$('demand').value)} veh/h`;});
$('play').addEventListener('click',()=>{ui.running=!ui.running;ui.elapsed=0;$('feedback').textContent=ui.running?'Simulación en marcha. Cambia el escenario mostrado sin perder la comparación.':'Simulación en pausa.';updateStatus();});
$('restart').addEventListener('click',reset);
$('finish').addEventListener('click',()=>{ui.running=false;ui.calculating=true;const token=++ui.frame;$('apply').disabled=true;updateStatus();$('feedback').textContent='Calculando ambos escenarios hasta el final…';function chunk(){if(token!==ui.frame)return;try{const start=performance.now();while(pair.fixed.time<options.duration&&performance.now()-start<25){pair.fixed.step();pair.adaptive.step();}render();renderStats();if(pair.fixed.time+1e-8<options.duration)setTimeout(chunk,0);else{ui.calculating=false;$('apply').disabled=false;updateStatus();$('feedback').textContent='Experimento completado. Puedes descargar los resultados.';}}catch(err){ui.calculating=false;$('apply').disabled=false;updateStatus();$('feedback').textContent=`Error: ${err.message}`;}}chunk();});
function setMode(mode){ui.mode=mode;for(const m of ['adaptive','fixed']){const el=$(m==='adaptive'?'modeAdaptive':'modeFixed');el.classList.toggle('active',m===mode);el.setAttribute('aria-pressed',String(m===mode));}$('mapMode').textContent=mode==='adaptive'?'CONTROL ADAPTATIVO':'CONTROL FIJO';render();renderStats();}
$('modeAdaptive').addEventListener('click',()=>setMode('adaptive'));$('modeFixed').addEventListener('click',()=>setMode('fixed'));
for(const id of ['heatToggle','sensorToggle'])$(id).addEventListener('change',render);
$('referenceToggle').addEventListener('change',()=>{$('mapBase').setAttribute('href',$('referenceToggle').checked?'/maps/heredia-referencia.png':'/maps/heredia-limpia.png');});
$('mapExpand').addEventListener('click',()=>{$('mapStage').classList.toggle('expanded');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('mapStage').classList.remove('expanded');});
function transform(){$('mapViewport').setAttribute('transform',`translate(${ui.panX} ${ui.panY}) translate(${MAP.width/2} ${MAP.height/2}) scale(${ui.zoom}) translate(${-MAP.width/2} ${-MAP.height/2})`);}
function zoom(f){ui.zoom=Math.max(.65,Math.min(5,ui.zoom*f));transform();}
$('zoomIn').addEventListener('click',()=>zoom(1.2));$('zoomOut').addEventListener('click',()=>zoom(1/1.2));$('zoomReset').addEventListener('click',()=>{ui.zoom=1;ui.panX=0;ui.panY=0;transform();});
let drag=null;$('map').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,panX:ui.panX,panY:ui.panY,moved:false};});
$('map').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)<5)return;$('map').setPointerCapture(e.pointerId);drag.moved=true;$('map').classList.add('dragging');const rect=$('map').getBoundingClientRect(),scale=1/Math.min(rect.width/MAP.width,rect.height/MAP.height);ui.panX=Math.max(-900,Math.min(900,drag.panX+dx*scale));ui.panY=Math.max(-650,Math.min(650,drag.panY+dy*scale));transform();});
$('map').addEventListener('pointerup',()=>{$('map').classList.remove('dragging');setTimeout(()=>{drag=null;},0);});$('map').addEventListener('pointercancel',()=>{drag=null;$('map').classList.remove('dragging');});
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').addEventListener('click',()=>{const rows=[...pair.fixed.records,...pair.adaptive.records];download('lidar-transito-experimento.csv',csv(rows.map(r=>({...r,demanda_veh_h:options.demand,semilla:options.seed,duracion_s:options.duration,ciclo_s:options.cycle,verde_inicial_s:options.green,redistribucion:options.distribute}))));$('feedback').textContent='CSV descargado con ambos escenarios y parámetros del experimento.';});
$('exportCompare').addEventListener('click',()=>download('lidar-transito-comparacion.csv',csv(comparisons())));
$('exportQ').addEventListener('click',()=>{const states=['DOMINIO_HORIZONTAL','DOMINIO_VERTICAL','EQUILIBRADO','SATURADO'],rows=[];for(const [id,signal] of pair.adaptive.signals)for(let s=0;s<4;s++)for(let a=0;a<3;a++)rows.push({cruce:id,nombre:net.byId.get(id).name,estado:states[s],ajuste_verde_s:[-5,0,5][a],Q:+signal.q[s][a].toFixed(6),ciclos:signal.cycles});download('lidar-transito-tablas-q.csv',csv(rows));});
window.addEventListener('resize',drawChart);
let previous=performance.now();function frame(now){const elapsed=Math.min(.1,(now-previous)/1000);previous=now;if(ui.running&&!ui.calculating){ui.elapsed+=elapsed*+$('rate').value;let count=0;while(ui.elapsed>=CONFIG.dt&&pair.fixed.time<options.duration&&count++<40){pair.fixed.step();pair.adaptive.step();ui.elapsed-=CONFIG.dt;}if(pair.fixed.time>=options.duration){ui.running=false;$('feedback').textContent='Experimento completado. Revisa la comparación y exporta los resultados.';updateStatus();}}
  if(now-ui.lastRender>50){render();ui.lastRender=now;}if(now-ui.lastStats>400){renderStats();ui.lastStats=now;}requestAnimationFrame(frame);
}
drawBase();render();renderStats();updateStatus();requestAnimationFrame(frame);
