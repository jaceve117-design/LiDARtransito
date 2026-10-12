// DOM integration check, not a substitute for a visual browser review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
test('Page renders, runs, switches controller, selects junctions, resets and exports both scenarios',async()=>{
  const {document,window}=parseHTML(await readFile(new URL('../public/index.html',import.meta.url),'utf8'));
  const byId=id=>document.getElementById(id),frames=[],blobs=[];
  globalThis.document=document;globalThis.window=window;globalThis.requestAnimationFrame=fn=>frames.push(fn);
  const canvas=byId('queueChart');Object.defineProperty(canvas,'clientWidth',{value:640});Object.defineProperty(canvas,'clientHeight',{value:155});canvas.getContext=()=>new Proxy({}, {get:()=>()=>{},set:()=>true});
  byId('map').setPointerCapture=()=>{};byId('map').getBoundingClientRect=()=>({width:800,height:420});
  // Linkedom does not implement the initial checked property or select.value.
  for(const input of document.querySelectorAll('input[type=checkbox]'))input.checked=input.hasAttribute('checked');
  for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{writable:true,value:select.querySelector('option[selected]')?.getAttribute('value')??select.querySelector('option').getAttribute('value')});
  const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:test';};URL.revokeObjectURL=()=>{};
  try {
    await import('../public/app.js');assert.equal(byId('signals').children.length,9);assert.equal(byId('comparison').children.length,7);assert.equal(byId('junctionName').textContent,'Pirro · acceso al centro');
    byId('play').click();assert.equal(byId('play').textContent,'Pausar');let now=performance.now();for(let i=0;i<110;i++){now+=100;frames.shift()(now);}assert.ok(+byId('metricActive').textContent>0);assert.ok(byId('vehicles').children.length>0);assert.equal(byId('export').disabled,false);
    byId('play').click();assert.equal(byId('play').textContent,'Iniciar');
    byId('modeFixed').click();assert.equal(byId('modeFixed').getAttribute('aria-pressed'),'true');assert.equal(byId('mapMode').textContent,'CONTROL FIJO');
    byId('signals').querySelector('[data-node="av3-c16"]').dispatchEvent(new window.Event('click'));assert.equal(byId('junctionName').textContent,'Avenida 3 · Calle 16');
    byId('zoomReset').click();byId('zoomIn').click();assert.ok(byId('mapViewport').getAttribute('transform').includes('scale(1.2)'));
    byId('export').click();assert.equal(blobs.length,1);const out=await blobs[0].text();assert.ok(out.includes('FIJO'));assert.ok(out.includes('ADAPTATIVO'));assert.ok(out.includes('demanda_veh_h'));
    byId('exportCompare').click();byId('exportQ').click();assert.equal(blobs.length,3);assert.ok((await blobs[2].text()).includes('DOMINIO_HORIZONTAL'));
    byId('referenceToggle').checked=true;byId('referenceToggle').dispatchEvent(new window.Event('change'));assert.equal(byId('mapBase').getAttribute('href'),'/maps/heredia-referencia.png');byId('mapExpand').click();assert.ok(byId('mapStage').classList.contains('expanded'));byId('mapExpand').click();byId('restart').click();assert.equal(byId('metricActive').textContent,'0');assert.equal(byId('clock').textContent,'00:00 / 15:00');assert.equal(byId('export').disabled,true);
    byId('demand').value='0';byId('duration').value='300';byId('settings').dispatchEvent(new window.Event('submit',{cancelable:true}));assert.equal(byId('clock').textContent,'00:00 / 05:00');
    byId('finish').click();const start=performance.now();while(!byId('comparisonTime').textContent.startsWith('Comparación final')&&performance.now()-start<15000)await new Promise(r=>setTimeout(r,30));assert.ok(byId('comparisonTime').textContent.startsWith('Comparación final'));assert.equal(byId('play').textContent,'Completado');assert.equal(byId('metricExit').textContent,'0');
  } finally {URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;}
});
