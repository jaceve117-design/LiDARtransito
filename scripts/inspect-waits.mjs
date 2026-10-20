import {readFileSync} from 'node:fs';
import {Simulation} from '../public/simulation.js';
const path=process.argv[2];const data=JSON.parse(readFileSync(path));if(!data.finalState)throw Error('El diagnóstico no incluye estado final');
const sim=new Simulation({...data.options,duration:14400},true,[]);sim.time=data.reports.at(-1).time;
for(const r of data.finalState.lanes){sim.lanes.set(r.edge,r.vehicles);sim.activeLanes.add(r.edge);}
for(const s of data.finalState.signals){Object.assign(sim.signals.get(s.id),s,{now:sim.time});}
const head=id=>sim.lanes.get(id)?.reduce((a,b)=>!a||b.p>a.p?b:a,null);
function trace(id,depth=0,seen=new Set()){
 const v=head(id);if(!v)return {edge:id,empty:true};const e=sim.network.edgeById.get(id),next=v.path[v.index+1],s=sim.signals.get(e.to),r=sim.movementRule(e.id,next),status=sim.meter.status(id);
 const row={edge:id,to:e.to,car:v.id,type:v.type,destination:v.destination,via:v.via,rule:r?.label,position:+v.p.toFixed(2),speed:v.v,next,occupants:sim.lanes.get(id).length,costOccupancy:status.occupied,capacity:status.capacity,phase:s?.phase(sim.time),yieldBlocked:r?!sim.yieldGap(r):false,stop:sim.stopPosition(e)};
 if(depth>30||seen.has(id)){row.cycle=seen.has(id);return row;}seen.add(id);
 if(s&&v.p<=sim.stopPosition(e)+1e-6&&!r?.signalBypass){const receiver=sim.meter.receivingSection(v).find(id=>sim.network.edgeById.get(id).length>=21);if(receiver){row.requires=trace(receiver,depth+1,seen);return row;}}
 if(next){row.requires=trace(next,depth+1,seen);}return row;
}
for(const id of ['road-36-f','road-434-r']){const chain=[];let at=trace(id);while(at){const {requires,...row}=at;chain.push(row);at=requires;}console.log(JSON.stringify(chain,null,2));}
