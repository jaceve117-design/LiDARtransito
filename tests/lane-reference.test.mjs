import test from 'node:test';
import assert from 'node:assert/strict';
import {createNetwork,shortestPath} from '../public/network.js';
import {freshLayout,validateLayout,defaultApproach} from '../public/road-layout.js';
import {applyLaneReference} from '../public/lane-reference.js';
import {Simulation} from '../public/simulation.js';
function layout(){const net=createNetwork(),l=applyLaneReference(freshLayout(),net);l.vector=true;for(const node of net.nodes.filter(n=>n.signal||net.ruleByNode.has(n.id)))for(const e of net.incoming.get(node.id))if(e.length>25&&(node.signal||net.yieldByIncoming.has(e.id)))l.approaches[e.id]=defaultApproach(e);return l;}
test('User lane reference preserves directions, closure, and marked provisional section',()=>{
 const l=layout(),n=createNetwork(l);validateLayout(l,createNetwork());
 for(const id of ['road-34-f','road-36-f','road-54-f'])assert.equal(n.edgeById.get(id).laneCount,3);
 assert.equal(n.edgeById.get('road-28-r').laneCount,2);
 for(const e of n.edges.filter(e=>e.roadId==='road-4'))assert.equal(e.laneCount,0);
 assert.ok(!shortestPath(n,'mh-16','mh-3').includes('road-4-r'));
 assert.equal(n.edgeById.get('road-37-r').laneCount,2);
 assert.equal(n.edgeById.get('road-37-f').laneCount,2);
 assert.ok(!l.reviewRoads.includes('road-433'));
 assert.equal(l.connectorConfirmed,1);
 assert.ok(n.yieldByIncoming.get('road-54-f').some(r=>r.outgoing==='road-58-f'));
 assert.ok(!n.yieldByIncoming.get('road-54-f').some(r=>r.outgoing==='road-57-f'));
});
test('Turn lanes are chosen before entering an approach',()=>{
 const s=new Simulation({duration:60,demand:0,seed:42,cycle:90,green:35,roadLayout:layout()});
 assert.equal(s.entryLane('road-1-r',2,'road-0-f'),0);
 assert.ok([1,2].includes(s.entryLane('road-1-r',0,'road-2-f')));
 assert.equal(s.entryLane('road-26-r',0,'road-1-r'),2);
 assert.equal(s.entryLane('road-54-f',2,'road-57-f'),0);
});
test('Corrected network runs three hours without losing vehicles or halting completed trips',()=>{
 const s=new Simulation({duration:10800,demandMode:'estimated',startHour:15,estimateYear:2026,pirroShare:75,seed:42,cycle:90,green:35,coordinated:true,metered:true,waveSpeed:30,distribute:true,blockingPercent:15,trainEnabled:true,trainPeriod:600,trainDuration:45,trainOffset:120,roadLayout:layout()},true);let completed=0;
 for(let tick=1;tick<=54000;tick++){s.step();if(tick%4500===0){assert.equal(s.generated,s.completed+s.vehicles.length+s.pending.length);assert.ok(s.completed>completed+20,`Stopped at ${s.time/60} min`);completed=s.completed;for(const v of s.vehicles)assert.ok(Number.isFinite(v.p)&&Number.isFinite(v.v));}}
 console.log(JSON.stringify({minutes:s.time/60,completed:s.completed,pending:s.pending.length,active:s.vehicles.length}));
});

test('Confirmed connector supports San Pablo to south and center to north without resetting other streets',()=>{
 const l=layout(),n=createNetwork(l);
 const west=shortestPath(n,'pirro-sur','mh-31');
 assert.ok(west.includes('road-438-editor-reverse'));
 assert.ok(west.includes('road-433-editor-reverse'));
 assert.ok(west.includes('road-26-r'));
 const east=shortestPath(n,'mh-702','pirro');
 assert.ok(east.includes('road-433-f'));
 assert.ok(east.includes('road-31-r'));
 assert.ok(east.includes('road-30-f'));
 const legacy={...l,connectorConfirmed:undefined,reviewRoads:['road-433'],streets:{...l.streets,'road-34':{...l.streets['road-34'],width:3.5}}};
 applyLaneReference(legacy,createNetwork());assert.equal(legacy.streets['road-34'].width,3.5);assert.deepEqual(legacy.reviewRoads,[]);
});
