import { createHash, timingSafeEqual } from 'node:crypto';
import core from '../../../lib/recruitment.cjs';
import recruitmentAI from '../../../lib/recruitment-ai.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function reply(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
function authorized(req){const secret=process.env.RECRUIT_OPERATOR_TOKEN;const value=req.headers.get('authorization')||'';return secret&&secret.length>=32&&timingSafeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update('Bearer '+secret).digest());}
async function jsonFetch(url,options){const r=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('External service request failed. No success has been recorded.');return r.json();}
export async function POST(req){
 if(!authorized(req))return reply({error:'Operator access is unavailable or the access key is incorrect.'},401);
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Origin rejected.'},403);
 try{
  if(Number(req.headers.get('content-length')||0)>20000)return reply({error:'Request too large.'},413);
  const text=await req.text();if(text.length>20000)return reply({error:'Request too large.'},413);const data=JSON.parse(text);
  if(data.action==='status')return reply({storage:!!(process.env.RECRUIT_STORE_URL&&process.env.RECRUIT_STORE_SECRET),discovery:!!process.env.GOOGLE_PLACES_API_KEY,ai:recruitmentAI.configuration(process.env).ready,aiProvider:recruitmentAI.configuration(process.env).provider});
  if(data.action==='discover'){
   if(!process.env.GOOGLE_PLACES_API_KEY)throw Error('Google Places connection needs setup. Manual prospect entry is available.');
   const area=String(data.area||'').trim().slice(0,120),type=String(data.type||'').trim().slice(0,100);if(!area||!type)throw Error('Enter an area and business type.');
   const result=await jsonFetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':process.env.GOOGLE_PLACES_API_KEY,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.attributions,nextPageToken'},body:JSON.stringify({textQuery:type+' in '+area+', Fiji',pageSize:10,...(data.pageToken?{pageToken:String(data.pageToken).slice(0,3000)}:{})})});
   return reply({places:result.places||[],pageToken:result.nextPageToken||''});
  }
  if(data.action==='draft'){
   const p=core.validate(data.prospect);if(p.stage==='Declined')throw Error('This business declined. Do not prepare further outreach.');
   const base=core.offer(p);
   if(!data.ai)return reply({draft:base,source:'Template'});
   return reply(await recruitmentAI.draft(p,base,process.env));
  }
  if(!['list','save'].includes(data.action))throw Error('Unknown action.');
  if(!process.env.RECRUIT_STORE_URL||!process.env.RECRUIT_STORE_SECRET)throw Error('Private prospect storage needs setup; nothing has been saved.');
  const url=new URL(process.env.RECRUIT_STORE_URL);if(url.origin!=='https://script.google.com'||!url.pathname.startsWith('/macros/s/'))throw Error('Invalid storage connection.');
  const prospect=data.action==='save'?core.validate(data.prospect):undefined;
  const result=await jsonFetch(url.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:data.action,secret:process.env.RECRUIT_STORE_SECRET,prospect,version:data.version})});
  if(!result.ok)throw Error(result.error||'Storage did not confirm success.');return reply(result);
 }catch(e){return reply({error:e.message||'Request failed.'},400);}
}

