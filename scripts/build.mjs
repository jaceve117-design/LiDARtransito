import { cp,mkdir,rm,readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve('.'),dist=resolve('dist');if(dist!==resolve(root,'dist'))throw new Error('Destino inválido');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});await cp('public',dist,{recursive:true});
const {version}=JSON.parse(await readFile('package.json','utf8'));
const html=await readFile(resolve(dist,'index.html'),'utf8');
await writeFile(resolve(dist,'index.html'),html.replace(/(<span id="projectVersion" class="version-badge">)[^<]+/,'$1v'+version).replace(/Heredia · Versión experimental [\d.]+/,'Heredia · Versión experimental '+version));
console.log('Sitio preparado en dist/');
