const {test}=require('node:test');const assert=require('node:assert/strict');const d=require('../lib/shopify-directory.cjs');const fs=require('node:fs');const {JSDOM}=require('jsdom');
const now=new Date('2026-11-28T00:00:00Z');const env={SHOPIFY_DIRECTORY_TOKEN_TEST:'private-test-token'};
function seller(){return {enabled:true,domain:'test-shop.myshopify.com',tokenEnv:'SHOPIFY_DIRECTORY_TOKEN_TEST',name:'Test Seller',slug:'test-seller',approval:{recordId:'TEST-ONLY',policyVersion:d.POLICY_VERSION,acceptedAt:'2026-11-27',expiresAt:'2027-11-27',authorityConfirmed:true,contentRightsConfirmed:true,storeControlVerified:true},products:[{handle:'table',category:'Furniture & homeware',enabled:true,reviewed:true,generalGoods:true}]};}
function product(){return {handle:'table',title:'Table',availableForSale:true,onlineStoreUrl:'https://test-shop.myshopify.com/products/table',featuredImage:{url:'https://cdn.shopify.com/table.jpg'},priceRange:{minVariantPrice:{amount:'15.00',currencyCode:'FJD'},maxVariantPrice:{amount:'20.00',currencyCode:'FJD'}}};}
test('seller permission, store control and product review fail closed',()=>{
 assert.equal(d.approvedStores('[]',env,now).length,0);
 for(const change of [{revokedAt:'2026-11-28'},{enabled:false},{approval:{}}])assert.equal(d.approvedStores(JSON.stringify([{...seller(),...change}]),env,now).length,0);
 for(const change of [{expiresAt:'2026-11-27'},{acceptedAt:'2027-01-01'},{policyVersion:'old'},{authorityConfirmed:false},{contentRightsConfirmed:false},{storeControlVerified:false}]){const s=seller();Object.assign(s.approval,change);assert.equal(d.approvedStores(JSON.stringify([s]),env,now).length,0);}
 const s=seller();s.products[0].reviewed=false;assert.equal(d.approvedStores(JSON.stringify([s]),env,now)[0].products.length,0);
});
test('malicious endpoints and handles never reach the network',async()=>{
 for(const domain of ['127.0.0.1','test-shop.myshopify.com.evil.test','test-shop.myshopify.com@evil.test','https://test-shop.myshopify.com'])assert.throws(()=>d.approvedStores(JSON.stringify([{...seller(),domain}]),env,now));
 const s=seller();s.products[0].handle='x") { secret }';let calls=0;const r=await d.list(JSON.stringify([s]),env,async()=>{calls++;},now);assert.equal(calls,0);assert.equal(r.offers.length,0);
});
test('live product output preserves seller, currency and attribution without secrets',async()=>{
 let options,url;const r=await d.list(JSON.stringify([seller()]),env,async(u,o)=>{url=u;options=o;return {ok:true,text:async()=>JSON.stringify({data:{p0:product()}})};},now);
 assert.equal(url,'https://test-shop.myshopify.com/api/2026-10/graphql.json');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(r.offers[0].business,'Test Seller');assert.equal(r.offers[0].currency,'FJD');assert.equal(r.offers[0].maxPrice,'20.00');assert.equal(JSON.stringify(r).includes('private-test-token'),false);assert.equal(JSON.stringify(r).includes('TEST-ONLY'),false);
 const p=product();p.onlineStoreUrl+='?shclid=keep';assert.ok(d.normalise(p,seller(),seller().products[0],now).url.endsWith('?shclid=keep'));
});
test('missing, unavailable and unsafe products are not advertised',()=>{
 for(const change of [{availableForSale:false},{onlineStoreUrl:'javascript:alert(1)'},{onlineStoreUrl:'https://evil.test/products/table'},{onlineStoreUrl:'https://test-shop.myshopify.com/products/another'},{handle:'another'},{priceRange:{}}])assert.equal(d.normalise({...product(),...change},seller(),seller().products[0],now),null);
 const p=product();p.featuredImage.url='https://evil.test/track';assert.equal(d.normalise(p,seller(),seller().products[0],now).image,'');
});
test('API outages and GraphQL errors hide products without stale fallback',async()=>{
 for(const f of [async()=>{throw Error('private-test-token')},async()=>({ok:false}),async()=>({ok:true,text:async()=>JSON.stringify({errors:[{message:'private-test-token'}]})})]){const r=await d.list(JSON.stringify([seller()]),env,f,now);assert.equal(r.offers.length,0);assert.equal(r.unavailable,1);assert.ok(!JSON.stringify(r).includes('private-test-token'));}
});
test('directory UI uses text safely, labels sponsored content and filters by category and seller',async()=>{
 const dom=new JSDOM('<section id="shopify-directory"></section>',{url:'https://bhf.test/shop/test-seller',runScripts:'outside-only'});const w=dom.window;let timer;w.setTimeout=fn=>{timer=fn};w.ShopCategories=require('../public/shop-categories.js');
 const a={...d.normalise(product(),seller(),seller().products[0],new Date()),title:'<img src=x onerror=alert(1)>',sponsored:true};
 w.fetch=async()=>({ok:true,json:async()=>({connected:true,offers:[a,{...a,id:'other',slug:'other'}]})});w.eval(fs.readFileSync('public/shopify-directory.js','utf8'));await new Promise(r=>setImmediate(r));
 assert.equal(w.document.querySelectorAll('article').length,1);assert.equal(w.document.querySelectorAll('h3 img').length,0);assert.match(w.document.body.textContent,/Sponsored listing/);assert.match(w.document.body.textContent,/From FJD 15.00/);
 const s=w.document.querySelector('select');s.value='Hardware & building';s.dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('article').length,0);s.value='';s.dispatchEvent(new w.Event('change'));timer();assert.equal(w.document.querySelectorAll('article a').length,0);dom.window.close();
});
