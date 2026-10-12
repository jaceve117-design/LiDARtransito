import { CONFIG, createNetwork, shortestPath } from './network.js';
export function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
export function createArrivals(network,{duration,demand,seed}) {
  const random=rng(seed),arrivals=[];let t=0,id=1;
  if(demand===0)return arrivals;
  // Exponential interarrival times (Poisson demand); shared verbatim by both scenarios.
  while(true) {
    t+=-Math.log(Math.max(1e-12,1-random()))/(demand/3600);
    if(t>duration)break;
    const origin=network.boundaries[Math.floor(random()*network.boundaries.length)];
    const possible=network.boundaries.filter(b=>b.side!==origin.side);
    const destination=possible[Math.floor(random()*possible.length)];
    arrivals.push({id:id++,t,origin:origin.id,destination:destination.id,type:random()<.12?'bus':'car'});
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
    this.options=options;this.adaptive=adaptive;this.network=createNetwork();
    this.arrivals=arrivals??createArrivals(this.network,options);this.cursor=0;this.time=0;
    this.signals=new Map(this.network.nodes.filter(n=>n.signal).map(n=>[n.id,new Signal(n,options,adaptive)]));
    this.lanes=new Map(this.network.edges.map(e=>[e.id,[]]));this.pending=[];this.completed=0;this.totalTravel=0;this.totalWait=0;this.completedWait=0;this.queueIntegral=0;this.lastQueue=0;this.records=[];this.generated=0;
  }
  path(origin,destination) {
    return shortestPath(this.network,origin,destination,e=>this.options.distribute?this.lanes.get(e.id).length*1.8:0);
  }
  step(dt=CONFIG.dt) {
    dt=Math.min(dt,this.options.duration-this.time);if(dt<=1e-9)return;
    const oldTime=this.time;this.time=Math.min(this.options.duration,Math.round((this.time+dt)*1e9)/1e9);
    while(this.cursor<this.arrivals.length && this.arrivals[this.cursor].t<=this.time){this.pending.push({...this.arrivals[this.cursor++]});this.generated++;}
    const remaining=[];
    for(const a of this.pending) {
      const path=a.initialPath??this.path(a.origin,a.destination);a.initialPath=path;const lane=this.lanes.get(path[0]);
      if(!path.length || lane.some(v=>v.p<CONFIG.carLength+CONFIG.minGap+1)){remaining.push(a);continue;}
      lane.push({...a,path,index:0,p:0,v:0,wait:this.time-a.t,previousP:0,color:a.type==='bus'?'#1b668b':['#21775b','#d49743','#647488','#4b689c'][a.id%4]});
    }
    this.pending=remaining;
    let queue=this.pending.length,stopped=0,blocked=0;
    const transfers=[];
    // Vehicles move front to back; downstream admission is resolved after all lanes move.
    for(const e of this.network.edges) {
      const lane=this.lanes.get(e.id);lane.sort((a,b)=>b.p-a.p);let front=null;
      for(const v of lane) {
        v.previousP=v.p;
        let available=Math.min(e.length-v.p,front?front.p-CONFIG.carLength-CONFIG.minGap-v.p:Infinity);
        const signal=this.signals.get(e.to),phase=signal?.phase(this.time);
        if(signal && !(phase.axis===e.axis && phase.phase==='VERDE'))available=Math.min(available,e.length-.6-v.p);
        const next=v.path[v.index+1];
        if(next) {
          const nextLane=this.lanes.get(next);
          if(nextLane.some(u=>u.p<CONFIG.carLength+CONFIG.minGap+1)){available=Math.min(available,e.length-.6-v.p);if(e.length-v.p<15)blocked++;}
        }
        const target=Math.min(CONFIG.speed,Math.sqrt(Math.max(0,2*4.5*available)));
        v.v=Math.max(0,Math.min(CONFIG.speed,v.v+(v.v<target?2.2:-4.5)*dt));
        v.v=Math.min(v.v,Math.max(0,available)/dt);v.p+=v.v*dt;
        if(v.v<.5){v.wait+=dt;stopped++;}front=v;
        if(v.p>=e.length)transfers.push({v,e});
      }
    }
    for(const {v,e} of transfers) {
      const lane=this.lanes.get(e.id),next=v.path[v.index+1];
      if(!next) {
        lane.splice(lane.indexOf(v),1);this.completed++;this.totalTravel+=this.time-v.t;this.completedWait+=v.wait;continue;
      }
      let newPath=null;
      if(this.options.distribute && !this.network.byId.get(e.to).boundary) {
        // Re-route at junctions only. Prevent a U-turn onto the edge just traversed.
        newPath=shortestPath(this.network,e.to,v.destination,n=>n.to===e.from?10000:this.lanes.get(n.id).length*1.8);
      }
      const nextId=newPath?.[0]??next,nextLane=this.lanes.get(nextId);
      if(nextLane.some(u=>u.p<CONFIG.carLength+CONFIG.minGap+1)){v.p=e.length;v.v=0;continue;}
      lane.splice(lane.indexOf(v),1);
      if(newPath?.length){v.path=newPath;v.index=0;}else v.index++;
      v.p=0;v.previousP=0;nextLane.push(v);
    }
    queue+=stopped;this.lastQueue=queue;this.queueIntegral+=queue*dt;this.totalWait+=queue*dt;
    for(const [id,signal] of this.signals)signal.update(this.time,dt,this.queuesAt(id),blockedAt(this,id));
    if(Math.floor(oldTime)<Math.floor(this.time))this.records.push(this.snapshot());
  }
  queuesAt(id) {
    const q={H:0,V:0};for(const e of this.network.edges)if(e.to===id)q[e.axis]+=this.lanes.get(e.id).filter(v=>v.v<.5 && e.length-v.p<100).length;return q;
  }
  get vehicles(){return [...this.lanes.values()].flat();}
  snapshot() {
    const cars=this.vehicles;return {segundo:+this.time.toFixed(1),modo:this.adaptive?'ADAPTATIVO':'FIJO',generados:this.generated,en_red:cars.length,pendientes:this.pending.length,salidas:this.completed,cola:this.lastQueue,velocidad_kmh:cars.length?+(cars.reduce((s,v)=>s+v.v,0)/cars.length*3.6).toFixed(2):0,espera_media_s:this.completed?+(this.completedWait/this.completed).toFixed(2):0,viaje_medio_s:this.completed?+(this.totalTravel/this.completed).toFixed(2):0,cola_promedio:this.time?+(this.queueIntegral/this.time).toFixed(2):0};
  }
  sensor(id,distance) {
    const edges=this.network.edges.filter(e=>e.to===id);
    return edges.reduce((n,e)=>n+this.lanes.get(e.id).filter(v=>Math.abs((e.length-v.p)-distance)<8).length,0);
  }
}
function blockedAt(sim,id){return sim.network.edges.filter(e=>e.to===id).reduce((n,e)=>n+sim.lanes.get(e.id).filter(v=>e.length-v.p<10 && v.v<.5).length,0);}
export function createPair(options){const net=createNetwork(),arrivals=createArrivals(net,options);return {fixed:new Simulation(options,false,arrivals),adaptive:new Simulation(options,true,arrivals)};}
export function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';return '\ufeff'+[keys.map(quote).join(','),...rows.map(r=>keys.map(k=>quote(r[k])).join(','))].join('\r\n');}
