'use strict';
const categories=require('../public/shop-categories.js').categories;
const POLICY_VERSION='2026-11-28';
const API_VERSION='2026-10';
function approvedStores(raw,env,now=new Date()){
 const entries=JSON.parse(raw||'[]');if(!Array.isArray(entries)||entries.length>10)throw Error('Invalid directory configuration');
 return entries.filter(s=>s&&s.enabled===true&&!s.revokedAt).map(s=>{
  if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s.domain||'')||!/^SHOPIFY_DIRECTORY_TOKEN_[A-Z0-9_]+$/.test(s.tokenEnv||'')||!env[s.tokenEnv])throw Error('Invalid merchant connection');
  if(!/^[a-z0-9-]{1,80}$/.test(s.slug||'')||typeof s.name!=='string'||!s.name.trim()||s.name.length>120)throw Error('Invalid seller identity');
  const a=s.approval||{};const at=Date.parse(a.acceptedAt),until=Date.parse(a.expiresAt);
  if(a.policyVersion!==POLICY_VERSION||!a.recordId||typeof a.recordId!=='string'||!Number.isFinite(at)||at>now.getTime()||!Number.isFinite(until)||until<=now.getTime()||a.authorityConfirmed!==true||a.contentRightsConfirmed!==true||a.storeControlVerified!==true)return null;
  if(!Array.isArray(s.products)||s.products.length>20)throw Error('Invalid approved products');
  const products=s.products.filter(p=>p&&p.enabled===true&&p.reviewed===true&&p.generalGoods===true&&/^[a-z0-9-]{1,150}$/.test(p.handle||'')&&categories.includes(p.category));
  return {...s,products};
 }).filter(Boolean);
}
function normalise(product,seller,approved,now){
 if(!product||!product.availableForSale||product.handle!==approved.handle||typeof product.title!=='string'||!product.title.trim()||product.title.length>300)return null;
 const price=product.priceRange?.minVariantPrice,max=product.priceRange?.maxVariantPrice;
 if(!price||!max||!/^[A-Z]{3}$/.test(price.currencyCode)||max.currencyCode!==price.currencyCode||![price.amount,max.amount].every(v=>/^\d+(\.\d{1,6})?$/.test(String(v))&&Number.isFinite(Number(v)))||Number(price.amount)>Number(max.amount))return null;
 let url;try{url=new URL(product.onlineStoreUrl);}catch{return null;}
 // Direct seller product pages only; never follow redirects or accept caller-supplied hosts.
 if(url.protocol!=='https:'||url.hostname!==seller.domain||url.port||url.username||url.password||url.pathname!=='/products/'+approved.handle||url.hash)return null;
 let image='';try{const u=new URL(product.featuredImage?.url);if(u.protocol==='https:'&&u.hostname==='cdn.shopify.com'&&!u.port&&!u.username&&!u.password)image=u.href;}catch{}
 return {id:seller.domain+':'+approved.handle,business:seller.name,slug:seller.slug,category:approved.category,title:product.title,price:price.amount,maxPrice:max.amount,currency:price.currencyCode,url:url.href,image,checkedAt:now.toISOString(),sponsored:seller.sponsored===true};
}
async function list(raw,env,fetcher,now=new Date()){
 const sellers=approvedStores(raw,env,now);let unavailable=0;
 const offers=(await Promise.all(sellers.map(async s=>{
  if(!s.products.length)return [];
  const query='query DirectoryProducts{'+s.products.map((p,i)=>`p${i}:product(handle:"${p.handle}"){handle title availableForSale onlineStoreUrl featuredImage{url} priceRange{minVariantPrice{amount currencyCode} maxVariantPrice{amount currencyCode}}}`).join(' ')+'}';
  try{
   const r=await fetcher(`https://${s.domain}/api/${API_VERSION}/graphql.json`,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':env[s.tokenEnv]},body:JSON.stringify({query})});
   if(!r.ok)throw Error('Unavailable');const text=await r.text();if(text.length>250000)throw Error('Response too large');const d=JSON.parse(text);if(d.errors||!d.data)throw Error('Unavailable');
   return s.products.map((p,i)=>normalise(d.data['p'+i],s,p,now)).filter(Boolean);
  }catch{unavailable++;return [];}
 }))).flat();
 return {offers,connected:sellers.length>0,unavailable,checkedAt:now.toISOString()};
}
module.exports={POLICY_VERSION,API_VERSION,approvedStores,normalise,list};
