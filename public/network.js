// Schematic, not a survey: change this file when street directions and geometry are verified.
export const CONFIG = {
  label: 'Casco central de Heredia',
  geometry: 'Esquema provisional basado en la imagen aportada. Sin escala cartográfica.',
  metersPerUnit: 1.25,
  speed: 11.11,
  carLength: 4.5,
  minGap: 2.5,
  yellow: 3,
  allRed: 1,
  dt: 0.2,
};
export function createNetwork() {
  const nodes = [], edges = [], byId = new Map(), outgoing = new Map();
  const xs = [175, 320, 465, 610, 755, 900], ys = [145, 265, 385, 505, 625];
  for (let row = 0; row < ys.length; row++) for (let col = 0; col < xs.length; col++) {
    const id = `n${row}-${col}`;
    const names = { 'n2-5': 'Pirro', 'n3-3': 'Estación Heredia', 'n4-2': 'Hospital', 'n2-0': 'Salida San Joaquín', 'n1-2': 'Centro norte', 'n2-3': 'Centro', 'n3-1': 'Centro oeste', 'n4-4': 'Centro sur' };
    const signal = (row === 2 || row === 3 || row === 4 && col === 2 || row === 1 && col === 2);
    const n = { id, x: xs[col] + row * 5, y: ys[row] + col * 3, row, col, name: names[id] || `Cruce ${row + 1}.${col + 1}`, signal, boundary: false };
    nodes.push(n); byId.set(id,n); outgoing.set(id,[]);
  }
  function edge(from,to) {
    const a=byId.get(from),b=byId.get(to),length=Math.hypot(a.x-b.x,a.y-b.y)*CONFIG.metersPerUnit;
    const e={id:`${from}>${to}`,from,to,length,axis:Math.abs(a.x-b.x)>Math.abs(a.y-b.y)?'H':'V'};
    edges.push(e);outgoing.get(from).push(e);
  }
  function pair(a,b) { edge(a,b);edge(b,a); }
  for (const n of [...nodes]) {
    if(n.col<5){const other=`n${n.row}-${n.col+1}`;if(n.row===0||n.row===4)pair(n.id,other);else if(n.row%2)edge(n.id,other);else edge(other,n.id);}
    if(n.row<4){const other=`n${n.row+1}-${n.col}`;if(n.col===0||n.col===5)pair(n.id,other);else if(n.col%2)edge(n.id,other);else edge(other,n.id);}
  }
  const boundaries=[];
  function boundary(id,target,x,y,side,name) {
    const n={id,x,y,side,name,boundary:true,signal:false};nodes.push(n);byId.set(id,n);outgoing.set(id,[]);boundaries.push(n);pair(id,target);
  }
  for(let r=0;r<5;r++) {
    boundary(`W${r}`,`n${r}-0`,45,ys[r]+r*0, 'O','Oeste · hacia San Joaquín');
    boundary(`E${r}`,`n${r}-5`,1100,ys[r]+15,'E','Este · Pirro / San Pablo');
  }
  for(let c=0;c<6;c++) {
    boundary(`N${c}`,`n0-${c}`,xs[c],45,'N','Norte');
    boundary(`S${c}`,`n4-${c}`,xs[c]+20,750,'S','Sur · entorno hospital');
  }
  return { nodes,edges,byId,outgoing,boundaries,edgeById:new Map(edges.map(e=>[e.id,e])) };
}
export function shortestPath(network,origin,destination,cost=()=>0) {
  const distances=new Map([[origin,0]]),prev=new Map(),remaining=new Set(network.nodes.map(n=>n.id));
  while(remaining.size) {
    let current=null,best=Infinity;
    for(const id of remaining){const d=distances.get(id)??Infinity;if(d<best){current=id;best=d;}}
    if(current===null)break;
    if(current===destination)break;
    remaining.delete(current);
    for(const e of network.outgoing.get(current)) {
      if(network.byId.get(e.to).boundary && e.to!==destination)continue;
      const d=best+e.length/CONFIG.speed+cost(e);
      if(d<(distances.get(e.to)??Infinity)){distances.set(e.to,d);prev.set(e.to,e);}
    }
  }
  const result=[];let at=destination;
  while(at!==origin){const e=prev.get(at);if(!e)return [];result.unshift(e.id);at=e.from;}
  return result;
}
