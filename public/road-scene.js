import {CONFIG,pointOnEdge} from './network.js';
const m=CONFIG.metersPerUnit,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function roadGroups(net){const groups=new Map();for(const e of net.edges){if(!groups.has(e.roadId))groups.set(e.roadId,[]);groups.get(e.roadId).push(e);}return groups;}
export function streetSpec(net,layout,edge){const group=[...net.edges].filter(e=>e.roadId===edge.roadId),base=group[0],saved=layout.streets?.[edge.roadId],from=saved?.from??base.from;return {from,forward:saved?.forward??group.filter(e=>e.from===from).reduce((s,e)=>s+(e.laneCount??1),0),reverse:saved?.reverse??group.filter(e=>e.from!==from).reduce((s,e)=>s+(e.laneCount??1),0),width:saved?.width??layout.laneWidth};}
export function laneOffset(edge,lane=0){const own=edge.laneCount??1,opposite=edge.opposingLanes??0;return ((own+opposite)/2-Math.min(Math.max(0,lane),Math.max(0,own-1))-.5)*(edge.laneWidth??3.25)/m;}
// Intersect adjacent offset segments: a bisector alone narrows lanes at corners.
export function offsetPolyline(points,d){
 const clean=points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>1e-8);
 return clean.map((p,i)=>{
  const normal=(a,b)=>{const n=Math.hypot(b[0]-a[0],b[1]-a[1]);return [-(b[1]-a[1])/n,(b[0]-a[0])/n];};
  if(clean.length<2)return [...p];
  const a=normal(clean[Math.max(0,i-1)],clean[i===0?1:i]);
  if(i===0)return [p[0]+a[0]*d,p[1]+a[1]*d];
  if(i===clean.length-1)return [p[0]+a[0]*d,p[1]+a[1]*d];
  const b=normal(clean[i],clean[i+1]),denominator=1+a[0]*b[0]+a[1]*b[1];
  if(denominator<.125)return [p[0]+b[0]*d,p[1]+b[1]*d];
  return [p[0]+(a[0]+b[0])*d/denominator,p[1]+(a[1]+b[1])*d/denominator];
 });
}
export function trimPolyline(points,start,end){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 const total=lengths.reduce((a,b)=>a+b,0),finish=total-end;if(finish<=start)return [];
 const result=[];let at=0;
 for(let i=0;i<lengths.length;i++){const len=lengths[i],next=at+len;if(len>0&&next>start&&at<finish){const lo=Math.max(0,(start-at)/len),hi=Math.min(1,(finish-at)/len),a=points[i],b=points[i+1];if(!result.length)result.push([a[0]+(b[0]-a[0])*lo,a[1]+(b[1]-a[1])*lo]);result.push([a[0]+(b[0]-a[0])*hi,a[1]+(b[1]-a[1])*hi]);}at=next;}
 return result;
}
function hull(points){
 const sorted=points.toSorted((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const half=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out.slice(0,-1);};
 return [...half(sorted),...half(sorted.toReversed())];
}
export function renderRoadScene(net,layout,selected){let curbs='',pavement='',paint='',labels='',hits='';const joins=new Map();
 const junctions=new Map();
 for(const group of roadGroups(net).values()){const e=group[0],s=streetSpec(net,layout,e),half=(s.forward+s.reverse)*s.width/m/2;for(const id of [e.from,e.to]){const j=junctions.get(id)??{count:0,half:0};j.count++;j.half=Math.max(j.half,half);junctions.set(id,j);}}
 for(const group of roadGroups(net).values()){
  const edge=group[0],spec=streetSpec(net,layout,edge),forward=edge.from===spec.from?spec.forward:spec.reverse,reverse=edge.from===spec.from?spec.reverse:spec.forward,total=forward+reverse,width=total*spec.width/m,points=edge.points,pts=points.map(p=>p.join(',')).join(' ');if(!total)continue;
  for(const [id,p,q] of [[edge.from,points[0],points[1]],[edge.to,points.at(-1),points.at(-2)]]){
   const length=Math.hypot(q[0]-p[0],q[1]-p[1]);if(!length)continue;
   const normal=[-(q[1]-p[1])/length,(q[0]-p[0])/length],join=joins.get(id)??{curb:[],asphalt:[]};
   for(const sign of [-1,1])for(const [key,radius] of [['curb',width/2+.6],['asphalt',width/2]])join[key].push([p[0]+normal[0]*radius*sign,p[1]+normal[1]*radius*sign]);joins.set(id,join);
  }
  // Paint all curbs first, then all asphalt. No segment's curb cuts another street.
  curbs+=`<polyline points="${pts}" fill="none" stroke="#c5ccbf" stroke-width="${width+1.2}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/>`;
  pavement+=`<polyline points="${pts}" fill="none" stroke="#46514f" stroke-width="${width}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/>`;
  const clearance=id=>{const j=junctions.get(id);return j.count>=3?j.half+1.2:0;};
  for(let i=1;i<total;i++){const center=forward>0&&reverse>0&&i===forward,d=width/2-i*spec.width/m,mark=trimPolyline(offsetPolyline(points,d),clearance(edge.from),clearance(edge.to));if(mark.length>1)paint+=`<polyline points="${mark.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${center?'#e8c975':'#e7e9df'}" stroke-width="${.12/m}" stroke-linejoin="miter" ${center?'':'stroke-dasharray="1.1 1.8"'}/>`;}
  if(edge.roadId===selected)paint+=`<polyline points="${pts}" fill="none" stroke="#74dac3" stroke-opacity=".24" stroke-width="${width}" stroke-linejoin="miter"/>`;
  for(const e of group.filter(e=>e.laneCount>0))if(e.length>28){for(let lane=0;lane<e.laneCount;lane++){
   const p=pointOnEdge(e,Math.max(14,e.length*.55),laneOffset(e,lane)),turns=layout.laneTurns?.[e.id];let arrow='M -1.4 0 L 1.4 0 M .4 -.6 L 1.4 0 L .4 .6';
   const exitId=turns&&Object.keys(turns).find(id=>turns[id].includes(lane)),exit=net.edgeById.get(exitId);
   if(exit){const a=pointOnEdge(e,e.length).angle,b=pointOnEdge(exit,0).angle,angle=((b-a+540)%360)-180;if(Math.abs(angle)>35){const side=angle>0?1:-1;arrow=`M -1.4 0 L 0 0 L 0 ${side*1.3} M -.6 ${side*.6} L 0 ${side*1.3} L .6 ${side*.6}`;}}
   paint+=`<path d="${arrow}" transform="translate(${p.x} ${p.y}) rotate(${p.angle})" fill="none" stroke="#cddbd2" stroke-width=".18"/>`;
  }}
  hits+=`<polyline class="street-pick" data-street="${edge.id}" points="${pts}" fill="none" stroke="transparent" stroke-width="${Math.max(width,2)}"/>`;
  if(layout.reviewRoads?.includes(edge.roadId)){const p=pointOnEdge(edge,edge.length/2,width/2+9);labels+=`<text x="${p.x}" y="${p.y}" font-size="2.2" fill="#9b4e14" stroke="#fff" stroke-width=".6" paint-order="stroke">REVISAR 4/16 · 1 por sentido</text>`;}
  if(edge.length>65){const p=pointOnEdge(edge,edge.length*.4,width/2+1.2),angle=p.angle>90||p.angle< -90?p.angle+180:p.angle;labels+=`<text x="${p.x}" y="${p.y}" transform="rotate(${angle} ${p.x} ${p.y})" font-size="1.65" fill="#61746b" text-anchor="middle">${esc(edge.name)}</text>`;}
 }
 for(const join of joins.values()){
  const polygon=(points,color)=>`<polygon points="${hull(points).map(p=>p.join(',')).join(' ')}" fill="${color}"/>`;
  if(join.asphalt.length>2){curbs+=polygon(join.curb,'#c5ccbf');pavement+=polygon(join.asphalt,'#46514f');}
 }
 return `<g id="ownMapSurface"><rect width="2048" height="1200" fill="#edf0e6"/><g id="roadCurbs">${curbs}</g><g id="roadAsphalt">${pavement}</g><g id="roadPaint">${paint}</g><g class="street-labels" aria-hidden="true">${labels}</g><g>${hits}</g></g>`;
}
