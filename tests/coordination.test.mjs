import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTraffic,HOURLY_SHARES,demandSegments,expectedVehicles,hourlyVolumes } from '../public/traffic-demand.js';
import { createNetwork,CONFIG } from '../public/network.js';
import { createPair,createArrivals,DISPERSION_NODE } from '../public/simulation.js';
import { coordinationPlans,CoordinatedSignal,Coordinator } from '../public/coordination.js';
const options={duration:900,demandMode:'estimated',startHour:15,estimateYear:2026,pirroShare:75,seed:42,cycle:90,green:35,coordinated:true,waveSpeed:30,distribute:true};
test('Fleet ratio reproduces observed reference years and projects 2026 without a second growth factor',()=>{
  assert.equal(estimateTraffic(2019).daily,27534);assert.ok(Math.abs(estimateTraffic(2024).daily-27534*1887571/1565811)<1e-7);assert.equal(Math.round(estimateTraffic().daily),35768);assert.ok(Math.abs(HOURLY_SHARES.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.equal(Math.round(expectedVehicles(0,86400)),35768);assert.equal(hourlyVolumes()[15].vehicles,1995);
});
test('Hourly demand integrates individual hours, partial periods and midnight',()=>{
  const daily=estimateTraffic().daily;assert.ok(Math.abs(expectedVehicles(6,7200)-daily*(HOURLY_SHARES[6]+HOURLY_SHARES[7]))<1e-7);
  const parts=demandSegments(23,5400);assert.equal(parts.length,2);assert.deepEqual(parts.map(p=>p.hour),[23,0]);assert.ok(Math.abs(expectedVehicles(23,5400)-daily*(HOURLY_SHARES[23]+HOURLY_SHARES[0]/2))<1e-7);
});
test('Exact requested count, same arrivals, valid routes, and northern dispersion keep all vehicles accounted',()=>{
  const pair=createPair(options),net=pair.fixed.network;assert.strictEqual(pair.fixed.arrivals,pair.adaptive.arrivals);assert.equal(pair.fixed.arrivals.length,499);assert.deepEqual(pair.fixed.arrivals,createArrivals(net,options));
  const north=pair.fixed.arrivals.filter(v=>v.northbound);assert.ok(north.length>300);assert.equal(new Set(north.map(v=>v.direction)).size,3);
  for(const a of pair.fixed.arrivals){let at=a.origin,prior=null;for(const id of a.initialPath){const edge=net.edgeById.get(id);assert.equal(edge.from,at);assert.notEqual(edge.to,prior?.from);if(a.type==='bus'&&prior&&net.busTurns.has(prior.id))assert.ok(net.busTurns.get(prior.id).has(id));at=edge.to;prior=edge;}assert.equal(at,a.destination);if(a.northbound)assert.ok(a.initialPath.some(id=>net.edgeById.get(id).to===DISPERSION_NODE));}
  for(let i=0;i<4500;i++)for(const sim of [pair.fixed,pair.adaptive]){sim.step();assert.equal(sim.generated,sim.completed+sim.vehicles.length+sim.pending.length);for(const id of sim.activeLanes){const lane=[...sim.lanes.get(id)].sort((a,b)=>b.p-a.p);for(let j=1;j<lane.length;j++)assert.ok(lane[j-1].p-lane[j].p>=CONFIG.carLength+CONFIG.minGap-1e-7);}}
  for(const sim of [pair.fixed,pair.adaptive]){assert.ok(sim.dispersed>0);assert.equal(sim.dispersed,Object.values(sim.dispersedDirections).reduce((s,x)=>s+x,0));assert.ok(sim.vehicles.some(v=>v.northbound&&!v.via),'Vehicles continue after northern gateway');assert.ok(sim.pending.length+sim.vehicles.length>0,'No artificial removal of unfinished requests');}
});
test('Coordination follows directed travel distance and offsets the matching green phase, with clearance',()=>{
  const net=createNetwork(),plans=coordinationPlans(net,30);assert.equal(plans.size,10);const a=new CoordinatedSignal(net.byId.get('pirro-sur'),options,plans.get('pirro-sur')),b=new CoordinatedSignal(net.byId.get('pirro'),options,plans.get('pirro'));
  assert.ok(Math.abs(b.offset-314.335/(30/3.6))<1e-7);assert.equal(a.phase(5).axis,'H');assert.equal(b.phase(5+b.offset).axis,'V');assert.equal(b.phase(b.offset+47).phase,'AMARILLO');assert.equal(b.phase(b.offset+50).phase,'TODO_ROJO');assert.equal(b.phase(b.offset+51).axis,'H');assert.equal(b.phase(b.offset+89).phase,'TODO_ROJO');
  assert.equal(coordinationPlans(net,30,'miraflores').get('pirro-sur').axis,'V');
});
test('A shared adaptive plan commits only at local cycle boundaries and preserves both minimum greens',()=>{
  const net=createNetwork(),plans=coordinationPlans(net,30),signals=new Map([...plans].map(([id,p])=>[id,new CoordinatedSignal(net.byId.get(id),options,p)])),coordinator=new Coordinator(signals,90);
  const sim={network:net,queuesAt:()=>({H:0,V:30}),lanes:new Map(net.edges.map(e=>[e.id,[]]))};coordinator.update(90,sim);
  const b=signals.get('pirro'),previous=b.primaryGreen;assert.equal(b.primaryGreen,previous);assert.equal(new Set(['pirro-sur','pirro','mh-726'].map(id=>signals.get(id).pendingGreen)).size,1);
  b.update(100,.2);assert.equal(b.primaryGreen,previous);b.update(b.offset+90,.2);assert.equal(b.primaryGreen,b.pendingGreen);
  for(let t=180;t<1800;t+=90)coordinator.update(t,sim);for(const s of signals.values()){assert.ok(s.pendingGreen>=25);assert.ok(s.cycle-s.pendingGreen-8>=25);}
});
