import {CONFIG,pointOnEdge} from './network.js';
const m=CONFIG.metersPerUnit,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function roadGroups(net){const groups=new Map();for(const e of net.edges){if(!groups.has(e.roadId))groups.set(e.roadId,[]);groups.get(e.roadId).push(e);}return groups;}
export function streetSpec(net,layout,edge){const group=[...net.edges].filter(e=>e.roadId===edge.roadId),base=group[0],saved=layout.streets?.[edge.roadId],from=saved?.from??base.from;return {from,forward:saved?.forward??group.filter(e=>e.from===from).reduce((s,e)=>s+(e.laneCount??1),0),reverse:saved?.reverse??group.filter(e=>e.from!==from).reduce((s,e)=>s+(e.laneCount??1),0),width:saved?.width??layout.laneWidth};}
export function laneOffset(edge,lane=0){const own=edge.laneCount??1,opposite=edge.opposingLanes??0;return ((own+opposite)/2-Math.min(Math.max(0,lane),Math.max(0,own-1))-.5)*(edge.laneWidth??3.25)/m;}
export function offsetPolyline(points,d){return points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;return [p[0]-dy/n*d,p[1]+dx/n*d];});}
export function renderRoadScene(net,layout,selected){let pavement='',paint='',labels='',hits='';
 for(const group of roadGroups(net).values()){
  const edge=group[0],spec=streetSpec(net,layout,edge),forward=edge.from===spec.from?spec.forward:spec.reverse,reverse=edge.from===spec.from?spec.reverse:spec.forward,total=forward+reverse,width=total*spec.width/m,points=edge.points,pts=points.map(p=>p.join(',')).join(' ');if(!total)continue;
  pavement+=`<polyline points="${pts}" fill="none" stroke="#d5d8d1" stroke-width="${width+1.7}" stroke-linecap="butt" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="${edge.roadId===selected?'#344f4a':'#46514f'}" stroke-width="${width}" stroke-linecap="butt" stroke-linejoin="round"/>`;
  for(let i=1;i<total;i++){const center=forward>0&&reverse>0&&i===forward,d=width/2-i*spec.width/m;paint+=`<polyline points="${offsetPolyline(points,d).map(p=>p.join(',')).join(' ')}" fill="none" stroke="${center?'#e8c975':'#e7e9df'}" stroke-width="${.12/m}" ${center?'':'stroke-dasharray="1.1 1.8"'}/>`;}
  for(const e of group.filter(e=>e.laneCount>0))if(e.length>28){for(let lane=0;lane<e.laneCount;lane++){const p=pointOnEdge(e,Math.max(14,e.length*.55),laneOffset(e,lane));paint+=`<path d="M -1.4 0 L 1.4 0 M .4 -.6 L 1.4 0 L .4 .6" transform="translate(${p.x} ${p.y}) rotate(${p.angle})" fill="none" stroke="#cddbd2" stroke-width=".18"/>`;}}
  hits+=`<polyline class="street-pick" data-street="${edge.id}" points="${pts}" fill="none" stroke="transparent" stroke-width="${Math.max(width,2)}"/>`;
  if(edge.length>65){const p=pointOnEdge(edge,edge.length*.4,width/2+1.2),angle=p.angle>90||p.angle< -90?p.angle+180:p.angle;labels+=`<text x="${p.x}" y="${p.y}" transform="rotate(${angle} ${p.x} ${p.y})" font-size="1.65" fill="#61746b" text-anchor="middle">${esc(edge.name)}</text>`;}
 }
 return `<g id="ownMapSurface"><rect width="2048" height="1200" fill="#edf0e6"/>${pavement}${paint}<g class="street-labels" aria-hidden="true">${labels}</g><g>${hits}</g></g>`;
}
