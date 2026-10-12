import { cp,mkdir,rm } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve('.'),dist=resolve('dist');if(dist!==resolve(root,'dist'))throw new Error('Destino inválido');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});await cp('public',dist,{recursive:true});console.log('Sitio preparado en dist/');
