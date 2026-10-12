import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG,MAP,createNetwork,shortestPath,pointOnEdge } from '../public/network.js';
import { createPair,createArrivals,Simulation,Signal,csv } from '../public/simulation.js';
const options={duration:300,demand:2000,seed:42,cycle:90,green:35,distribute:true};
test('Every boundary can reach every other boundary without exiting the network early',()=>{
  const n=createNetwork();for(const origin of n.boundaries)for(const dest of n.boundaries)if(origin.id!==dest.id){const path=shortestPath(n,origin.id,dest.id);assert.ok(path.length,`${origin.id} -> ${dest.id}`);assert.equal(n.edgeById.get(path.at(-1)).to,dest.id);}
  assert.ok(n.nodes.length>300);assert.equal(n.nodes.filter(n=>n.signal).length,9);
});
test('Seed reproduces demand, shared independently of controller decisions',()=>{
  const n=createNetwork();assert.deepEqual(createArrivals(n,options),createArrivals(n,options));const p=createPair(options);assert.strictEqual(p.fixed.arrivals,p.adaptive.arrivals);
  for(let i=0;i<600;i++){p.fixed.step();p.adaptive.step();}assert.equal(p.fixed.generated,p.adaptive.generated);assert.equal(p.fixed.time,p.adaptive.time);
});
test('High demand conserves vehicles, maintains lane spacing and finite positions',()=>{
  const p=createPair({...options,demand:5000,duration:450});
  for(let i=0;i<2250;i++)for(const sim of [p.fixed,p.adaptive]){
    sim.step();assert.equal(sim.generated,sim.completed+sim.vehicles.length+sim.pending.length);
    for(const id of sim.activeLanes){const lane=sim.lanes.get(id);const sorted=[...lane].sort((a,b)=>b.p-a.p),length=sim.network.edgeById.get(id).length;for(let j=0;j<sorted.length;j++){const v=sorted[j];assert.ok(Number.isFinite(v.p)&&Number.isFinite(v.v));assert.ok(v.p>=0&&v.p<=length+1e-7);if(j)assert.ok(sorted[j-1].p-v.p>=CONFIG.carLength+CONFIG.minGap-1e-7,`overlap ${id}`);}}
  }
  assert.ok(p.fixed.completed>0);assert.ok(p.adaptive.completed>0);
});
test('A red light holds a vehicle upstream, and cannot stop a vehicle after the crossing',()=>{
  const sim=new Simulation({...options,demand:0,distribute:false});const edge=sim.network.edges.find(e=>e.to==='pirro'&&e.axis==='H');const signal=sim.signals.get(edge.to);signal.offset=50;assert.notEqual(signal.phase(0).axis,'H');
  sim.lanes.get(edge.id).push({id:1,t:0,destination:edge.to,path:[edge.id],index:0,p:edge.length-8,v:8,wait:0});sim.generated=1;sim.activeLanes.add(edge.id);
  for(let i=0;i<30;i++)sim.step();assert.equal(sim.completed,0);assert.ok(sim.vehicles[0].p<=edge.length-CONFIG.stopDistance+1e-7);
  const downstream=sim.network.edges.find(e=>e.from==='pirro'&&!sim.network.byId.get(e.to).signal&&e.length>35);sim.lanes.get(downstream.id).push({id:2,t:0,destination:downstream.to,path:[downstream.id],index:0,p:20,v:5,wait:0});sim.generated++;sim.activeLanes.add(downstream.id);const car=sim.lanes.get(downstream.id)[0];sim.step();assert.ok(car.p>20);
});
test('Zero demand completes with zero finite metrics',()=>{
  const sim=new Simulation({...options,demand:0});for(let i=0;i<1500;i++)sim.step();assert.equal(sim.time,300);for(const [key,v] of Object.entries(sim.snapshot()))if(typeof v==='number')assert.ok(Number.isFinite(v),key);assert.equal(sim.completed,0);assert.equal(sim.lastQueue,0);
});
test('Signals have clearance phases and bounded adaptive greens',()=>{
  const n=createNetwork().byId.get('pirro'),s=new Signal(n,options,true);s.offset=0;assert.equal(s.phase(35).phase,'AMARILLO');assert.equal(s.phase(38).phase,'TODO_ROJO');assert.equal(s.phase(39).axis,'V');assert.equal(s.phase(89).phase,'TODO_ROJO');
  for(let t=1;t<900;t++)s.update(t,1,{H:30,V:5},0);assert.ok(s.green>=25&&s.green<=55);assert.ok(s.q.flat().every(Number.isFinite));
});
test('Identical fixed scenario reproduces its full results',()=>{const a=new Simulation(options),b=new Simulation(options);for(let i=0;i<1500;i++){a.step();b.step();}assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.records,b.records);});
test('CSV escapes commas, quotes, and includes a UTF-8 BOM',()=>{const out=csv([{label:'a,"b',value:2}]);assert.ok(out.startsWith('\ufeff'));assert.ok(out.includes('"a,""b"'));});

test('Nine controls match the supplied red marks, and every yellow guide has directed road segments',()=>{
 const n=createNetwork(),signals=n.nodes.filter(n=>n.signal);for(const s of signals){assert.equal(s.signalSource,'USER');assert.ok(Math.hypot(s.x-s.annotation[0],s.y-s.annotation[1])<7,s.id);}for(const g of MAP.guides){assert.ok(n.edges.some(e=>e.guide===g.id),g.id);for(const e of n.edges.filter(e=>e.guide===g.id))assert.equal(e.directionSource,'USER');}
});
test('Vehicle positions follow polyline bends and finish at the real street endpoint',()=>{const n=createNetwork(),edge=n.edges.find(e=>e.points.length>5);assert.ok(edge);const first=pointOnEdge(edge,0),last=pointOnEdge(edge,edge.length);assert.ok(Math.hypot(first.x-edge.points[0][0],first.y-edge.points[0][1])<.1);assert.ok(Math.hypot(last.x-edge.points.at(-1)[0],last.y-edge.points.at(-1)[1])<.1);assert.ok(Number.isFinite(pointOnEdge(edge,edge.length/2).angle));});
