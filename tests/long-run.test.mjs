import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,createArrivals} from '../public/simulation.js';
import {createNetwork,CONFIG} from '../public/network.js';
import {freshLayout,defaultApproach} from '../public/road-layout.js';
const base={duration:10800,demandMode:'estimated',startHour:15,estimateYear:2026,pirroShare:75,seed:42,cycle:90,green:35,coordinated:true,metered:true,waveSpeed:30,distribute:true,blockingPercent:15,trainEnabled:true,trainPeriod:600,trainDuration:45,trainOffset:120};
function previewLayout(){const n=createNetwork(),layout=freshLayout();for(const v of n.nodes.filter(node=>node.signal||n.ruleByNode.has(node.id)))for(const e of n.incoming.get(v.id))if(e.length>25&&(v.signal||n.yieldByIncoming.has(e.id)))layout.approaches[e.id]=defaultApproach(e);return layout;}
for(const [label,seed,preview,adaptive,vector]of [['preview 42',42,true,true],['preview 7',7,true,true],['base 42',42,false,true],['fixed preview 42',42,true,false],['vector lanes 42',42,true,true,true]]){
 test(`Three hours: ${label} preserves traffic and completes trips in every 15-minute window`,()=>{
  const layout=preview?previewLayout():null;if(vector){layout.vector=true;const e=createNetwork().edgeById.get('road-34-r')??createNetwork().edges.find(e=>e.roadId==='road-34');layout.streets[e.roadId]={from:e.from,forward:2,reverse:0,width:3.25};}
  const options={...base,seed,...(layout?{roadLayout:layout}:{})},sim=new Simulation(options,adaptive);let completed=0,maxHold=0;
  for(let tick=1;tick<=54000;tick++){
   sim.step();
   if(tick%300===0){
    assert.equal(sim.generated,sim.completed+sim.vehicles.length+sim.pending.length);
    for(const id of sim.activeLanes){const edge=sim.network.edgeById.get(id),lane=[...sim.lanes.get(id)].sort((a,b)=>b.p-a.p);for(let j=0;j<lane.length;j++){assert.ok(Number.isFinite(lane[j].p)&&Number.isFinite(lane[j].v));assert.ok(lane[j].p>=0&&lane[j].p<=edge.length+1e-7);const front=lane.slice(0,j).findLast(v=>(v.lane??0)===(lane[j].lane??0));if(front)assert.ok(front.p-lane[j].p>=CONFIG.carLength+CONFIG.minGap-1e-7);}
     if(sim.meter&&edge.length>=21){const status=sim.meter.status(id);assert.ok(status.occupied+status.reserved<=status.capacity,`Overbooked ${id}: ${JSON.stringify(status)}`);}
    }
    for(const s of sim.signals.values())if(s.state==='RETENIDO')maxHold=Math.max(maxHold,sim.time-s.since);
   }
   if(tick%4500===0){assert.ok(sim.completed>completed+20,`${label} stopped completing trips between ${(sim.time-900)/60} and ${sim.time/60} minutes`);completed=sim.completed;}
  }
  assert.equal(sim.time,10800);assert.equal(sim.generated,sim.arrivals.length);assert.ok(sim.completed>1500);
  if(sim.meter)for(const id of ['pirro','pirro-sur','mh-726'])assert.ok(sim.signals.get(id).history.some(h=>h.fase==='VERDE'&&h.segundo>9900),`No service in final 15 minutes: ${id}`);
  console.log(JSON.stringify({case:label,generated:sim.generated,completed:sim.completed,inNetwork:sim.vehicles.length,pending:sim.pending.length,maxObservedHoldSeconds:Math.round(maxHold)}));
 });
}
