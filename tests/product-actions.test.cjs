const {test}=require('node:test');const assert=require('node:assert/strict');const {remove}=require('../public/product-actions.js');
test('confirmed delete does not issue another request',async()=>{let n=0;const r=await remove(async()=>{n++;return {ok:true,products:[]};},'token','p');assert.equal(r.ok,true);assert.equal(n,1);});
test('lost response reconciles committed deletion without another write',async()=>{const actions=[];const r=await remove(async req=>{actions.push(req.action);if(req.action==='product_delete')throw Error('connection lost');return {ok:true,products:[{id:'other'}]};},'token','p');assert.equal(r.reconciled,true);assert.deepEqual(actions,['product_delete','shop_get']);});
test('existing product never reported deleted',async()=>{const r=await remove(async req=>req.action==='product_delete'?{ok:false,error:'Failed'}:{ok:true,products:[{id:'p'}]},'token','p');assert.equal(r.ok,false);assert.equal(r.products.length,1);});
test('unconfirmed response requires refresh and expired session stops',async()=>{const r=await remove(async()=>({ok:false}),'token','p');assert.equal(r.uncertain,true);let n=0;const e=await remove(async()=>{n++;return {expired:true,ok:false};},'token','p');assert.equal(e.expired,true);assert.equal(n,1);});

const {save}=require('../public/product-actions.js');
const request={action:'product_save',token:'test-token',id:'p',name:'Scheme plan drafting',description:'Putting ideas in a Plan',price:'',available:true,main_category:'Land development & civil works',category:'Planning & Scheme Plans',comparison:{brand:'True Boundary',quantity:'',delivery:''}};
const saved={...request,price:'',comparison:{...request.comparison}};
test('lost save response verifies every edited field without a second write',async()=>{
 const actions=[];const r=await save(async req=>{actions.push(req.action);if(req.action==='product_save')return {ok:false,uncertain:true};return {ok:true,products:[saved]};},request);
 assert.equal(r.reconciled,true);assert.deepEqual(actions,['product_save','shop_get']);
});
test('stale fields cannot produce a false save confirmation',async()=>{
 for(const field of ['name','category','main_category','description','price','available','comparison']){
 const stale={...saved,[field]:field==='available'?false:field==='comparison'?{brand:'other'}:'wrong'};
 const r=await save(async req=>req.action==='product_save'?{ok:false,uncertain:true}:{ok:true,products:[stale]},request);
 assert.equal(r.ok,false,field);assert.equal(r.uncertain,true);
 }
});
test('new products and photo writes remain uncertain instead of matching by name',async()=>{
 for(const req of [{...request,id:''},{...request,photo:'image'},{...request,remove_photo:true}]){
 let writes=0;const r=await save(async x=>{if(x.action==='product_save'){writes++;throw Error('lost');}return {ok:true,products:[saved]};},req);
 assert.equal(r.uncertain,true);assert.equal(writes,1);
 }
});
test('known rejection and expired session stop, malformed success is reconciled safely',async()=>{
 let n=0;const r=await save(async()=>{n++;return {ok:false,error:'Invalid price'};},request);assert.equal(n,1);assert.equal(r.error,'Invalid price');
 const e=await save(async()=>({ok:false,expired:true}),request);assert.equal(e.expired,true);
 const x=await save(async q=>q.action==='product_save'?{ok:true}:{ok:true,products:[saved]},request);assert.equal(x.reconciled,true);
 const y=await save(async()=>{throw Error('offline');},request);assert.equal(y.uncertain,true);
});
