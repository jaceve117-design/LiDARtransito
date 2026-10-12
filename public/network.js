import { MAP } from './network-data.js';
export { MAP };
export const CONFIG={label:'Casco central de Heredia',geometry:'Geometría municipal alineada a Heredia.png; sentidos marcados por el usuario.',metersPerUnit:MAP.metersPerUnit,speed:11.11,carLength:4.5,minGap:2.5,yellow:3,allRed:1,stopDistance:6,dt:.2};
export function createNetwork(){const {nodes,edges}=MAP,byId=new Map(nodes.map(n=>[n.id,n])),outgoing=new Map(nodes.map(n=>[n.id,[]])),incoming=new Map(nodes.map(n=>[n.id,[]]));for(const e of edges){outgoing.get(e.from).push(e);incoming.get(e.to).push(e);}const movementRules=MAP.movementRules,ruleByNode=new Map((movementRules?.junctions??[]).map(j=>[j.node,j])),yieldByIncoming=new Map(),busTurns=new Map();for(const j of ruleByNode.values()){for(const rule of j.yields??[]){if(!yieldByIncoming.has(rule.incoming))yieldByIncoming.set(rule.incoming,[]);yieldByIncoming.get(rule.incoming).push({...rule,node:j.node});}for(const rule of j.busTurns??[])busTurns.set(rule.incoming,new Set(rule.outgoing));}
return {movementRules,ruleByNode,yieldByIncoming,busTurns,focusZone:MAP.focusZone,nodes,edges,byId,outgoing,incoming,boundaries:nodes.filter(n=>n.boundary),edgeById:new Map(edges.map(e=>[e.id,e]))};}
// Heap-based Dijkstra keeps the municipal network interactive at hundreds of junctions.
export function shortestPath(network,origin,destination,cost=()=>0,{vehicleType='car',incomingEdgeId=null}={}){
  const constrained=vehicleType==='bus'&&network.busTurns?.size>0,keyFor=(id,edge)=>constrained?edge??'start':id,initial=keyFor(origin,incomingEdgeId),distances=new Map([[initial,0]]),previous=new Map(),heap=[];
  function push(id,key,incoming,d){const item={id,key,incoming,d};heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].d<=d)break;heap[i]=heap[p];i=p;}heap[i]=item;}
  function pop(){const root=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].d<heap[c].d)c++;if(heap[c].d>=last.d)break;heap[i]=heap[c];i=c;}heap[i]=last;}return root;}
  let finalKey=null;push(origin,initial,incomingEdgeId,0);
  while(heap.length){const {id,key,incoming,d}=pop();if(d!==(distances.get(key)??Infinity))continue;if(id===destination){finalKey=key;break;}
    const allowed=constrained?network.busTurns.get(incoming):null,prior=network.edgeById.get(incoming);
    for(const e of network.outgoing.get(id)||[]){if(allowed&&!allowed.has(e.id)||prior&&e.to===prior.from||network.byId.get(e.to).boundary&&e.to!==destination)continue;
      const next=d+e.length/CONFIG.speed+cost(e),nextKey=keyFor(e.to,e.id);if(next<(distances.get(nextKey)??Infinity)){distances.set(nextKey,next);previous.set(nextKey,{edge:e,key});push(e.to,nextKey,e.id,next);}}
  }
  if(finalKey===null)return [];const result=[];let at=finalKey;while(at!==initial){const p=previous.get(at);if(!p)return [];result.unshift(p.edge.id);at=p.key;}return result;
}
export function pointOnEdge(edge,p,offset=0){let remaining=Math.max(0,Math.min(edge.length,p))/CONFIG.metersPerUnit;const points=edge.points;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(remaining<=length||i===points.length-1){const t=Math.min(1,remaining/Math.max(.001,length));return {x:a[0]+dx*t-dy/length*offset,y:a[1]+dy*t+dx/length*offset,angle:Math.atan2(dy,dx)*180/Math.PI};}remaining-=length;}return {x:points[0][0],y:points[0][1],angle:0};}
