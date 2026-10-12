// Rebuild the street graph from the municipal snapshot and the user's marked reference.
// No credentials, online services or AI are required when rebuilding this snapshot.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const source=JSON.parse(await readFile('data/municipal-roads.json','utf8'));
const fit=JSON.parse(await readFile('data/map-registration.json','utf8'));
const width=2048,height=1033,metersPerUnit=Math.cos(10*Math.PI/180)/fit.scale;
const project=([x,y])=>[fit.tx+fit.scale*(x-fit.ref[0]),fit.ty-fit.scale*(y-fit.ref[1])];
const marks=[
 {id:'av3-c16',name:'Avenida 3 · Calle 16',x:601,y:356},
 {id:'av1-c16',name:'Avenida 1 · Calle 16',x:600,y:392},
 {id:'av2-c20',name:'Avenida 2 · acceso oeste',x:526,y:458},
 {id:'av4-c14',name:'Avenida 4 · cruce 1',x:634,y:501},
 {id:'av4-c12',name:'Avenida 4 · cruce 2',x:670,y:509},
 {id:'av4-c8',name:'Avenida 4 · cruce 3',x:742,y:514},
 {id:'av4-c6',name:'Avenida 4 · cruce 4',x:779,y:518},
 {id:'pirro',name:'Pirro · acceso al centro',x:995,y:501},
 {id:'pirro-sur',name:'Pirro · confluencia sur / Ruta 5',x:1018,y:676},
];
const guides=[
 {id:'oeste-este-1',label:'Ingreso al este · entorno estación',points:[[878,571],[937,577]],axis:'H'},
 {id:'oeste-este-2',label:'Ingreso al este · ferrocarril',points:[[847,609],[921,616]],axis:'H'},
 {id:'sur-norte',label:'Ingreso al norte · Pirro',points:[[1035,746],[1033,690]],axis:'V'},
 {id:'norte-pirro',label:'Continuación al norte · Pirro',points:[[1023,635],[1010,521]],axis:'V'},
 {id:'este-oeste',label:'Ingreso desde el este',points:[[1150,662],[1041,655]],axis:'H'},
 {id:'salida-sur',label:'Salida hacia el sur · Guayabal',points:[[965,702],[1008,763]],axis:'V'},
];
function clip(a,b){let lo=0,hi=1;const dx=b[0]-a[0],dy=b[1]-a[1];for(const [p,q] of [[-dx,a[0]-12],[dx,width-12-a[0]],[-dy,a[1]-12],[dy,height-12-a[1]]]){if(!p){if(q<0)return null;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}return [[a[0]+dx*lo,a[1]+dy*lo],[a[0]+dx*hi,a[1]+dy*hi]];}
const vertices=[],buckets=new Map(),segments=[];
function vertex(p){const bx=Math.floor(p[0]/2),by=Math.floor(p[1]/2);for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const id of buckets.get(`${x},${y}`)||[]){const v=vertices[id];if(Math.hypot(v.x-p[0],v.y-p[1])<1.8)return id;}const id=vertices.length;vertices.push({id,x:p[0],y:p[1]});const key=`${bx},${by}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);return id;}
for(const f of source.features)for(const path of f.geometry.paths)for(let i=1;i<path.length;i++){const c=clip(project(path[i-1]),project(path[i]));if(!c)continue;const a=vertex(c[0]),b=vertex(c[1]);if(a!==b)segments.push({a,b,sourceId:f.attributes.OBJECTID,name:f.attributes.NOMBRE_VIA||'Vía municipal'});}
const split=[];
for(const s of segments){const a=vertices[s.a],b=vertices[s.b],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy,cuts=[{id:s.a,t:0},{id:s.b,t:1}];for(const v of vertices){if(v.id===s.a||v.id===s.b)continue;const t=((v.x-a.x)*dx+(v.y-a.y)*dy)/len2;if(t<=.01||t>=.99)continue;if(Math.hypot(v.x-a.x-dx*t,v.y-a.y-dy*t)<1.8)cuts.push({id:v.id,t});}cuts.sort((a,b)=>a.t-b.t);for(let i=1;i<cuts.length;i++)if(cuts[i-1].id!==cuts[i].id)split.push({...s,a:cuts[i-1].id,b:cuts[i].id});}
const adjacency=new Map(vertices.map(v=>[v.id,[]])),unique=new Set(),raw=[];
for(const s of split){const key=[s.a,s.b].sort((a,b)=>a-b).join(',');if(unique.has(key))continue;unique.add(key);const id=raw.length;raw.push(s);adjacency.get(s.a).push(id);adjacency.get(s.b).push(id);}
// Keep the connected urban road system; isolated fragments cannot support a simulated trip.
let largest=new Set(),seen=new Set();for(const v of vertices){if(seen.has(v.id))continue;const component=new Set([v.id]),queue=[v.id];seen.add(v.id);while(queue.length){const n=queue.pop();for(const e of adjacency.get(n)){const s=raw[e],other=s.a===n?s.b:s.a;if(!seen.has(other)){seen.add(other);component.add(other);queue.push(other);}}}if(component.size>largest.size)largest=component;}
for(const m of marks){const candidates=vertices.filter(v=>largest.has(v.id)&&adjacency.get(v.id).length>=3);const nearest=candidates.reduce((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)<Math.hypot(b.x-m.x,b.y-m.y)?a:b);const distance=Math.hypot(nearest.x-m.x,nearest.y-m.y);if(distance>24)throw Error(`Reference signal ${m.id} is ${distance.toFixed(1)} px from municipal junctions`);if(nearest.mark)throw Error(`Duplicate signal at ${m.id}`);nearest.mark=m;}
const core=new Set(vertices.filter(v=>largest.has(v.id)&&(adjacency.get(v.id).length!==2||v.mark)).map(v=>v.id)),used=new Set(),roads=[];
for(const start of core)for(const first of adjacency.get(start)){if(used.has(first))continue;let current=start,nextEdge=first,points=[[vertices[start].x,vertices[start].y]],sourceIds=[],name=raw[first].name;while(true){used.add(nextEdge);const s=raw[nextEdge];sourceIds.push(s.sourceId);current=s.a===current?s.b:s.a;points.push([vertices[current].x,vertices[current].y]);if(core.has(current))break;nextEdge=adjacency.get(current).find(e=>!used.has(e));if(nextEdge===undefined)break;}if(start!==current)roads.push({a:start,b:current,points,name,sourceIds:[...new Set(sourceIds)]});}
const idFor=v=>vertices[v].mark?.id??`mh-${v}`;
const nodes=[...core].map((id,i)=>{const v=vertices[id],boundary=adjacency.get(id).length===1&&(v.x<22||v.x>width-22||v.y<22||v.y>height-22);const dx=v.x-width/2,dy=v.y-height/2,side=Math.abs(dx)>Math.abs(dy)?dx<0?'O':'E':dy<0?'N':'S';return {id:idFor(id),x:+v.x.toFixed(2),y:+v.y.toFixed(2),name:v.mark?.name??(boundary?`Acceso ${side} · ${i+1}`:`Cruce municipal ${i+1}`),signal:!!v.mark,signalSource:v.mark?'USER':null,annotation:v.mark?[v.mark.x,v.mark.y]:null,boundary,side,row:i%17,col:Math.floor(i/17),weight:boundary&&v.x>930&&v.y>470&&v.y<850?8:1};});
function matchDirection(points,sourceIds){if(sourceIds.includes(1911)&&points.some(([x,y])=>x>970&&x<1050&&y>680&&y<780)){const a=points[0],b=points.at(-1);return {forward:(b[0]-a[0])*43+(b[1]-a[1])*61>0,guide:'salida-sur',distance:0};}let best=null;for(const g of guides)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],u=g.points[0],v=g.points[1],dx=v[0]-u[0],dy=v[1]-u[1],t=Math.max(0,Math.min(1,((mid[0]-u[0])*dx+(mid[1]-u[1])*dy)/(dx*dx+dy*dy))),distance=Math.hypot(mid[0]-u[0]-t*dx,mid[1]-u[1]-t*dy),dot=(b[0]-a[0])*dx+(b[1]-a[1])*dy,cos=Math.abs(dot)/(Math.hypot(b[0]-a[0],b[1]-a[1])*Math.hypot(dx,dy));if(distance<24&&cos>.8&&(!best||distance<best.distance))best={distance,forward:dot>0,guide:g.id};}return best;}
const edges=[];for(let i=0;i<roads.length;i++){const r=roads[i],length=r.points.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p[0]-r.points[j][0],p[1]-r.points[j][1])*metersPerUnit,0);if(length<.1)continue;const direction=matchDirection(r.points,r.sourceIds);for(const forward of direction?[direction.forward]:[true,false]){const points=(forward?r.points:[...r.points].reverse()).map(p=>p.map(v=>+v.toFixed(2))),a=forward?r.a:r.b,b=forward?r.b:r.a,dx=points.at(-1)[0]-points[0][0],dy=points.at(-1)[1]-points[0][1];edges.push({id:`road-${i}-${forward?'f':'r'}`,roadId:`road-${i}`,from:idFor(a),to:idFor(b),length:+length.toFixed(3),points,axis:Math.abs(dx)>Math.abs(dy)?'H':'V',name:r.name,directionSource:direction?'USER':'UNCONFIRMED',guide:direction?.guide??null});}}
for(const n of nodes){n.canEnter=edges.some(e=>e.from===n.id);n.canExit=edges.some(e=>e.to===n.id);}
const directed=new Map(nodes.map(n=>[n.id,[]]));for(const e of edges)directed.get(e.from).push(e.to);const bounds=new Set(nodes.filter(n=>n.boundary).map(n=>n.id));for(const n of nodes.filter(n=>n.boundary&&n.canEnter)){const seen=new Set([n.id]),queue=[n.id];while(queue.length){const id=queue.pop();for(const to of directed.get(id)){if(seen.has(to))continue;seen.add(to);if(!bounds.has(to))queue.push(to);}}n.destinations=nodes.filter(b=>b.boundary&&b.canExit&&b.side!==n.side&&seen.has(b.id)).map(b=>b.id);if(!n.destinations.length)throw Error('No destinations for '+n.id);}
const graph={version:'0.2',width,height,metersPerUnit:+metersPerUnit.toFixed(6),registration:fit,sourceUrl:'https://sig.heredia.go.cr/server/rest/services/UTGV/RedVIalTramosMH/MapServer',signalSource:'Heredia.png · referencia marcada por el usuario',guides,nodes,edges};
await mkdir('public/maps',{recursive:true});await writeFile('public/network-data.js','// Municipal road geometry, registered to the supplied image. See docs/mapa-real.md.\nexport const MAP = '+JSON.stringify(graph)+';\n');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1033" viewBox="0 0 2048 1033"><rect width="2048" height="1033" fill="#f4f5f3"/>${roads.map(r=>`<polyline points="${r.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#aab6bd" stroke-width="2"/>`).join('')}${marks.map(m=>`<circle cx="${m.x}" cy="${m.y}" r="6" fill="red"/>`).join('')}${nodes.filter(n=>n.signal).map(n=>`<circle cx="${n.x}" cy="${n.y}" r="9" fill="none" stroke="#198966" stroke-width="2"/>`).join('')}</svg>`;
await writeFile('data/registration-check.svg',svg);
console.log(JSON.stringify({nodes:nodes.length,roads:roads.length,edges:edges.length,signals:nodes.filter(n=>n.signal).length,boundaries:nodes.filter(n=>n.boundary).length,markedEdges:edges.filter(e=>e.directionSource==='USER').length,signalAlignment:nodes.filter(n=>n.signal).map(n=>({id:n.id,dx:+(n.x-n.annotation[0]).toFixed(2),dy:+(n.y-n.annotation[1]).toFixed(2)}))}));
