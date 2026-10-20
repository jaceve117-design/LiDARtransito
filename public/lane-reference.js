// Lane observations supplied by the user on 20 October 2026.
// Kept separate from the municipal source and applied only to the vector preview.
export function applyLaneReference(layout,net){
 if(layout.laneReference===1)return confirmConnector(layout,net);
 const put=(id,from,forward,reverse=0)=>{const e=net.edges.find(e=>e.roadId===id);if(!e)return;layout.streets[id]={from:from??e.from,forward,reverse,width:3.25};};
 for(const id of [15,27,29,30,32]){const e=net.edges.find(e=>e.roadId===`road-${id}`);const a=net.byId.get(e.from),b=net.byId.get(e.to);put(e.roadId,a.y>b.y?e.from:e.to,2);}
 for(const id of [34,36,39,41,43,46,49,51,54])put(`road-${id}`,null,3);
 put('road-1','mh-31',3);put('road-2','mh-0',2);
 put('road-26','mh-702',3);
 for(const id of [114,115,434,499,527,576,630,672]){const e=net.edges.find(e=>e.roadId===`road-${id}`),a=net.byId.get(e.from),b=net.byId.get(e.to);put(e.roadId,a.y<b.y?e.from:e.to,2);}
 put('road-28','mh-665',2);
 // The southeast road carries two eastbound lanes; the northern approach two westbound.
 for(const id of [0,3,5,7,9,11,13]){const e=net.edges.find(e=>e.roadId===`road-${id}`);if(!e)continue;put(e.roadId,e.points[0][0]<e.points.at(-1)[0]?e.from:e.to,2);}
 for(const id of [37,488])put(`road-${id}`,null,2,2);
 // Follow each named avenue westwards through the central grid (up to eight blocks).
 function avenue(seed,east){let e=net.edges.find(e=>e.roadId===`road-${seed}`),visited=new Set();for(let i=0;e&&i<8;i++){
  const a=net.byId.get(e.from),b=net.byId.get(e.to),west=a.x<b.x?a:b,eastNode=a.x<b.x?b:a;
  put(e.roadId,east?west.id:eastNode.id,2);visited.add(e.roadId);
  e=net.edges.filter(r=>!visited.has(r.roadId)&&(r.from===west.id||r.to===west.id)).find(r=>{const other=net.byId.get(r.from===west.id?r.to:r.from);return other.x<west.x-8&&Math.abs(other.y-west.y)<15;});
 }}
 for(const [seed,east]of [[33,true],[35,false],[38,true],[40,false],[42,true],[45,false],[48,true],[50,false],[53,true],[56,false],[58,false]])avenue(seed,east);
 avenue(435,true);
 for(const id of [433,438,31])put(`road-${id}`,null,1,1);
 put('road-4',null,0,0); // Upper diagonal removed at the user's request.
 put('road-60',null,1,1);
 layout.reviewRoads=['road-433'];
 layout.laneTurns={
  'road-1-r':{'road-0-f':[0],'road-2-f':[1,2]},
  'road-26-r':{'road-1-r':[2],'road-23-r':[0,1]},
  'road-54-f':{'road-58-f':[1,2],'road-57-f':[0]}
 };
 layout.laneReference=1;return confirmConnector(layout,net);
}

// Confirmation supersedes the provisional 4/16 note without resetting other edits.
function confirmConnector(layout,net){
 if(layout.connectorConfirmed===1)return layout;
 for(const id of ['road-433','road-438','road-31']){
  const e=net.edges.find(e=>e.roadId===id),saved=layout.streets[id];
  layout.streets[id]={from:saved?.from??e.from,forward:1,reverse:1,width:saved?.width??3.25};
 }
 layout.reviewRoads=(layout.reviewRoads??[]).filter(id=>!['road-433','road-438','road-31'].includes(id));
 layout.connectorConfirmed=1;return layout;
}
