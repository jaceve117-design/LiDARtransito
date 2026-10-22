import test from 'node:test';
import assert from 'node:assert/strict';
import {verdict} from '../public/workspace.js';
const rows=values=>values.map(cambio_favorable_porcentaje=>({cambio_favorable_porcentaje}));
test('Comparison distinguishes mixed, beneficial, adverse and undefined outcomes',()=>{
 assert.equal(verdict(rows([4,-2,0])),'Resultado mixto');
 assert.equal(verdict(rows([4,0,null])),'Mejora en las métricas comparadas');
 assert.equal(verdict(rows([-2,0,null])),'El control fijo obtuvo mejores resultados');
 assert.equal(verdict(rows([null,null])),'Sin base suficiente para comparar');
 assert.equal(verdict(rows([0,0])),'Sin diferencia en las métricas comparadas');
});
