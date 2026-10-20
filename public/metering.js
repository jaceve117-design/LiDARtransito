import { CONFIG } from './network.js';
const other=axis=>axis==='H'?'V':'H';
export class ActuatedSignal {
  constructor(node,options,plan){this.id=node.id;this.plan=plan;this.axis=plan.axis;this.state='VERDE';this.since=0;this.now=0;this.green=options.green;this.primaryGreen=options.green;this.minGreen=options.minGreen??10;this.maxGreen=options.maxGreen??60;this.maxWait=options.maxWait??60;this.gap=3;this.limit=options.batchSize??10;this.remaining=this.limit;this.waiting={H:null,V:null};this.lastSeen=0;this.arrivals=new Map();this.cycles=0;this.history=[];this.reason='Esperando demanda';}
  phase(time=this.now){return {axis:this.state==='TODO_ROJO'||this.state==='RETENIDO'?null:this.axis,phase:this.state,remaining:Math.max(0,(this.state==='AMARILLO'?3:this.state==='TODO_ROJO'?1:this.maxGreen)-(time-this.since))};}
  notify(id,axis,eta){this.arrivals.set(id,{axis,eta});}
  served(time){this.remaining=Math.max(0,this.remaining-1);this.lastSeen=time;}
  change(state,time,reason){if(state==='AMARILLO')this.nextAxis=other(this.axis);this.state=state;this.since=time;this.reason=reason;this.history.push({segundo:+time.toFixed(1),cruce:this.id,eje:this.axis,fase:state,motivo:reason,cupos_lote:this.remaining});}
  update(time,dt,sim){this.now=time;for(const [id,a]of this.arrivals)if(a.eta+20<time)this.arrivals.delete(id);
    const demand=sim.meter.demand(this.id);for(const axis of ['H','V']){const expected=[...this.arrivals.values()].some(a=>a.axis===axis&&a.eta-time<=8&&a.eta>=time-10);demand[axis].expected=expected;if(demand[axis].count||expected){if(this.waiting[axis]===null)this.waiting[axis]=time;}else this.waiting[axis]=null;}
    const has=axis=>demand[axis].count>0||demand[axis].expected,viable=axis=>demand[axis].open>0||demand[axis].expected&&!demand[axis].count;
    if(this.state==='AMARILLO'){if(time-this.since>=3-1e-8)this.change('TODO_ROJO',time,'Despejar el cruce');return;}
    if(this.state==='TODO_ROJO'&&time-this.since<1-1e-8)return;
    if(this.state==='TODO_ROJO'||this.state==='RETENIDO'){
      const choices=['H','V'].filter(a=>has(a)&&viable(a));
      if(!choices.length){if(has('H')||has('V')){if(this.state!=='RETENIDO')this.change('RETENIDO',time,'Salidas sin cupo; esperando desalojo');return;}choices.push(this.axis);}
      choices.sort((a,b)=>{const score=x=>(this.waiting[x]===null?0:time-this.waiting[x])+demand[x].count*2+(x!==this.axis?5:0)+(demand[x].expected?8:0);const overdue=x=>this.waiting[x]!==null&&time-this.waiting[x]>=this.maxWait;return Number(overdue(b))-Number(overdue(a))||score(b)-score(a);});
      this.axis=choices.includes(this.nextAxis)?this.nextAxis:choices[0];this.remaining=this.limit;this.lastSeen=time;this.cycles++;this.change('VERDE',time,'Atender demanda con espacio reservado');this.waiting[this.axis]=null;return;
    }
    const age=time-this.since,opposite=other(this.axis);if(demand[this.axis].count)this.lastSeen=time;this.waiting[this.axis]=null;
    if(age<this.minGreen)return;
    const blocked=has(this.axis)&&!viable(this.axis),expired=has(opposite)&&(age>=this.maxGreen||this.waiting[opposite]!==null&&time-this.waiting[opposite]>=this.maxWait),gap=has(opposite)&&!has(this.axis)&&time-this.lastSeen>=this.gap;
    if(this.remaining===0||blocked||expired||gap)this.change('AMARILLO',time,this.remaining===0?'Lote completo':blocked?'Retener entrada; tramo ocupado':expired?'Atender espera transversal':'Sin demanda; atender otra vía');
  }
}
export class SpaceMeter {
  constructor(sim,options){this.sim=sim;this.margin=options.reserveSlots??2;this.refill=options.refillSlots??3;this.reservations=new Map();this.reservedByEdge=new Map();this.closed=new Set();this.closedSince=new Map();this.refillWait=5;this.held=new Set();this.admitted=0;this.holdSeconds=0;}
  cost(v){return v.type==='bus'?3:1;}
  capacity(id){const e=this.sim.network.edgeById.get(id),physical=Math.max(1,Math.floor(e.length/(CONFIG.carLength+CONFIG.minGap)));return Math.max(1,physical-Math.min(this.margin,Math.floor(physical*.15)))*this.sim.laneCount(id);}
  status(id){const capacity=this.capacity(id),occupied=this.sim.lanes.get(id).reduce((s,v)=>s+this.cost(v),0),reserved=this.reservedByEdge.get(id)??0,available=Math.max(0,capacity-occupied-reserved);return {edge:id,capacity,occupied,reserved,available};}
  section(v){const ids=[];let distance=0;for(let i=v.index+1;i<v.path.length;i++){const id=v.path[i],e=this.sim.network.edgeById.get(id);ids.push(id);distance+=e.length;if(this.sim.signals.has(e.to)||this.sim.network.byId.get(e.to).boundary||distance>=600)break;}return ids;}
  // Gate only the next storage link. Reserving every future link creates circular holds.
  receivingSection(v){const ids=[];let distance=0;for(let i=v.index+1;i<v.path.length;i++){const id=v.path[i],e=this.sim.network.edgeById.get(id);ids.push(id);distance+=e.length;if(e.length>=21||this.sim.signals.has(e.to)||this.sim.network.byId.get(e.to).boundary||distance>=600)break;}return ids;}
  canReserve(v){const cost=this.cost(v);return this.receivingSection(v).filter(id=>this.sim.network.edgeById.get(id).length>=21).every(id=>{
    const s=this.status(id);
    // A bus needing three slots must not close a receiver that can admit a car.
    if(s.available<1){if(!this.closed.has(id)){this.closed.add(id);this.closedSince.set(id,this.sim.time);}return false;}
    if(s.available<cost)return false;
    if(this.closed.has(id)){
      const waited=this.sim.time-(this.closedSince.get(id)??this.sim.time);
      if(s.available<Math.min(s.capacity,Math.max(cost,this.refill))&&waited<this.refillWait)return false;
      this.closed.delete(id);this.closedSince.delete(id);
    }
    return true;
  });}
  reserve(v){if(this.reservations.has(v.id))return true;if(!this.canReserve(v))return false;const edges=this.receivingSection(v),cost=this.cost(v);if(!edges.length)return true;this.reservations.set(v.id,{edges:new Set(edges.filter(id=>this.sim.network.edgeById.get(id).length>=21)),cost});for(const id of this.reservations.get(v.id).edges)this.reservedByEdge.set(id,(this.reservedByEdge.get(id)??0)+cost);if(!this.reservations.get(v.id).edges.size)this.reservations.delete(v.id);this.admitted++;
    const forecast=this.section(v),last=this.sim.network.edgeById.get(forecast.at(-1)),receiver=this.sim.signals.get(last.to);if(receiver instanceof ActuatedSignal){const eta=this.sim.time+forecast.reduce((s,id)=>s+this.sim.network.edgeById.get(id).length,0)/((this.sim.options.waveSpeed??30)/3.6);receiver.notify(v.id,last.axis,eta);}return true;}
  canEnter(v,id){const e=this.sim.network.edgeById.get(id);return e.length<21||this.reservations.get(v.id)?.edges.has(id)||this.status(id).available>=this.cost(v);}
  entered(v,id){const r=this.reservations.get(v.id);if(!r?.edges.delete(id))return;const remaining=(this.reservedByEdge.get(id)??0)-r.cost;if(remaining)this.reservedByEdge.set(id,remaining);else this.reservedByEdge.delete(id);if(!r.edges.size)this.reservations.delete(v.id);}
  release(v){const r=this.reservations.get(v.id);if(!r)return;for(const id of r.edges){const n=(this.reservedByEdge.get(id)??0)-r.cost;if(n)this.reservedByEdge.set(id,n);else this.reservedByEdge.delete(id);}this.reservations.delete(v.id);}
  demand(id){const q={H:{count:0,open:0},V:{count:0,open:0}};for(const e of this.sim.network.incoming.get(id)){const lane=[...this.sim.lanes.get(e.id)].sort((a,b)=>b.p-a.p);for(const v of lane){if(e.length-v.p>180||this.sim.movementRule(e.id,v.path[v.index+1])?.signalBypass)continue;q[e.axis].count++;}const heads=new Map();for(const v of lane)if(!heads.has(v.lane??0))heads.set(v.lane??0,v);for(const first of heads.values())if(e.length-first.p<=180&&!this.sim.movementRule(e.id,first.path[first.index+1])?.signalBypass&&(this.reservations.has(first.id)||this.canReserve(first)))q[e.axis].open++;}return q;}
  rows(id){const ids=new Set(this.sim.network.outgoing.get(id).map(e=>e.id));for(const e of this.sim.network.incoming.get(id)){const v=[...this.sim.lanes.get(e.id)].sort((a,b)=>b.p-a.p)[0];if(v)for(const edge of this.receivingSection(v))ids.add(edge);}return [...ids].map(id=>this.status(id));}
}
