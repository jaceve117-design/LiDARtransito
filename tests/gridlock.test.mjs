import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,movementsConflict,createArrivals,DISPERSION_NODE,RETURN_CORRIDOR_NODES} from '../public/simulation.js';
import {createNetwork} from '../public/network.js';
const options={duration:300,demand:0,seed:42,cycle:90,green:35,distribute:false};
test('An opposing straight queue near La Casona cannot block the empty southbound lane',()=>{
 const sim=new Simulation(options),net=sim.network,incoming=net.edgeById.get('road-21-f'),north=net.edgeById.get('road-23-f'),south=net.edgeById.get('road-23-r'),exit=net.edgeById.get('road-21-r');
 sim.signals.set('mh-31',{phase:()=>({axis:null,phase:'ROJO'}),update:()=>{}});
 const blocked={id:1,t:0,path:[incoming.id,north.id],index:0,p:incoming.length-.6,v:0,wait:0,blocksBox:true};
 const queue={id:2,t:0,path:[north.id],index:0,p:0,v:0,wait:0};
 const free={id:3,t:0,path:[south.id,exit.id],index:0,p:0,v:0,wait:0};
 for(const [e,v]of [[incoming,blocked],[north,queue],[south,free]]){sim.lanes.get(e.id).push(v);sim.activeLanes.add(e.id);sim.generated++;}
 for(let i=0;i<80;i++)sim.step();
 assert.equal(sim.boxConflicts(south.id,exit.id),false);assert.ok(free.index===1||sim.completed>0);assert.equal(blocked.index,0);
});
test('Opposed straight movements do not conflict, but perpendicular and shared-receiver movements do',()=>{
 const edge=(id,from,to,points)=>({id,from,to,points});
 const edges=[edge('west','w','x',[[-10,0],[0,0]]),edge('east-out','x','e',[[0,0],[10,0]]),edge('east','e','x',[[10,0],[0,0]]),edge('west-out','x','w',[[0,0],[-10,0]]),edge('north','n','x',[[0,-10],[0,0]]),edge('south-out','x','s',[[0,0],[0,10]])];
 const network={edgeById:new Map(edges.map(e=>[e.id,e]))};
 assert.equal(movementsConflict(network,'west','east-out','east','west-out'),false);
 assert.equal(movementsConflict(network,'west','east-out','north','south-out'),true);
 assert.equal(movementsConflict(network,'west','east-out','north','east-out'),true);
});
test('Northern dispersion routes do not send eastern requests back through Pirro or La Casona',()=>{
 const net=createNetwork(),arrivals=createArrivals(net,{...options,demandMode:'estimated',duration:10800,startHour:15,estimateYear:2026,pirroShare:75});
 let east=0;for(const v of arrivals.filter(v=>v.northbound)){
   const index=v.initialPath.findIndex(id=>net.edgeById.get(id).to===DISPERSION_NODE);assert.ok(index>=0);
   const exit=v.initialPath.slice(index+1).map(id=>net.edgeById.get(id));assert.ok(exit.every(e=>!RETURN_CORRIDOR_NODES.has(e.to)));
   assert.equal(exit.at(-1).to,v.destination);
   if(v.direction==='E'){east++;assert.equal(v.northeastProxy,true);assert.ok(net.byId.get(v.destination).x>net.byId.get(DISPERSION_NODE).x);}
 }
 assert.ok(east>500);
});
