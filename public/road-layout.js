import { CONFIG, createNetwork } from './network.js';
export const LAYOUT_KEY='lidar-heredia-road-layout-v1';
export function defaultApproach(edge){return {crosswalk:edge.length>=16,stopDistance:Math.max(1,Math.min(6,edge.length-2.6)),crosswalkNear:6,crosswalkWidth:3,stopGap:1.2,lineWidth:.4,poleBack:10,poleSide:1,confirmed:false};}
export function approachLayout(layout,edge){return {...defaultApproach(edge),...layout?.approaches?.[edge.id]};}
export function layoutStopDistance(layout,edge){const saved=layout?.approaches?.[edge.id];if(!saved)return CONFIG.stopDistance;const a=approachLayout(layout,edge);return Math.min(edge.length-.1,Math.max(0,(a.crosswalk?a.crosswalkNear+a.crosswalkWidth+a.stopGap:a.stopDistance??6)+CONFIG.carLength/2));}
export function validateLayout(value,network){
 if(!value||value.version!==1||typeof value.approaches!=='object'||!value.approaches||typeof value.nodes!=='object'||!value.nodes||typeof value.roads!=='object'||!value.roads)throw Error('El archivo no es un ajuste vial compatible.');
 const v=structuredClone(value);if(!Number.isFinite(v.laneWidth)||v.laneWidth<2.5||v.laneWidth>4.5)throw Error('Ancho de carril: entre 2,5 y 4,5 m.');
 v.streets??={};if(typeof v.streets!=='object'||Array.isArray(v.streets))throw Error('Configuración de calles inválida.');
 for(const [id,r]of Object.entries(v.streets)){if(!network.edges.some(e=>e.roadId===id&&(e.from===r.from||e.to===r.from))||![r.forward,r.reverse].every(n=>Number.isInteger(n)&&n>=0&&n<=3)||r.forward+r.reverse<0||!Number.isFinite(r.width)||r.width<2.5||r.width>4.5)throw Error('Carriles o ancho inválidos: '+id);}
 const checkedNetwork=v.vector?createNetwork(v):network;
 for(const [id,a]of Object.entries(v.approaches)){
  const e=checkedNetwork.edgeById.get(id);if(!e)throw Error('Acceso desconocido: '+id);v.approaches[id]={...defaultApproach(e),...a};
  if(a.control!==undefined&&!['inherit','stop','yield','free'].includes(a.control))throw Error('Control inválido.');
  if(typeof a.crosswalk!=='boolean')throw Error('Paso peatonal inválido.');
  for(const [key,min,max]of [['crosswalkNear',1,40],['crosswalkWidth',2,8],['stopGap',.2,6],['lineWidth',.2,1],['poleBack',0,45],['poleSide',.6,10],['stopDistance',1,45]])if(a[key]!==undefined&&(!Number.isFinite(a[key])||a[key]<min||a[key]>max))throw Error('Medida fuera de rango: '+key);
  const distance=a.crosswalk?a.crosswalkNear+a.crosswalkWidth+a.stopGap:a.stopDistance??6;
  if(distance+CONFIG.carLength/2>=e.length)throw Error('La línea de detención queda fuera del tramo. Reduce la distancia.');
 }
 for(const [id,n]of Object.entries(v.nodes)){if(!network.byId.has(id)||![n.x,n.y].every(Number.isFinite)||n.x<0||n.x>2048||n.y<0||n.y>1200)throw Error('Coordenada de cruce inválida.');v.nodes[id]={x:n.x,y:n.y};}
 for(const [id,r]of Object.entries(v.roads))if(!network.edges.some(e=>e.roadId===id&&(e.from===r.from||e.to===r.from))||!Array.isArray(r.points)||r.points.length<2||r.points.length>300||r.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>2048||p[1]<0||p[1]>1200))throw Error('Geometría de calle inválida.');
 return v;
}
export function freshLayout(){return {version:1,laneWidth:3.25,approaches:{},nodes:{},roads:{},streets:{},note:'Borrador de calibración. Posiciones y anchos no levantados en campo.'};}
