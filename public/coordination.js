import { shortestPath } from './network.js';
// Travel paths follow directed municipal edges. Each signal belongs to one corridor.
export const CORRIDORS = Object.freeze([
  {id:'pirro',label:'Pirro · San Pablo → norte → salida San José',axis:'V',nodes:['pirro-sur','pirro','mh-726'],axes:['H','V','V']},
  {id:'centro',label:'Centro · oeste → este',axis:'H',nodes:['av2-c20','av4-c14','av4-c12','av4-c8','av4-c6']},
  {id:'calle16',label:'Calle 16 · hacia el sur',axis:'V',nodes:['av3-c16','av1-c16']}
]);
export function coordinationPlans(network,speedKmh=30,waveSource='san-pablo'){
  if(!(speedKmh>=10&&speedKmh<=40))throw Error('Velocidad de coordinación entre 10 y 40 km/h');
  const plans=new Map();
  for(const group of CORRIDORS){let distance=0;for(let i=0;i<group.nodes.length;i++){let segment=0,path=[];if(i){path=shortestPath(network,group.nodes[i-1],group.nodes[i]);if(!path.length)throw Error('Corredor desconectado: '+group.id);segment=path.reduce((s,id)=>s+network.edgeById.get(id).length,0);distance+=segment;}
    plans.set(group.nodes[i],{group:group.id,label:group.label,axis:group.axes?(i===0&&waveSource==='miraflores'?'V':group.axes[i]):group.axis,distance,segment,path,delay:distance/(speedKmh/3.6),speedKmh});}}
  return plans;
}
export class CoordinatedSignal {
  constructor(node,options,plan){this.id=node.id;this.cycle=options.cycle;this.green=options.green;this.plan=plan;this.offset=plan.delay;this.axis=plan.axis;this.cycles=0;this.primaryGreen=plan.group==='pirro'?this.cycle-options.green-8:plan.axis==='H'?options.green:this.cycle-options.green-8;this.green=plan.axis==='H'?this.primaryGreen:this.cycle-this.primaryGreen-8;this.pendingGreen=this.primaryGreen;this.lastCycle=0;}
  phase(time){const p=((time-this.offset)%this.cycle+this.cycle)%this.cycle,g=this.primaryGreen,other=this.axis==='H'?'V':'H';
    if(p<g)return {axis:this.axis,phase:'VERDE',remaining:g-p};
    if(p<g+3)return {axis:this.axis,phase:'AMARILLO',remaining:g+3-p};
    if(p<g+4)return {axis:null,phase:'TODO_ROJO',remaining:g+4-p};
    if(p<this.cycle-4)return {axis:other,phase:'VERDE',remaining:this.cycle-4-p};
    if(p<this.cycle-1)return {axis:other,phase:'AMARILLO',remaining:this.cycle-1-p};
    return {axis:null,phase:'TODO_ROJO',remaining:this.cycle-p};
  }
  update(time,dt){const cycle=Math.floor((time-this.offset)/this.cycle);if(cycle!==Math.floor((time-dt-this.offset)/this.cycle)){this.primaryGreen=this.pendingGreen;this.green=this.axis==='H'?this.primaryGreen:this.cycle-this.primaryGreen-8;this.cycles++;this.lastCycle=cycle;}}
}
export class Coordinator {
  constructor(signals,cycle){this.signals=signals;this.cycle=cycle;this.history=[];this.lastEpoch=0;}
  update(time,sim){const epoch=Math.floor(time/this.cycle);if(epoch===this.lastEpoch)return;this.lastEpoch=epoch;
    for(const group of CORRIDORS){const members=group.nodes.map(id=>this.signals.get(id));let main=0,side=0,occupied=0;
      for(const signal of members){const q=sim.queuesAt(signal.id);const axis=signal.axis;const outlets=sim.network.outgoing.get(signal.id),full=outlets.length&&outlets.every(e=>sim.lanes.get(e.id).some(v=>v.p<8));main+=q[axis]*(full ? .25 : 1);side+=q[axis==='H'?'V':'H'];for(const e of sim.network.outgoing.get(signal.id)){const cars=sim.lanes.get(e.id);if(cars.some(v=>v.p<8))occupied++;}}
      const current=members[0].pendingGreen,min=25,max=this.cycle-8-25;
      // Shared bounded queue-pressure plan; commit only at each local cycle boundary.
      const change=main>side+2?5:side>main+2?-5:0,next=Math.max(min,Math.min(max,current+change));
      for(const s of members)s.pendingGreen=next;
      this.history.push({segundo:+time.toFixed(1),corredor:group.id,cola_principal:main,cola_transversal:side,salidas_ocupadas:occupied,verde_principal_s:next});
    }
  }
}
