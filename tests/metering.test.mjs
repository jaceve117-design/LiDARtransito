import test from 'node:test';
import assert from 'node:assert/strict';
import { ActuatedSignal,SpaceMeter } from '../public/metering.js';
import { createPair } from '../public/simulation.js';
import { CONFIG } from '../public/network.js';
const options={duration:900,demand:2500,seed:42,cycle:90,green:35,coordinated:true,metered:true,distribute:true};
function signal(){return new ActuatedSignal({id:'x'},options,{axis:'H'});}
function fake(d){return {meter:{demand:()=>structuredClone(d)}};}
test('Demand keeps a useful green without alternating into an empty axis',()=>{const s=signal(),sim=fake({H:{count:10,open:1},V:{count:0,open:0}});for(let t=0;t<300;t++)s.update(t,1,sim);assert.equal(s.phase(300).axis,'H');assert.equal(s.phase(300).phase,'VERDE');assert.equal(s.cycles,0);});
test('Quota exhaustion preserves minimum green, yellow and all-red before switching',()=>{const s=signal(),sim=fake({H:{count:10,open:1},V:{count:3,open:1}});for(let i=0;i<10;i++)s.served(0);s.update(5,1,sim);assert.equal(s.state,'VERDE');s.update(10,1,sim);assert.equal(s.state,'AMARILLO');s.update(12,1,sim);assert.equal(s.state,'AMARILLO');s.update(13,1,sim);assert.equal(s.state,'TODO_ROJO');s.update(13.5,.5,sim);assert.equal(s.state,'TODO_ROJO');s.update(14,.5,sim);assert.equal(s.state,'VERDE');assert.equal(s.axis,'V');assert.equal(s.remaining,10);});
test('Both blocked entrances stay red, but a receiving outlet with room is served',()=>{const s=signal(),sim=fake({H:{count:10,open:0},V:{count:3,open:0}});for(let t=0;t<=15;t++)s.update(t,1,sim);assert.equal(s.state,'RETENIDO');assert.equal(s.phase(15).axis,null);s.update(16,1,fake({H:{count:10,open:0},V:{count:3,open:1}}));assert.equal(s.state,'VERDE');assert.equal(s.axis,'V');});
test('A small competing queue is served within the wait target plus clearance when receiving space exists',()=>{const s=signal(),sim=fake({H:{count:30,open:1},V:{count:1,open:1}});let served=null;for(let t=0;t<70;t++){s.update(t,1,sim);if(s.axis==='V'&&s.state==='VERDE'){served=t;break;}}assert.ok(served!==null&&served<=64);});
test('Upstream notices prepare a green before the platoon arrives',()=>{const s=signal();s.notify(1,'V',20);const sim=fake({H:{count:0,open:0},V:{count:0,open:0}});for(let t=0;t<=19;t++)s.update(t,1,sim);assert.equal(s.axis,'V');assert.equal(s.state,'VERDE');});
test('Shared reservations cannot allocate the same space to two entrances and convert on arrival',()=>{
 const p=createPair(options),sim=p.adaptive,m=sim.meter,e=sim.network.edges.find(e=>e.length>80&&e.length<150),capacity=m.capacity(e.id);
 const a={id:100,type:'car',index:0,path:['upstream',e.id]},b={...a,id:101};
 sim.lanes.get(e.id).push(...Array.from({length:capacity-1},(_,i)=>({id:i,type:'car'})));
 assert.equal(m.reserve(a),true);assert.equal(m.status(e.id).available,0);assert.equal(m.reserve(b),false);assert.equal(m.reservedByEdge.get(e.id),1);
 sim.lanes.get(e.id).push(a);m.entered(a,e.id);assert.equal(m.status(e.id).reserved,0);assert.equal(m.status(e.id).occupied,capacity);assert.equal(m.reservations.has(a.id),false);
 sim.lanes.get(e.id).splice(0,3);assert.equal(m.canReserve(b),true);assert.equal(m.reserve(b),true);m.release(b);assert.equal(m.status(e.id).reserved,0);
});
test('A bus reserves more receiving storage than a car and tiny geometry connectors cannot trap it forever',()=>{const p=createPair(options),m=p.adaptive.meter,net=p.adaptive.network,bus={id:999,type:'bus',index:0,path:['upstream',net.edges.find(e=>e.length<7).id,net.edges.find(e=>e.length>150).id]};assert.equal(m.cost(bus),3);assert.equal(m.reserve(bus),true);assert.equal(m.reservedByEdge.get(bus.path[1]),undefined);assert.equal(m.reservedByEdge.get(bus.path[2]),3);m.release(bus);assert.equal(m.reservedByEdge.size,0);});
test('Metered traffic conserves vehicles, keeps spacing and exactly accounts for every reservation',()=>{
 const p=createPair({...options,duration:1200,blockingPercent:15});
 for(let i=0;i<6000;i++){p.fixed.step();p.adaptive.step();const sim=p.adaptive;assert.equal(sim.generated,sim.completed+sim.vehicles.length+sim.pending.length);
 if(i%20===0){const expected=new Map();for(const r of sim.meter.reservations.values())for(const id of r.edges)expected.set(id,(expected.get(id)??0)+r.cost);assert.deepEqual(sim.meter.reservedByEdge,expected);for(const id of sim.activeLanes){const lane=[...sim.lanes.get(id)].sort((a,b)=>b.p-a.p);for(let j=1;j<lane.length;j++)assert.ok(lane[j-1].p-lane[j].p>=CONFIG.carLength+CONFIG.minGap-1e-7);}}}
 assert.ok(p.adaptive.completed>0);assert.ok(p.adaptive.meter.admitted>0);assert.ok([...p.adaptive.signals.values()].some(s=>s.history.some(h=>h.fase==='TODO_ROJO')));
});

test('A full distant link cannot hold an intersection with immediate receiving space',()=>{
 const sim=createPair(options).adaptive,m=sim.meter,net=sim.network;
 const candidates=net.edges.filter(e=>e.length>80&&!sim.signals.has(e.to)&&!net.byId.get(e.to).boundary);
 const first=candidates.find(e=>net.outgoing.get(e.to).some(n=>n.length>80));
 const next=net.outgoing.get(first.to).find(e=>e.length>80);
 const v={id:99801,type:'car',index:0,path:['upstream',first.id,next.id]};
 sim.lanes.get(next.id).push(...Array.from({length:m.capacity(next.id)},(_,i)=>({id:99000+i,type:'car'})));
 assert.equal(m.status(next.id).available,0);assert.equal(m.canReserve(v),true);assert.equal(m.reserve(v),true);
 assert.equal(m.reservedByEdge.get(first.id),1);assert.equal(m.reservedByEdge.has(next.id),false);
 m.release(v);sim.lanes.get(first.id).push(...Array.from({length:m.capacity(first.id)},(_,i)=>({id:98000+i,type:'car'})));
 assert.equal(m.canReserve(v),false);
});

test('The first storage link is reserved while the next signal still receives the full-route arrival notice',()=>{
 const sim=createPair(options).adaptive,m=sim.meter,net=sim.network;
 // Select an actual upstream route containing more than one storage segment.
 const path=sim.path('pirro-sur','pirro');assert.ok(path.length>1);
 const v={id:99802,type:'car',index:0,path:['upstream',...path]};
 assert.equal(m.reserve(v),true);assert.equal(m.reservations.get(v.id).edges.size,1);
 const signal=sim.signals.get('pirro'),notice=signal.arrivals.get(v.id);assert.ok(notice);
 const expected=m.section(v).reduce((sum,id)=>sum+net.edgeById.get(id).length,0)/((sim.options.waveSpeed??30)/3.6);
 assert.ok(Math.abs(notice.eta-expected)<1e-8);assert.ok(expected>net.edgeById.get(path[0]).length/((sim.options.waveSpeed??30)/3.6));
});

test('Pirro continues serving demand after 30 minutes instead of locking every future receiver',()=>{
 const sim=createPair({...options,duration:3600,demandMode:'estimated',startHour:15,estimateYear:2026,pirroShare:75,blockingPercent:15,trainEnabled:true,trainPeriod:600,trainDuration:45,trainOffset:120}).adaptive;
 let atThirty=0,atFifty=0;
 for(let tick=1;tick<=18000;tick++){
   sim.step();
   if(tick===9000)atThirty=sim.completed;
   if(tick===15000)atFifty=sim.completed;
   if(tick%3000===0){assert.equal(sim.generated,sim.completed+sim.vehicles.length+sim.pending.length);}
 }
 assert.ok(atFifty>atThirty+50,`30 min: ${atThirty}; 50 min: ${atFifty}`);
 assert.ok(sim.completed>atFifty+20);
 for(const id of ['pirro','pirro-sur'])assert.ok(sim.signals.get(id).history.some(h=>h.fase==='VERDE'&&h.segundo>3000),id);
});
