import directory from '../../../lib/shopify-directory.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try {const result=await directory.list(process.env.SHOPIFY_DIRECTORY_MERCHANTS,process.env,fetch);return Response.json(result,{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});}
 catch{return Response.json({offers:[],connected:false,error:'Seller listings are temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
