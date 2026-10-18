import { CONFIG, pointOnEdge } from './network.js';

// Drawing geometry only: positions in metres and traffic decisions stay unchanged.
// Positive offset is the right side of travel in SVG's downward-positive Y axis.
function turnGeometry(incoming,outgoing,offset){
  if(!incoming||!outgoing||incoming.to!==outgoing.from)return null;
  const radius=Math.min(5.5,incoming.length/2,outgoing.length/2);
  if(radius<1e-6)return null;
  const a=pointOnEdge(incoming,incoming.length-radius,offset);
  const b=pointOnEdge(outgoing,radius,offset);
  const start=a.angle*Math.PI/180,end=b.angle*Math.PI/180;
  const handle=Math.min(radius/CONFIG.metersPerUnit*.5523,Math.hypot(b.x-a.x,b.y-a.y)*.55);
  return {radius,a,b,c:{x:a.x+Math.cos(start)*handle,y:a.y+Math.sin(start)*handle},d:{x:b.x-Math.cos(end)*handle,y:b.y-Math.sin(end)*handle}};
}
function onTurn(g,t){
  const {a,b,c,d}=g,u=1-t;
  const x=u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x;
  const y=u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y;
  const dx=3*u*u*(c.x-a.x)+6*u*t*(d.x-c.x)+3*t*t*(b.x-d.x);
  const dy=3*u*u*(c.y-a.y)+6*u*t*(d.y-c.y)+3*t*t*(b.y-d.y);
  return {x,y,angle:Math.atan2(dy,dx)*180/Math.PI};
}
export function vehiclePose(network,vehicle,offset=1.5){
  const edge=network.edgeById.get(vehicle.path[vehicle.index]);
  const previous=network.edgeById.get(vehicle.previousEdge??vehicle.path[vehicle.index-1]);
  const next=network.edgeById.get(vehicle.path[vehicle.index+1]);
  const entry=turnGeometry(previous,edge,offset);
  if(entry&&vehicle.p<entry.radius)return onTurn(entry,.5+vehicle.p/(2*entry.radius));
  const exit=turnGeometry(edge,next,offset);
  if(exit&&vehicle.p>edge.length-exit.radius)return onTurn(exit,(vehicle.p-edge.length+exit.radius)/(2*exit.radius));
  return pointOnEdge(edge,vehicle.p,offset);
}
