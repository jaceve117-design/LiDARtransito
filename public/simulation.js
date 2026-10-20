import { layoutStopDistance } from './road-layout.js';
import { CONFIG, createNetwork, shortestPath } from './network.js';
import { ActuatedSignal,SpaceMeter } from './metering.js';
import { demandSegments } from './traffic-demand.js';
import { coordinationPlans,CoordinatedSignal,Coordinator } from './coordination.js';
export function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
export function createArrivals(network,options) {
  const {duration,demand,seed,pirroShare=0}=options;
  if(options.demandMode==='estimated')return createEstimatedArrivals(network,options);
  const random=rng(seed),arrivals=[];let t=0,id=1;
  const allOrigins=network.boundaries.filter(b=>b.canEnter),focusOrigins=pirroShare>0?allOrigins.filter(b=>(b.side==='S'&&b.x>950&&b.x<1350||b.side==='E'&&b.y>450&&b.y<850)&&shortestPath(network,b.id,'pirro').length):[],origins=allOrigins,destinations=network.boundaries.filter(b=>b.canExit),weights=origins.reduce((sum,n)=>sum+(n.weight||1),0),destinationCache=new Map();
  if(demand===0)return arrivals;
  const viaDestinations=pirroShare>0?destinations.filter(b=>shortestPath(network,'pirro',b.id).length):[];
  // Exponential interarrival times (Poisson demand); shared verbatim by both scenarios.
  while(true) {
    t+=-Math.log(Math.max(1e-12,1-random()))/(demand/3600);
    if(t>duration)break;
    let choice=random()*weights,origin=origins[0];for(const n of origins){choice-=n.weight||1;if(choice<=0){origin=n;break;}}
    if(!destinationCache.has(origin.id))destinationCache.set(origin.id,destinations.filter(b=>origin.destinations.includes(b.id)));
    const possible=destinationCache.get(origin.id);if(!possible.length)throw Error(`El acceso ${origin.id} no tiene salida conectada`);
    let via=null;
    if(pirroShare>0&&random()<pirroShare/100&&focusOrigins.length){origin=focusOrigins[Math.floor(random()*focusOrigins.length)];via='pirro';}
    const reachable=via?viaDestinations.filter(b=>b.id!==origin.id):possible;
    let destination=reachable[Math.floor(random()*reachable.length)];const type=random()<.12?'bus':'car';let service=null;
    if(type==='bus'&&origin.side==='O'){const south=destinations.filter(b=>b.side==='S'&&b.x>950&&b.x<1350&&shortestPath(network,'mh-702',b.id,()=>0,{vehicleType:'bus'}).length);if(south.length&&shortestPath(network,origin.id,'mh-702',()=>0,{vehicleType:'bus'}).length){via='mh-702';destination=south[Math.floor(random()*south.length)];service='san-jose';}}
    arrivals.push({id:id++,t,origin:origin.id,destination:destination.id,via,type,service});
  }
  return arrivals;
}
// Requests are an estimated two-way Pirro-zone demand, not measured directional flows.
export const DISPERSION_NODE='mh-50'; // Northern gateway beside Calle 7 / Avenida 5.
export const RETURN_CORRIDOR_NODES=new Set(['pirro','pirro-sur','mh-31','mh-726']);
export function createEstimatedArrivals(network,options){
  const random=rng(options.seed),arrivals=[],cache=new Map(),northOrigins=network.boundaries.filter(n=>n.canEnter&&(n.side==='S'&&n.x>950&&n.x<1350||n.side==='E'&&n.y>450&&n.y<850)),outOrigins=network.boundaries.filter(n=>n.canEnter&&(n.side==='N'||n.side==='O'));
  const exits=network.boundaries.filter(n=>n.canExit),southExits=exits.filter(n=>n.side==='S'&&n.x>950&&n.x<1350);
  const directions=[['O',options.dispersalWest??45],['N',options.dispersalNorth??35],['E',100-(options.dispersalWest??45)-(options.dispersalNorth??35)]];
  function route(origin,dest,waypoints,type){const key=[origin,dest,...waypoints,type].join(':');if(cache.has(key))return cache.get(key);let path=[],at=origin,last=null;
    for(const target of [...waypoints,dest]){const dispersing=at===DISPERSION_NODE;const leg=shortestPath(network,at,target,e=>(last&&e.from===at&&e.to===last.from||dispersing&&RETURN_CORRIDOR_NODES.has(e.to))?Infinity:0,{vehicleType:type,incomingEdgeId:last?.id});if(!leg.length){cache.set(key,[]);return [];}path.push(...leg);last=network.edgeById.get(leg.at(-1));at=target;}cache.set(key,path);return path;}
  // Build valid route pools once, including bus maneuver constraints.
  const pools={};for(const type of ['car','bus']){pools[type]={north:[],out:[]};for(const [side,weight]of directions){if(weight<=0)continue;const routes=[];let candidates=exits.filter(n=>n.side===side),northeastProxy=false;
      if(side==='E'){
        // The municipal graph's eastern stubs are south of Pirro. They require a
        // loop back through La Casona, so use a real northeastern exit instead.
        candidates=candidates.filter(n=>shortestPath(network,DISPERSION_NODE,n.id,e=>RETURN_CORRIDOR_NODES.has(e.to)?Infinity:0,{vehicleType:type}).length);
        if(!candidates.length){const gateway=network.byId.get(DISPERSION_NODE);candidates=exits.filter(n=>n.x>gateway.x&&n.y<gateway.y&&n.side==='N');northeastProxy=true;}
      }
      for(const origin of northOrigins)for(const dest of candidates){if(origin.id===dest.id)continue;const path=route(origin.id,dest.id,['pirro',DISPERSION_NODE],type);if(path.length)routes.push({origin:origin.id,destination:dest.id,initialPath:path,via:DISPERSION_NODE,direction:side,northeastProxy});}if(!routes.length)throw Error('Sin salida conectada al '+side);pools[type].north.push({weight,routes});}
    for(const origin of outOrigins)for(const dest of southExits){const path=route(origin.id,dest.id,['mh-726'],type);if(path.length)pools[type].out.push({origin:origin.id,destination:dest.id,initialPath:path,via:'mh-726',direction:'S'});}if(!pools[type].out.length)throw Error('Sin ruta de salida hacia Miraflores');}
  let cumulative=0,id=1;
  for(const segment of demandSegments(options.startHour??15,options.duration,options.estimateYear??2026)){
    const before=Math.round(cumulative);cumulative+=segment.expected;const count=Math.round(cumulative)-before;
    for(let i=0;i<count;i++){const t=segment.start+(i+random())/count*(segment.end-segment.start),type=random()<.12?'bus':'car',north=random()<(options.pirroShare??60)/100;let selected;
      if(north){let pick=random()*100,group=pools[type].north.at(-1);for(const g of pools[type].north){pick-=g.weight;if(pick<=0){group=g;break;}}selected=group.routes[Math.floor(random()*group.routes.length)];}
      else selected=pools[type].out[Math.floor(random()*pools[type].out.length)];
      arrivals.push({id:id++,t,...selected,type,service:type==='bus'&&!north?'san-jose':null,profile:true,northbound:north});
    }
  }
  return arrivals;
}
export class Signal {
  constructor(node,options,adaptive) {
    this.id=node.id;this.cycle=options.cycle;this.green=options.green;this.adaptive=adaptive;
    this.offset=(node.row*7+node.col*11)%options.cycle;
    this.q=Array.from({length:4},()=>[0,0,0]);this.random=rng(options.seed+node.row*113+node.col*997);
    this.previous=null;this.reward=0;this.action=0;this.cycles=0;
  }
  phase(time) {
    const p=(time+this.offset)%this.cycle,g=this.green,v=this.cycle-g-8;
    if(p<g)return {axis:'H',phase:'VERDE',remaining:g-p};
    if(p<g+3)return {axis:'H',phase:'AMARILLO',remaining:g+3-p};
    if(p<g+4)return {axis:null,phase:'TODO_ROJO',remaining:g+4-p};
    if(p<g+4+v)return {axis:'V',phase:'VERDE',remaining:g+4+v-p};
    if(p<this.cycle-1)return {axis:'V',phase:'AMARILLO',remaining:this.cycle-1-p};
    return {axis:null,phase:'TODO_ROJO',remaining:this.cycle-p};
  }
  update(time,dt,queues,blocked) {
    this.reward-=(queues.H+queues.V+blocked*2)*dt;
    if(Math.floor((time+this.offset)/this.cycle)===Math.floor((time-dt+this.offset)/this.cycle))return;
    this.cycles++;
    if(!this.adaptive)return;
    const total=queues.H+queues.V,state=total>18?3:queues.H>queues.V+3?0:queues.V>queues.H+3?1:2;
    if(this.previous){const [s,a]=this.previous;this.q[s][a]+=.2*(this.reward/this.cycle+.85*Math.max(...this.q[state])-this.q[s][a]);}
    let a=1;
    if(this.random()<.1)a=Math.floor(this.random()*3);
    else {const max=Math.max(...this.q[state]);if(this.q[state][1]!==max)a=this.q[state].indexOf(max);}
    this.action=[-5,0,5][a];this.green=Math.max(25,Math.min(Math.min(55,this.cycle-33),this.green+this.action));
    this.previous=[state,a];this.reward=0;
  }
}
export class Simulation {
  constructor(options,adaptive=false,arrivals=null) {
    this.options=options;this.adaptive=adaptive;this.network=createNetwork(options.roadLayout);
    this.realJunctions=new Set(this.network.nodes.filter(n=>n.signal||this.network.ruleByNode.has(n.id)||new Set([...this.network.incoming.get(n.id).map(e=>e.from),...this.network.outgoing.get(n.id).map(e=>e.to)]).size>=3).map(n=>n.id));this.crossingBlockMovements=new Map();
    this.arrivals=arrivals??createArrivals(this.network,options);this.cursor=0;this.time=0;
    this.plans=adaptive&&options.coordinated?coordinationPlans(this.network,options.waveSpeed??30,options.waveSource):null;
    this.signals=new Map(this.network.nodes.filter(n=>n.signal).map(n=>[n.id,this.plans?(options.metered?new ActuatedSignal(n,options,this.plans.get(n.id)):new CoordinatedSignal(n,options,this.plans.get(n.id))):new Signal(n,options,adaptive)]));
    this.coordinator=this.plans&&!options.metered?new Coordinator(this.signals,options.cycle):null;this.meter=this.plans&&options.metered?new SpaceMeter(this,options):null;this.dispersed=0;this.dispersedDirections={O:0,N:0,E:0};
    this.lanes=new Map(this.network.edges.map(e=>[e.id,[]]));this.activeLanes=new Set();this.pending=[];this.completed=0;this.totalTravel=0;this.totalWait=0;this.completedWait=0;this.queueIntegral=0;this.lastQueue=0;this.records=[];this.generated=0;this.crossingBlocks=new Map();this.blockedSeconds=0;this.yieldWaitSeconds=0;this.trainWaitSeconds=0;this.yieldWaiters=new Set();this.trainWaiters=new Set();this.junctionOccupancy=new Map();
  }
  path(origin,destination,via=null,vehicleType='car') {
    const cost=e=>this.options.distribute?this.lanes.get(e.id).length*1.8:0;
    if(!via||origin===via)return shortestPath(this.network,origin,destination,cost,{vehicleType});
    const entry=shortestPath(this.network,origin,via,cost,{vehicleType}),last=this.network.edgeById.get(entry.at(-1));
    const exit=shortestPath(this.network,via,destination,e=>e.from===via&&e.to===last?.from?Infinity:cost(e),{vehicleType,incomingEdgeId:last?.id});
    return entry.length&&exit.length?[...entry,...exit]:[];
  }
  step(dt=CONFIG.dt) {
    dt=Math.min(dt,this.options.duration-this.time);if(dt<=1e-9)return;
    const oldTime=this.time;this.time=Math.min(this.options.duration,Math.round((this.time+dt)*1e9)/1e9);
    while(this.cursor<this.arrivals.length && this.arrivals[this.cursor].t<=this.time){this.pending.push({...this.arrivals[this.cursor++]});this.generated++;}
    const remaining=[];
    for(const a of this.pending) {
      const path=a.initialPath??this.path(a.origin,a.destination,a.via,a.type);a.initialPath=path;const lane=this.lanes.get(path[0]);
      if(!path.length || this.meter&&!this.meter.canEnter(a,path[0]) || this.entryLane(path[0],null,path[1])<0){remaining.push(a);continue;}
      lane.push({...a,lane:this.entryLane(path[0],null,path[1]),path,index:0,p:0,v:0,wait:this.time-a.t,previousP:0,blocksBox:((Math.imul(a.id,2654435761)+this.options.seed)>>>0)%100<(this.options.blockingPercent??0),color:a.type==='bus'?'#1b668b':['#21775b','#d49743','#647488','#4b689c'][a.id%4]});this.activeLanes.add(path[0]);
    }
    this.pending=remaining;
    let queue=this.pending.length,stopped=0,blocked=0;
    const transfers=[];this.meter?.held.clear();
    this.crossingBlocks.clear();this.crossingBlockMovements.clear();this.yieldWaiters.clear();this.trainWaiters.clear();
    for(const [node,list] of this.junctionOccupancy){const active=list.filter(c=>c.until>this.time);if(active.length)this.junctionOccupancy.set(node,active);else this.junctionOccupancy.delete(node);}
    for(const id of this.activeLanes){const edge=this.network.edgeById.get(id);if(!this.inFocus(edge.to)||!this.realJunctions.has(edge.to))continue;for(const v of this.lanes.get(id)){const next=v.path[v.index+1];if(v.p>this.stopPosition(edge)+.1&&v.v<.5&&next&&this.entryLane(next,v.lane??0,v.path[v.index+2])<0){this.crossingBlocks.set(edge.to,id);if(!this.crossingBlockMovements.has(edge.to))this.crossingBlockMovements.set(edge.to,[]);this.crossingBlockMovements.get(edge.to).push({incoming:id,outgoing:next});}}}
    if(this.crossingBlocks.size)this.blockedSeconds+=dt;
    // Vehicles move front to back; downstream admission is resolved after all lanes move.
    for(const edgeId of [...this.activeLanes]) {
      const e=this.network.edgeById.get(edgeId);
      const lane=this.lanes.get(e.id);lane.sort((a,b)=>b.p-a.p);const fronts=new Map();
      for(const v of lane) {
        v.previousP=v.p;const front=fronts.get(v.lane??0);
        let available=Math.min(e.length-v.p,front?front.p-CONFIG.carLength-CONFIG.minGap-v.p:Infinity);
        const signal=this.signals.get(e.to),phase=signal?.phase(this.time);
        const stopPosition=this.stopPosition(e);
        const nextId=v.path[v.index+1],rule=this.movementRule(e.id,nextId),control=this.options.roadLayout?.approaches?.[e.id]?.control??'inherit';
        if(control==='stop'){v.stopDwell=(stopPosition-v.p<=.2&&v.v<.5)?(v.stopDwell??0)+dt:0;}
        if((control==='stop'&&(v.stopDwell??0)<1||['stop','yield'].includes(control)&&!this.customGap(e,v))&&v.p<=stopPosition+1e-7)available=Math.min(available,stopPosition-v.p);
        if(control==='inherit'&&signal&&!rule?.signalBypass&&v.p<=stopPosition+1e-7&&!(phase.axis===e.axis&&phase.phase==='VERDE'))available=Math.min(available,stopPosition-v.p);
        if(control==='inherit'&&rule&&v.p<=stopPosition+1e-7&&!this.yieldGap(rule)){available=Math.min(available,stopPosition-v.p);if(e.length-v.p<25)this.yieldWaiters.add(v.id);}
        if(this.network.ruleByNode.get(e.to)?.rail&&this.trainClosed()){const trainStop=Math.max(0,e.length-18);if(v.p<=trainStop+1e-7){available=Math.min(available,trainStop-v.p);if(e.length-v.p<35)this.trainWaiters.add(v.id);}}
        if(this.boxConflicts(e.id,nextId)&&v.p<=stopPosition+1e-7)available=Math.min(available,stopPosition-v.p);
        const next=v.path[v.index+1];
        if(next) {
          const nextLane=this.lanes.get(next);
          if(this.entryLane(next,v.lane??0,v.path[v.index+2])<0||this.meter&&!this.meter.canEnter(v,next)){const hold=v.p>stopPosition+1e-7||v.blocksBox&&this.inFocus(e.to)&&this.realJunctions.has(e.to)?e.length-.6:stopPosition;available=Math.min(available,hold-v.p);if(e.length-v.p<15)blocked++;}
        }
        // Reserve receiving storage before crossing the stop line, shared by all approaches.
        if(this.meter&&signal&&nextId&&v.p<=stopPosition+1e-7&&stopPosition-v.p<=CONFIG.speed*dt+1&&available>Math.max(0,stopPosition-v.p)&&v.meterPermit!==e.to){
          if((control==='inherit'&&!rule?.signalBypass&&signal.remaining===0)||!this.meter.reserve(v)){available=Math.min(available,stopPosition-v.p);this.meter.held.add(v.id);}
          else {v.meterPermit=e.to;if(control==='inherit'&&!rule?.signalBypass)signal.served(this.time);}
        }
        if(this.meter&&signal&&nextId&&v.p<=stopPosition+1e-7&&e.length-v.p<25&&v.meterPermit!==e.to&&!this.meter.canReserve(v))this.meter.held.add(v.id);
        const target=Math.min(CONFIG.speed,Math.sqrt(Math.max(0,2*4.5*available)));
        v.v=Math.max(0,Math.min(CONFIG.speed,v.v+(v.v<target?2.2:-4.5)*dt));
        v.v=Math.min(v.v,Math.max(0,available)/dt);v.p+=v.v*dt;
        if(v.previousP<=stopPosition&&v.p>stopPosition&&(this.network.ruleByNode.has(e.to)||['stop','yield'].includes(control))){if(!this.junctionOccupancy.has(e.to))this.junctionOccupancy.set(e.to,[]);this.junctionOccupancy.get(e.to).push({incoming:e.id,outgoing:nextId,until:this.time+(e.length-v.p)/Math.max(1,v.v)+(v.type==='bus'?3:2)});}
        if(v.v<.5){v.wait+=dt;stopped++;}else{this.yieldWaiters.delete(v.id);this.trainWaiters.delete(v.id);}fronts.set(v.lane??0,v);
        if(v.p>=e.length)transfers.push({v,e});
      }
    }
    for(const {v,e} of transfers) {
      const lane=this.lanes.get(e.id),next=v.path[v.index+1];
      if(e.to===v.via){if(v.profile&&v.northbound&&e.to===DISPERSION_NODE){this.dispersed++;this.dispersedDirections[v.direction]++;}v.via=null;}
      if(!next) {
        this.meter?.release(v);lane.splice(lane.indexOf(v),1);if(!lane.length)this.activeLanes.delete(e.id);this.completed++;this.totalTravel+=this.time-v.t;this.completedWait+=v.wait;continue;
      }
      let newPath=null;
      if(this.options.distribute && !this.meter?.reservations.has(v.id) && (!v.profile||!v.via) && !this.network.byId.get(e.to).boundary && v.path.slice(v.index+1,v.index+4).some(id=>this.lanes.get(id).filter(u=>u.v<.5).length>=3)) {
        // Re-route at junctions only. Prevent a U-turn onto the edge just traversed.
        newPath=shortestPath(this.network,e.to,v.via??v.destination,n=>n.to===e.from||v.profile&&v.northbound&&!v.via&&RETURN_CORRIDOR_NODES.has(n.to)?Infinity:this.lanes.get(n.id).length*1.8,{vehicleType:v.type,incomingEdgeId:e.id});
        if(v.via&&newPath.length){const last=this.network.edgeById.get(newPath.at(-1));const exit=shortestPath(this.network,v.via,v.destination,n=>n.from===v.via&&n.to===last.from?Infinity:this.lanes.get(n.id).length*1.8,{vehicleType:v.type,incomingEdgeId:last.id});newPath=exit.length?[...newPath,...exit]:null;}
      }
      let nextId=newPath?.[0]??next;
      const rerouteRule=this.movementRule(e.id,nextId),oldRule=this.movementRule(e.id,next);
      // A vehicle already inside a junction keeps its committed maneuver.
      if(nextId!==next&&(rerouteRule||oldRule||this.options.roadLayout?.laneTurns?.[e.id])){newPath=null;nextId=next;}
      const nextLane=this.lanes.get(nextId);
      if(this.entryLane(nextId,v.lane??0,newPath?.[1]??v.path[v.index+2])<0||this.meter&&!this.meter.canEnter(v,nextId)){v.p=e.length;v.v=0;continue;}
      lane.splice(lane.indexOf(v),1);if(!lane.length)this.activeLanes.delete(e.id);
      v.previousEdge=e.id;v.previousLane=v.lane??0;v.lane=this.entryLane(nextId,v.lane??0,newPath?.[1]??v.path[v.index+2]);delete v.stopDwell;
      if(newPath?.length){v.path=newPath;v.index=0;}else v.index++;
      this.meter?.entered(v,nextId);delete v.meterPermit;v.p=0;v.previousP=0;nextLane.push(v);this.activeLanes.add(nextId);
    }
    this.yieldWaitSeconds+=this.yieldWaiters.size*dt;this.trainWaitSeconds+=this.trainWaiters.size*dt;
    queue+=stopped;this.lastQueue=queue;this.queueIntegral+=queue*dt;this.totalWait+=queue*dt;
    if(this.meter)this.meter.holdSeconds+=this.meter.held.size*dt;
    this.coordinator?.update(this.time,this);
    for(const [id,signal] of this.signals)this.meter?signal.update(this.time,dt,this):signal.update(this.time,dt,this.queuesAt(id),blockedAt(this,id));
    if(Math.floor(oldTime)<Math.floor(this.time))this.records.push(this.snapshot());
  }
  laneCount(id){return this.options.roadLayout?.vector?(this.network.edgeById.get(id)?.laneCount??1):1;}
  entryLane(id,preferred=null,next=null){if(!id||!this.lanes.has(id))return -1;const lane=this.lanes.get(id),count=this.laneCount(id);let best=-1,load=Infinity;const allowed=this.options.roadLayout?.laneTurns?.[id]?.[next];for(const i of allowed??(preferred===null?Array.from({length:count},(_,i)=>i):count?[Math.min(preferred,count-1)]:[])){if(i>=count)continue;const cars=lane.filter(v=>(v.lane??0)===i);if(cars.some(v=>v.p<CONFIG.carLength+CONFIG.minGap+1))continue;if(cars.length<load){best=i;load=cars.length;}}return best;}
  customGap(edge,vehicle){if((this.junctionOccupancy.get(edge.to)??[]).some(c=>c.incoming!==edge.id&&movementsConflict(this.network,edge.id,vehicle.path[vehicle.index+1],c.incoming,c.outgoing)))return false;for(const other of this.network.incoming.get(edge.to)){if(other.id===edge.id)continue;for(const car of this.lanes.get(other.id)){const next=car.path[car.index+1];if(!next||!movementsConflict(this.network,edge.id,vehicle.path[vehicle.index+1],other.id,next))continue;const phase=this.signals.get(edge.to)?.phase(this.time),stop=this.stopPosition(other);if((this.options.roadLayout?.approaches?.[other.id]?.control??'inherit')==='inherit'&&phase&&car.p<=stop&&!(phase.phase==='VERDE'&&phase.axis===other.axis))continue;if(other.length-car.p<25&&(car.v>.5||car.id<vehicle.id&&car.p>=stop-.2))return false;}}return true;}
  boxConflicts(incoming,outgoing){
    const e=this.network.edgeById.get(incoming),blocks=this.crossingBlockMovements.get(e.to)??[];
    return blocks.some(b=>b.incoming!==incoming&&movementsConflict(this.network,incoming,outgoing,b.incoming,b.outgoing));
  }
  stopPosition(edge){return Math.max(0,edge.length-layoutStopDistance(this.options.roadLayout,edge));}
  movementRule(incoming,outgoing){return this.network.yieldByIncoming.get(incoming)?.find(r=>!r.outgoing||r.outgoing===outgoing);}
  trainClosed(time=this.time){if(!this.options.trainEnabled)return false;const period=this.options.trainPeriod??600,duration=this.options.trainDuration??45,offset=this.options.trainOffset??120;return time>=offset&&(time-offset)%period<duration;}
  yieldGap(rule){
    const gap=this.network.movementRules.gapSeconds;
    const conflicts=this.junctionOccupancy.get(rule.node)??[];
    if(conflicts.some(c=>rule.priority.includes(c.incoming)||c.outgoing===rule.outgoing))return false;
    for(const id of rule.priority){const edge=this.network.edgeById.get(id),phase=this.signals.get(edge.to)?.phase(this.time);
      for(const car of this.lanes.get(id)){const stop=this.stopPosition(edge),distance=edge.length-car.p;
        if((this.options.roadLayout?.approaches?.[edge.id]?.control??'inherit')==='inherit'&&phase&&car.p<=stop+1e-7&&!(phase.axis===edge.axis&&phase.phase==='VERDE'))continue;
        if(car.v<.5&&this.lanes.get(car.path[car.index+1])?.some(u=>u.p<CONFIG.carLength+CONFIG.minGap+1))continue;
        const eta=car.v>.5?distance/car.v:Math.sqrt(2*distance/2.2);if(eta<=gap)return false;
      }
    }
    return true;
  }
  inFocus(id){const n=this.network.byId.get(id),b=this.network.focusZone?.bounds;return !!b&&n.x>=b[0]&&n.x<=b[2]&&n.y>=b[1]&&n.y<=b[3];}
  queuesAt(id) {
    const q={H:0,V:0};for(const e of this.network.incoming.get(id))q[e.axis]+=this.lanes.get(e.id).filter(v=>v.v<.5 && e.length-v.p<100&&!(this.signals.has(id)&&this.movementRule(e.id,v.path[v.index+1])?.signalBypass)).length;return q;
  }
  get vehicles(){return [...this.activeLanes].flatMap(id=>this.lanes.get(id));}
  snapshot() {
    const cars=this.vehicles;return {segundo:+this.time.toFixed(1),modo:this.adaptive?'ADAPTATIVO':'FIJO',generados:this.generated,cupos_retenidos:this.meter?.held.size??0,cupos_reservados:this.meter?[...this.meter.reservations.values()].reduce((s,x)=>s+x.cost,0):0,vehiculos_autorizados:this.meter?.admitted??0,dispersados_norte:this.dispersed,dispersados_oeste:this.dispersedDirections.O,dispersados_norte_salida:this.dispersedDirections.N,dispersados_este:this.dispersedDirections.E,en_red:cars.length,pendientes:this.pending.length,salidas:this.completed,cola:this.lastQueue,velocidad_kmh:cars.length?+(cars.reduce((s,v)=>s+v.v,0)/cars.length*3.6).toFixed(2):0,espera_media_s:this.completed?+(this.completedWait/this.completed).toFixed(2):0,viaje_medio_s:this.completed?+(this.totalTravel/this.completed).toFixed(2):0,ceda_esperando:this.yieldWaiters.size,ceda_espera_vehiculo_segundos:+this.yieldWaitSeconds.toFixed(1),tren_cerrado:this.trainClosed()?1:0,tren_esperando:this.trainWaiters.size,tren_espera_vehiculo_segundos:+this.trainWaitSeconds.toFixed(1),pirro_cola:cars.filter(v=>{const e=this.network.edgeById.get(v.path[v.index]);return v.v<.5&&(this.inFocus(e.from)||this.inFocus(e.to));}).length,pirro_bloqueos:this.crossingBlocks.size,pirro_bloqueo_segundos:+this.blockedSeconds.toFixed(1),cola_promedio:this.time?+(this.queueIntegral/this.time).toFixed(2):0};
  }
  sensor(id,distance) {
    const edges=this.network.incoming.get(id);
    return edges.reduce((n,e)=>n+this.lanes.get(e.id).filter(v=>Math.abs((e.length-v.p)-distance)<8).length,0);
  }
}
function blockedAt(sim,id){return sim.network.incoming.get(id).reduce((n,e)=>n+sim.lanes.get(e.id).filter(v=>e.length-v.p<10 && v.v<.5).length,0);}
export function createPair(options){const net=createNetwork(options.roadLayout),arrivals=createArrivals(net,options);return {fixed:new Simulation(options,false,arrivals),adaptive:new Simulation(options,true,arrivals)};}
export function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';return '\ufeff'+[keys.map(quote).join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');}

// Geometric vertices are not intersections. At a real junction, straight traffic in
// opposite directions uses separate lanes; a stopped queue does not cross that path.
export function movementsConflict(network,incoming,outgoing,blockedIncoming,blockedOutgoing){
 const a=network.edgeById.get(incoming),b=network.edgeById.get(blockedIncoming),ao=network.edgeById.get(outgoing),bo=network.edgeById.get(blockedOutgoing);
 if(!a||!b||!ao||!bo||outgoing===blockedOutgoing)return true;
 const direction=(edge,end)=>{const p=edge.points;for(let i=end?p.length-1:1;end?i>0:i<p.length;end?i--:i++){const x=p[i][0]-p[i-1][0],y=p[i][1]-p[i-1][1],d=Math.hypot(x,y);if(d>1e-9)return [x/d,y/d];}return [0,0];};
 const dot=(u,v)=>u[0]*v[0]+u[1]*v[1],ad=direction(a,true),bd=direction(b,true);
 const straightA=dot(ad,direction(ao,false))>Math.cos(Math.PI/6),straightB=dot(bd,direction(bo,false))>Math.cos(Math.PI/6);
 if(straightA&&straightB&&dot(ad,bd)<-Math.cos(Math.PI/6))return false;
 return true;
}
