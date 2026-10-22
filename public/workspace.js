let dialog, summary, bars, wasDone=false;
export function verdict(rows){
  const values=rows.slice(0,6).map(r=>r.cambio_favorable_porcentaje).filter(v=>v!==null);
  if(!values.length)return 'Sin base suficiente para comparar';
  const better=values.some(v=>v>0),worse=values.some(v=>v<0);
  return better&&worse?'Resultado mixto':better?'Mejora en las métricas comparadas':worse?'El control fijo obtuvo mejores resultados':'Sin diferencia en las métricas comparadas';
}
export function updateResults(rows,done,elapsed){
  if(!summary)return;
  summary.textContent=elapsed===0?'Inicia una prueba para comparar ambos controles.':`${done?'Resultado final':'Comparación parcial'} · ${verdict(rows)}.`;
  bars.innerHTML=rows.filter((r,i)=>[0,2,3,5].includes(i)).map(r=>{
    const max=Math.max(r.fijo??0,r.adaptativo??0,1),pct=r.cambio_favorable_porcentaje;
    return `<article><header><strong>${r.metrica}</strong><b class="${pct>0?'favorable':pct<0?'unfavorable':''}">${pct===null?'Sin base %':`${pct>0?'+':''}${pct.toFixed(1)} %`}</b></header>${[['Fijo',r.fijo],['Coordinado',r.adaptativo]].map(([label,value],i)=>`<div class="result-bar"><span>${label}</span><div><i style="width:${100*(value??0)/max}%;background:${i?'#28664c':'#b99961'}"></i></div><b>${value===null?'—':Number(value.toFixed(1)).toLocaleString('es-CR')} ${r.unidad}</b></div>`).join('')}</article>`;
  }).join('');
  if(done&&!wasDone)openResults();
  wasDone=done;
}
function openResults(){if(dialog?.showModal&&!dialog.open)dialog.showModal();window.dispatchEvent(new window.Event('resize'));}
export function mountWorkspace(drawChart){
  document.body.classList.add('clean-workspace');
  const css=document.createElement('link');css.rel='stylesheet';css.href='/workspace.css';document.head.append(css);
  const aside=document.querySelector('.controls');
  const groups=[['Escenario y demanda','.control-panel,.estimation-panel'],['Calles y señalización','#roadEditorPanel'],['Cruce y sensores','.junction-panel,.movement-panel'],['Coordinación y cupos','.coordination-panel'],['Estado de la red','.pirro-panel']];
  for(const [label,selector] of groups){const nodes=[...document.querySelectorAll(selector)];if(!nodes.length)continue;const fold=document.createElement('details');fold.className='workspace-fold';const heading=document.createElement('summary');heading.textContent=label;fold.append(heading);nodes.forEach(n=>fold.append(n));aside.append(fold);}
  document.getElementById('editorScenario')?.remove();
  dialog=document.createElement('dialog');dialog.id='resultsDialog';dialog.setAttribute('aria-labelledby','resultsTitle');dialog.innerHTML='<div class="results-heading"><div><p class="eyebrow">FIJO / COORDINADO</p><h2 id="resultsTitle">¿Qué cambió con esta prueba?</h2></div><button type="button" id="closeResults" aria-label="Cerrar resultados">Cerrar ✕</button></div><p id="resultVerdict" role="status"></p><p class="tiny">Porcentaje favorable: positivo = mejora; negativo = empeora. Misma demanda y duración. Son resultados del modelo, no una medición de beneficio en la calle.</p><div id="resultBars"></div>';
  dialog.append(document.querySelector('.chart-panel'),document.querySelector('.comparison-panel'));document.body.append(dialog);
  summary=document.getElementById('resultVerdict');bars=document.getElementById('resultBars');document.getElementById('closeResults').onclick=()=>dialog.close();
  const tools=document.createElement('div');tools.className='workspace-actions';tools.innerHTML='<button type="button" id="viewResults">Ver resultados ↗</button><button type="button" id="workspaceRestart">Reiniciar</button><p>Abre una sección para ajustar la prueba.</p>';aside.prepend(tools);
  document.getElementById('viewResults').onclick=()=>{openResults();drawChart();};document.getElementById('workspaceRestart').onclick=()=>document.getElementById('restart').click();
  if(!document.querySelector('.editor-map-toolbar')){const toolbar=document.createElement('div');toolbar.className='workspace-playback';for(const id of ['play','finish','clock','rate'])toolbar.append(document.getElementById(id));document.querySelector('.map-header').after(toolbar);}
}

