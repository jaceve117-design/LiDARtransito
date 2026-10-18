import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../public/network.js';
import { vehiclePose } from '../public/vehicle-geometry.js';
const scale=CONFIG.metersPerUnit;
function fixture(turn){
  const incoming={id:'in',from:'a',to:'b',length:30*scale,points:[[-30,0],[0,0]]};
  const outgoing={id:'out',from:'b',to:'c',length:30*scale,points:[[0,0],turn]};
  return {incoming,outgoing,network:{edgeById:new Map([['in',incoming],['out',outgoing]])}};
}
for(const [label,end] of [['derecho',[0,30]],['izquierdo',[0,-30]],['recto',[30,0]]]){
  test(`Giro ${label}: posición y orientación continuas al cambiar de tramo`,()=>{
    const {network,incoming}=fixture(end),path=['in','out'];
    const before=vehiclePose(network,{path,index:0,p:incoming.length-1e-6});
    const after=vehiclePose(network,{path,index:1,p:0});
    assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<1e-5);
    assert.ok(Math.abs(before.angle-after.angle)<1e-3);
    for(let p=0;p<5.5;p+=.05){
      const pose=vehiclePose(network,{path,index:1,p});
      assert.ok(Number.isFinite(pose.angle));
      // The outgoing half of a turn stays on its destination's right-hand side.
      if(label==='derecho')assert.ok(pose.x<=-1.5+1e-8);
      if(label==='izquierdo')assert.ok(pose.x>=-1e-8);
      if(label==='recto')assert.ok(Math.abs(pose.y-1.5)<1e-8);
    }
  });
}
test('Un vehículo detenido en la línea del semáforo conserva su carril y orientación',()=>{
  const {network,incoming}=fixture([0,30]);
  const pose=vehiclePose(network,{path:['in','out'],index:0,p:incoming.length-CONFIG.stopDistance});
  assert.equal(pose.angle,0);assert.equal(pose.y,1.5);
});
test('El tramo de entrada se conserva aunque se haya sustituido la ruta',()=>{
  const {network,incoming}=fixture([0,-30]);
  const before=vehiclePose(network,{path:['in','out'],index:0,p:incoming.length});
  const after=vehiclePose(network,{path:['out'],previousEdge:'in',index:0,p:0});
  assert.deepEqual(after,before);
});


test('Todas las conexiones municipales permitidas mantienen posición continua al cambiar de tramo',async()=>{
  const {createNetwork}=await import('../public/network.js');const network=createNetwork();let checked=0;
  for(const incoming of network.edges)for(const outgoing of network.outgoing.get(incoming.to)){
    if(outgoing.to===incoming.from)continue;
    const path=[incoming.id,outgoing.id];
    const before=vehiclePose(network,{path,index:0,p:incoming.length});
    const after=vehiclePose(network,{path,index:1,p:0});
    assert.ok([before.x,before.y,before.angle,after.x,after.y,after.angle].every(Number.isFinite));
    assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<1e-8,`${incoming.id} → ${outgoing.id}`);checked++;
  }
  assert.ok(checked>3000);
});
