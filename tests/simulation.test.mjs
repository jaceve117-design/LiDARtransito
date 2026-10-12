import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG,createNetwork,shortestPath } from '../public/network.js';
import { createPair,createArrivals,Simulation,Signal,csv } from '../public/simulation.js';
const options={duration:300,demand:2000,seed:42,cycle:90,green:35,distribute:true};
test('Every boundary can reach every other boundary without exiting the network early',()=>{
  const n=createNetwork();for(const origin of n.boundaries)for(const dest of n.boundaries)if(origin.id!==dest.id){const path=shortestPath(n,origin.id,dest.id);assert.ok(path.length,`${origin.id} -> ${dest.id}`);assert.equal(n.edgeById.get(path.at(-1)).to,dest.id);}
  assert.equal(n.nodes.filter(n=>!n.boundary).length,30);assert.equal(n.nodes.filter(n=>n.signal).length,14);
});
test('Seed reproduces demand, shared independently of controller decisions',()=>{
  const n=createNetwork();assert.deepEqual(createArrivals(n,options),createArrivals(n,options));const p=createPair(options);assert.strictEqual(p.fixed.arrivals,p.adaptive.arrivals);
  for(let i=0;i<600;i++){p.fixed.step();p.adaptive.step();}assert.equal(p.fixed.generated,p.adaptive.generated);assert.equal(p.fixed.time,p.adaptive.time);
});
test('High demand conserves vehicles, maintains lane spacing and finite positions',()=>{
  const p=createPair({...options,demand:5000,duration:450});
  for(let i=0;i<2250;i++)for(const sim of [p.fixed,p.adaptive]){
    sim.step();assert.equal(sim.generated,sim.completed+sim.vehicles.length+sim.pending.length);
    for(const [id,lane] of sim.lanes){const sorted=[...lane].sort((a,b)=>b.p-a.p),length=sim.network.edgeById.get(id).length;for(let j=0;j<sorted.length;j++){const v=sorted[j];assert.ok(Number.isFinite(v.p)&&Number.isFinite(v.v));assert.ok(v.p>=0&&v.p<=length+1e-7);if(j)assert.ok(sorted[j-1].p-v.p>=CONFIG.carLength+CONFIG.minGap-1e-7,`overlap ${id}`);}}
  }
  assert.ok(p.fixed.completed>0);assert.ok(p.adaptive.completed>0);
});
test('A red light holds a vehicle upstream, and cannot stop a vehicle after the crossing',()=>{
  const sim=new Simulation({...options,demand:0,distribute:false});const edge=sim.network.edges.find(e=>e.to==='n2-5'&&e.axis==='H');const signal=sim.signals.get(edge.to);signal.offset=50;assert.notEqual(signal.phase(0).axis,'H');
  sim.lanes.get(edge.id).push({id:1,t:0,destination:edge.to,path:[edge.id],index:0,p:edge.length-8,v:8,wait:0});sim.generated=1;
  for(let i=0;i<30;i++)sim.step();assert.equal(sim.completed,0);assert.ok(sim.vehicles[0].p<=edge.length-.6+1e-7);
  const downstream=sim.network.edges.find(e=>e.from==='n2-5'&&sim.network.byId.get(e.to).boundary);sim.lanes.get(downstream.id).push({id:2,t:0,destination:downstream.to,path:[downstream.id],index:0,p:20,v:5,wait:0});sim.generated++;const car=sim.lanes.get(downstream.id)[0];sim.step();assert.ok(car.p>20);
});
test('Zero demand completes with zero finite metrics',()=>{
  const sim=new Simulation({...options,demand:0});for(let i=0;i<1500;i++)sim.step();assert.equal(sim.time,300);for(const [key,v] of Object.entries(sim.snapshot()))if(typeof v==='number')assert.ok(Number.isFinite(v),key);assert.equal(sim.completed,0);assert.equal(sim.lastQueue,0);
});
test('Signals have clearance phases and bounded adaptive greens',()=>{
  const n=createNetwork().byId.get('n2-5'),s=new Signal(n,options,true);s.offset=0;assert.equal(s.phase(35).phase,'AMARILLO');assert.equal(s.phase(38).phase,'TODO_ROJO');assert.equal(s.phase(39).axis,'V');assert.equal(s.phase(89).phase,'TODO_ROJO');
  for(let t=1;t<900;t++)s.update(t,1,{H:30,V:5},0);assert.ok(s.green>=25&&s.green<=55);assert.ok(s.q.flat().every(Number.isFinite));
});
test('Identical fixed scenario reproduces its full results',()=>{const a=new Simulation(options),b=new Simulation(options);for(let i=0;i<1500;i++){a.step();b.step();}assert.deepEqual(a.snapshot(),b.snapshot());assert.deepEqual(a.records,b.records);});
test('CSV escapes commas, quotes, and includes a UTF-8 BOM',()=>{const out=csv([{label:'a,"b',value:2}]);assert.ok(out.startsWith('\ufeff'));assert.ok(out.includes('"a,""b"'));});
