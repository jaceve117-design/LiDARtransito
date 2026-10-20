import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG,createNetwork,pointOnEdge} from '../public/network.js';
import {Simulation} from '../public/simulation.js';
import {freshLayout,defaultApproach,layoutStopDistance,validateLayout} from '../public/road-layout.js';

test('Moving a junction preserves every connected endpoint and does not mutate the published network',()=>{
 const original=createNetwork(),before=original.byId.get('pirro'),layout=freshLayout();layout.nodes.pirro={x:before.x+3,y:before.y-2};
 const edited=createNetwork(layout);
 for(const e of edited.incoming.get('pirro'))assert.deepEqual(e.points.at(-1),[before.x+3,before.y-2]);
 for(const e of edited.outgoing.get('pirro'))assert.deepEqual(e.points[0],[before.x+3,before.y-2]);
 assert.equal(createNetwork().byId.get('pirro').x,before.x);assert.notEqual(edited.incoming.get('pirro')[0].length,original.incoming.get('pirro')[0].length);
});
test('An edited road is reversed for opposing traffic and recalculates its physical length',()=>{
 const net=createNetwork(),edge=net.edges.find(e=>net.edges.some(r=>r.roadId===e.roadId&&r.from===e.to));
 const mid=pointOnEdge(edge,edge.length/2),layout=freshLayout();layout.roads[edge.roadId]={from:edge.from,points:[edge.points[0],[mid.x+2,mid.y+3],edge.points.at(-1)]};
 const n=createNetwork(layout),a=n.edgeById.get(edge.id),b=n.edges.find(r=>r.roadId===edge.roadId&&r.from===edge.to);
 assert.deepEqual(a.points.toReversed(),b.points);assert.ok(Math.abs(a.length-b.length)<1e-8);assert.notEqual(a.length,edge.length);
});
test('The red signal stops the vehicle front at the edited stop line before its proposed crossing',()=>{
 const net=createNetwork(),edge=net.incoming.get('pirro').find(e=>e.axis==='H'),layout=freshLayout();layout.approaches[edge.id]={...defaultApproach(edge),crosswalkNear:8,crosswalkWidth:3,stopGap:1.2};
 const sim=new Simulation({duration:300,demand:0,seed:42,cycle:90,green:35,distribute:false,roadLayout:layout});
 sim.signals.get('pirro').phase=()=>({axis:'V',phase:'VERDE'});
 const e=sim.network.edgeById.get(edge.id),car={id:1,t:0,destination:e.to,path:[e.id],index:0,p:e.length-25,v:8,wait:0};
 sim.lanes.get(e.id).push(car);sim.activeLanes.add(e.id);sim.generated=1;for(let i=0;i<80;i++)sim.step();
 const front=car.p+CONFIG.carLength/2,line=e.length-12.2;assert.ok(Math.abs(front-line)<.02);assert.equal(sim.completed,0);
 assert.equal(layoutStopDistance(null,e),CONFIG.stopDistance);
});
test('Layout import rejects invalid distances, unknown roads and broken coordinates',()=>{
 const net=createNetwork(),e=net.incoming.get('pirro')[0],layout=freshLayout();layout.approaches[e.id]=defaultApproach(e);
 assert.deepEqual(validateLayout(layout,net),layout);
 const bad=structuredClone(layout);bad.approaches[e.id].crosswalkNear=NaN;assert.throws(()=>validateLayout(bad,net));
 const unknown=structuredClone(layout);unknown.nodes.fake={x:20,y:30};assert.throws(()=>validateLayout(unknown,net));
 const malformed=structuredClone(layout);malformed.roads[e.roadId]={from:e.from,points:[[1,2],[NaN,3]]};assert.throws(()=>validateLayout(malformed,net));
});
