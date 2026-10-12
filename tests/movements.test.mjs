import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,createNetwork,shortestPath} from '../public/network.js';
import {Simulation} from '../public/simulation.js';
const options={duration:300,demand:0,seed:42,cycle:90,green:35,distribute:false};
function put(sim,id,path,p,v=0,type='car'){
  const edge=sim.network.edgeById.get(path[0]),car={id,t:0,destination:sim.network.edgeById.get(path.at(-1)).to,path,index:0,p,v,wait:0,type,blocksBox:false};
  sim.lanes.get(edge.id).push(car);sim.activeLanes.add(edge.id);sim.generated++;return car;
}
test('All seven observations resolve to connected roads and the tenth signal',()=>{
  const n=createNetwork();assert.equal(n.ruleByNode.size,7);assert.equal(n.nodes.filter(v=>v.signal).length,10);
  assert.ok(n.byId.get('mh-726').signal);
  for(const j of n.ruleByNode.values())for(const r of j.yields??[]){assert.equal(n.edgeById.get(r.incoming).to,j.node);if(r.outgoing)assert.equal(n.edgeById.get(r.outgoing).from,j.node);for(const id of r.priority)assert.equal(n.edgeById.get(id).to,j.node);}
});
test('Each yield waits for its priority stream, then proceeds when the gap is available',()=>{
  for(const j of createNetwork().ruleByNode.values())for(const rule of j.yields??[]){
    const sim=new Simulation(options),e=sim.network.edgeById.get(rule.incoming),out=rule.outgoing??sim.network.outgoing.get(j.node).find(o=>o.to!==e.from).id;
    const priority=sim.network.edgeById.get(rule.priority[0]);for(const signal of sim.signals.values())signal.phase=()=>({axis:priority.axis,phase:'VERDE'});
    const waiting=put(sim,1,[e.id,out],e.length-CONFIG.stopDistance),p=put(sim,2,[priority.id],priority.length-12,8);
    sim.step();assert.equal(waiting.p,e.length-CONFIG.stopDistance,j.id);assert.ok(sim.yieldWaiters.has(1),j.id);
    sim.lanes.get(priority.id).splice(sim.lanes.get(priority.id).indexOf(p),1);sim.activeLanes.delete(priority.id);sim.generated--;
    const signal=sim.signals.get(j.node);if(signal)signal.phase=()=>({axis:e.axis,phase:'VERDE'});
    sim.step();assert.ok(waiting.p>e.length-CONFIG.stopDistance,j.id);
  }
});
test('East-to-north right turn at Pirro can pass on red only when its yield has a gap',()=>{
  const sim=new Simulation(options),e=sim.network.edgeById.get('road-37-r');sim.signals.get('pirro').phase=()=>({axis:null,phase:'TODO_ROJO'});
  const car=put(sim,1,[e.id,'road-36-f'],e.length-CONFIG.stopDistance);sim.step();assert.ok(car.p>e.length-CONFIG.stopDistance);
  assert.equal(sim.queuesAt('pirro').H,0);
});
test('Bus routing enforces the right turn toward San Jose, including when rerouting at the junction',()=>{
  const n=createNetwork(),incoming=n.edgeById.get('road-435-r');
  const car=shortestPath(n,incoming.to,'mh-706',()=>0,{incomingEdgeId:incoming.id});assert.equal(car[0],'road-433-f');
  const bus=shortestPath(n,incoming.to,'mh-706',()=>0,{vehicleType:'bus',incomingEdgeId:incoming.id});assert.ok(bus.length);assert.equal(bus[0],'road-26-r');
});
test('Train closes the marked approach before the tracks and clears vehicles already past the barrier',()=>{
  const sim=new Simulation({...options,trainEnabled:true,trainPeriod:600,trainDuration:45,trainOffset:0}),e=sim.network.edgeById.get('road-26-r');
  const car=put(sim,1,[e.id,'road-1-r'],e.length-18);sim.step();assert.equal(car.p,e.length-18);assert.ok(sim.trainWaiters.has(1));
  sim.time=45;sim.step();assert.ok(car.p>e.length-18);assert.equal(sim.trainClosed(),false);
  const clearing=new Simulation({...options,trainEnabled:true,trainOffset:0}),inside=put(clearing,2,[e.id,'road-1-r'],e.length-12,3);clearing.step();assert.ok(inside.p>e.length-12);
  assert.equal(new Simulation(options).trainClosed(120),false);
});
