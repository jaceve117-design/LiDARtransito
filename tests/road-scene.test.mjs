import test from 'node:test';
import assert from 'node:assert/strict';
import {offsetPolyline,trimPolyline,renderRoadScene} from '../public/road-scene.js';
import {createNetwork} from '../public/network.js';
import {freshLayout} from '../public/road-layout.js';
test('Right-angle offsets retain the full lane distance on both segments',()=>{
 assert.deepEqual(offsetPolyline([[0,0],[10,0],[10,10]],2),[[0,2],[8,2],[8,10]]);
 assert.deepEqual(offsetPolyline([[0,0],[10,0],[10,10]],-2),[[0,-2],[12,-2],[12,10]]);
});
test('Paint stops before junctions and short segments do not reverse',()=>{
 assert.deepEqual(trimPolyline([[0,0],[10,0],[10,10]],3,4),[[3,0],[10,0],[10,6]]);
 assert.deepEqual(trimPolyline([[0,0],[2,0]],2,2),[]);
});
test('All street curbs are below all asphalt and generated geometry is finite',()=>{
 const layout=freshLayout();layout.vector=true;const net=createNetwork(layout),svg=renderRoadScene(net,layout,null);
 assert.ok(svg.indexOf('id="roadCurbs"')<svg.indexOf('id="roadAsphalt"'));
 assert.ok(svg.indexOf('id="roadAsphalt"')<svg.indexOf('id="roadPaint"'));
 assert.ok(!/NaN|Infinity/.test(svg));
 for(const e of net.edges)assert.ok(offsetPolyline(e.points,2).flat().every(Number.isFinite));
});
