// Project setup/status helper. Credentials stay in process memory and are never printed.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const account='2e172828ff1ef158fbc525641332955a',name='lidar-transito',mode=process.argv[2]||'status';
let token=process.env.CLOUDFLARE_API_TOKEN;
if(!token){const config=await readFile(join(process.env.APPDATA,'xdg.config','.wrangler','config','default.toml'),'utf8');token=config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];}
if(!token)throw Error('Inicia una sesión con Wrangler o configura CLOUDFLARE_API_TOKEN.');
async function request(method,path,body){const response=await fetch('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await response.json();return {status:response.status,...data};}
const base=`/accounts/${account}/pages/projects`,path=base+'/'+name;
let project=await request('GET',path);
if(mode==='create' && !project.success){
  if(project.status!==404 && !project.errors?.some(e=>e.code===8000007))throw Error(JSON.stringify({status:project.status,errors:project.errors}));
  project=await request('POST',base,{name,production_branch:'main',build_config:{root_dir:'',build_command:'npm test && npm run build',destination_dir:'dist'},deployment_configs:{production:{env_vars:{NODE_VERSION:{type:'plain_text',value:'22'}}},preview:{env_vars:{NODE_VERSION:{type:'plain_text',value:'22'}}}},source:{type:'github',config:{owner:'jaceve117-design',owner_id:'267139609',repo_name:'LiDARtransito',repo_id:'1414960697',production_branch:'main',production_deployments_enabled:true,preview_deployment_setting:'all',pr_comments_enabled:false,deployments_enabled:true,path_includes:['*'],path_excludes:[],preview_branch_includes:[],preview_branch_excludes:[]}}});
}
if(!project.success){console.log(JSON.stringify({status:project.status,success:false,errors:project.errors}));process.exitCode=1;}
else {const p=project.result;console.log(JSON.stringify({success:true,name:p.name,subdomain:p.subdomain,source:p.source?{type:p.source.type,repo:p.source.config.repo_name,production_deployments_enabled:p.source.config.production_deployments_enabled}:null,latest_deployment:p.latest_deployment?{id:p.latest_deployment.id,url:p.latest_deployment.url,latest_stage:p.latest_deployment.latest_stage,commit:p.latest_deployment.deployment_trigger?.metadata?.commit_hash}:null}));}
if(mode==='deployments'){const r=await request('GET',path+'/deployments');console.log(JSON.stringify({success:r.success,deployments:r.result?.slice(0,5).map(d=>({id:d.id,url:d.url,latest_stage:d.latest_stage,commit:d.deployment_trigger?.metadata?.commit_hash})),errors:r.errors}));}
