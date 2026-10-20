import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork,CONFIG,shortestPath} from '../public/network.js';
import {freshLayout,defaultApproach,validateLayout} from '../public/road-layout.js';
import {Simulation} from '../public/simulation.js';
import {laneOffset,renderRoadScene} from '../public/road-scene.js';
const base={duration:120,demand:0,seed:42,cycle:90,green:35,distribute:false};
function street(layout,id,forward,reverse){const e=createNetwork().edges.find(e=>e.roadId===id);layout.vector=true;layout.streets[id]={from:e.from,forward,reverse,width:3.25};return e;}
function car(id,e,lane,p){return {id,t:0,destination:e.to,path:[e.id],index:0,lane,p,v:0,wait:0};}
test('Street directions can be reversed, create a connected reverse edge and survive export/import',()=>{
 const layout=freshLayout(),e=street(layout,'road-34',0,2),n=createNetwork(layout),r=n.edges.find(r=>r.roadId===e.roadId&&r.from===e.to);
 assert.equal(n.edgeById.get(e.id).laneCount,0);assert.equal(r.laneCount,2);assert.deepEqual(r.points,n.edgeById.get(e.id).points.toReversed());assert.ok(!shortestPath(n,e.from,e.to).includes(e.id));
 layout.approaches[r.id]=defaultApproach(r);layout.roads[e.roadId]={from:r.from,points:r.points};assert.deepEqual(validateLayout(JSON.parse(JSON.stringify(layout)),createNetwork()),layout);
});
test('Two parallel lanes have independent queues and keep physical spacing within each lane',()=>{
 const layout=freshLayout(),e=street(layout,'road-34',2,0),sim=new Simulation({...base,roadLayout:layout});
 sim.signals.get(e.to).phase=()=>({axis:null,phase:'ROJO'});
 const stop=sim.stopPosition(sim.network.edgeById.get(e.id)),a=car(1,e,0,stop),b=car(2,e,1,stop-18),c=car(3,e,0,stop-18);
 sim.lanes.get(e.id).push(a,b,c);sim.activeLanes.add(e.id);sim.generated=3;
 for(let i=0;i<150;i++)sim.step();assert.ok(Math.abs(b.p-stop)<.01);assert.ok(a.p-c.p>=CONFIG.carLength+CONFIG.minGap-1e-7);assert.ok(b.p>c.p+6);assert.equal(sim.generated,sim.completed+sim.vehicles.length+sim.pending.length);
 assert.ok(laneOffset(sim.network.edgeById.get(e.id),0)>0);assert.ok(laneOffset(sim.network.edgeById.get(e.id),1)<0);
});
test('A proposed ALTO requires a complete stop before proceeding even when the recorded signal is red',()=>{
 const layout=freshLayout(),e=street(layout,'road-34',1,0);layout.approaches[e.id]={...defaultApproach(e),crosswalk:false,control:'stop'};
 const sim=new Simulation({...base,roadLayout:layout});sim.signals.get(e.to).phase=()=>({axis:null,phase:'ROJO'});const stop=sim.stopPosition(sim.network.edgeById.get(e.id)),v=car(1,e,0,stop);
 sim.lanes.get(e.id).push(v);sim.activeLanes.add(e.id);sim.generated=1;
 for(let i=0;i<4;i++)sim.step();assert.equal(v.p,stop);for(let i=0;i<100;i++)sim.step();assert.equal(sim.completed,1);
});
test('A proposed CEDA waits for an approaching conflicting stream and then resumes',()=>{
 const layout=freshLayout(),net=createNetwork(),e=net.incoming.get('pirro').find(e=>e.axis==='H'),other=net.incoming.get('pirro').find(e=>e.axis==='V'),out=net.outgoing.get('pirro').find(e=>e.to!==other.from);layout.vector=true;layout.approaches[e.id]={...defaultApproach(e),control:'yield'};
 const sim=new Simulation({...base,roadLayout:layout}),v=car(2,e,0,sim.stopPosition(e)),priority={...car(1,other,0,other.length-4),path:[other.id,out.id],v:5};sim.signals.get('pirro').phase=()=>({axis:'V',phase:'VERDE'});sim.lanes.get(other.id).push(priority);
 v.path=[e.id,out.id];assert.equal(sim.customGap(e,v),false);sim.lanes.get(other.id).length=0;assert.equal(sim.customGap(e,v),true);
});
test('A two-way street with unequal lane counts separates the two directions within its own pavement',()=>{
 const layout=freshLayout(),e=street(layout,'road-21',2,1),n=createNetwork(layout),a=n.edgeById.get(e.id),b=n.edges.find(r=>r.roadId===e.roadId&&r.from===e.to);assert.equal(a.opposingLanes,1);assert.equal(b.opposingLanes,2);
 const offsets=[laneOffset(a,0),laneOffset(a,1),-laneOffset(b,0)].sort((a,b)=>a-b);assert.ok(offsets[1]-offsets[0]>1);assert.ok(offsets[2]-offsets[1]>1);
 const svg=renderRoadScene(n,layout,e.roadId);assert.ok(!svg.includes('<image'));assert.ok(svg.includes('ownMapSurface'));
});
