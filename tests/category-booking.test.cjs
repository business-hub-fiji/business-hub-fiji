const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const catalog=require('../public/shop-categories.js');
const booking=require('../public/booking-request.js');
const now=new Date('2026-11-26T14:00:00Z'); // 27 November, 02:00 in Fiji.
const business={name:'Example Test Business',phone:'+679 9999999'};
const base={name:'Test Customer',contact:'customer@example.test',service:'Test service',start:'2026-11-28',end:'2026-11-29',time:'09:00',endTime:'10:00',people:'2',units:'1',notes:'Test only',consent:true};
test('twenty-two categories match registration, product editing, offer filters and backend',()=>{
 const categories=catalog.categories;assert.equal(categories.length,22);assert.equal(new Set(categories).size,22);
 for(const name of ['Fish & food','Supermarket & grocery','Restaurant & takeaway','Hardware & building','Land development & civil works','Land surveying','Land consultancy','Car rental','Carwash','Transport & delivery','Clothing & retail','Other services'])assert.ok(categories.includes(name),name);
 for(const [path,id] of [['public/register.html','category'],['public/dashboard.html','p-main-category'],['public/market.html','offer-category']]){
  const dom=new JSDOM(fs.readFileSync(path,'utf8'));const labels=[...dom.window.document.getElementById(id).options].filter(o=>o.value).map(o=>o.value);
  assert.deepEqual(labels.slice().sort(),categories.slice().sort(),path);dom.window.close();
 }
 const source=fs.readFileSync('apps-script/Code.gs','utf8');const list=JSON.parse(source.match(/var CATEGORY_LIST = (\[[\s\S]*?\]);/)[1]);assert.deepEqual(list,categories);
 assert.deepEqual(catalog.groups.flatMap(g=>g.cats),categories);
 assert.ok(catalog.suggestions('Furniture & homeware').includes('Delivery & assembly'));
});
test('stay requests contain proper dates and destination without claiming a reservation',()=>{
 const result=booking.build(base,business,'stay',now);const url=new URL(result.url);
 assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/6799999999');
 assert.match(result.message,/Check-in: 2026-11-28/);assert.match(result.message,/Check-out: 2026-11-29/);assert.match(result.message,/not a confirmed reservation/);assert.match(result.message,/No payment has been made/);
 assert.equal(url.searchParams.get('text'),result.message);assert.doesNotMatch(result.message,/at 09:00/);
});
test('Fiji dates, impossible dates, past times and invalid ranges are rejected',()=>{
 assert.equal(booking.fijiNow(now).date,'2026-11-27');
 for(const data of [{start:'2026-02-30'},{start:'2026-11-26'},{end:'2026-11-28'},{people:'0'},{people:'1.5'},{units:'21'},{consent:false}])assert.throws(()=>booking.build({...base,...data},business,'stay',now));
 assert.throws(()=>booking.build({...base,start:'2026-11-27',time:'01:00'},business,'appointment',now),/future Fiji time/);
 assert.throws(()=>booking.build({...base,time:'25:00'},business,'appointment',now));
});
test('rentals allow same-day returns only after pickup',()=>{
 assert.ok(booking.build({...base,end:base.start},business,'rental',now).url);
 assert.throws(()=>booking.build({...base,end:base.start,endTime:'08:00'},business,'rental',now),/after pickup/);
 assert.throws(()=>booking.build({...base,end:'2026-11-27'},business,'rental',now));
 assert.ok(booking.build(base,business,'appointment',now).url);
});
test('unusable phones, unsupported modes and oversized data cannot create links',()=>{
 for(const p of ['', 'javascript:alert(1)', '+6799999999?text=redirect','012345678'])assert.throws(()=>booking.build(base,{...business,phone:p},'stay',now));
 assert.throws(()=>booking.build(base,business,'automatic',now));
 assert.throws(()=>booking.build({...base,notes:'x'.repeat(501)},business,'stay',now));
 assert.throws(()=>booking.build({...base,contact:'a\nb'},business,'stay',now));
});
async function page(response,query='?shop=test-shop'){
 const dom=new JSDOM(fs.readFileSync('public/booking.html','utf8'),{url:'https://example.test/booking.html'+query,runScripts:'outside-only'});
 const w=dom.window;w.AbortSignal=AbortSignal;w.HTMLElement.prototype.scrollIntoView=function(){};
 const requests=[];w.fetch=async(url,options)=>{requests.push({url,options});if(response instanceof Error)throw response;return {ok:true,json:async()=>response};};
 for(const path of ['public/shop-categories.js','public/booking-request.js','public/booking-page.js'])w.eval(fs.readFileSync(path,'utf8'));
 await new Promise(resolve=>setImmediate(resolve));return {dom,w,requests};
}
test('rendered stay, rental and appointment templates prepare only a draft and invalidate stale links',async()=>{
 for(const category of ['Hotels & resorts','Car rental','Salon, barber & spa']){
  const {dom,w,requests}=await page({ok:true,shop:{...business,category,name:'<img src=x onerror=alert(1)>'},products:[]});
  try{
   const d=w.document,$=id=>d.getElementById(id);assert.equal($('request-form').hidden,false,category);
   assert.equal($('time').disabled,category==='Hotels & resorts');
   assert.equal($('end').disabled,category==='Salon, barber & spa');
   const next=new Date(Date.now()+2*86400000),start=booking.fijiNow(next).date,end=booking.fijiNow(new Date(next.getTime()+86400000)).date;
   for(const [id,value] of Object.entries({service:'Test service',customer:'Tester',contact:'test@example.test',start,end,time:'09:00','end-time':'10:00'}))$(id).value=value;
   $('consent').checked=true;$('request-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
   assert.equal($('draft-section').hidden,false,category);assert.match($('draft').value,/not a confirmed reservation/);
   assert.ok($('send').href.startsWith('https://wa.me/6799999999?text='));
   assert.equal(requests.length,1);assert.ok(!requests[0].options.method);assert.equal(d.querySelectorAll('h1 img').length,0);
   $('service').value='Changed';$('service').dispatchEvent(new w.Event('input',{bubbles:true}));
   assert.equal($('draft-section').hidden,true);assert.equal($('send').hasAttribute('href'),false);
  }finally{dom.window.close();}
 }
});
test('paused, missing, disconnected shops and unavailable products fail closed',async()=>{
 for(const [response,query] of [
 [{ok:true,paused:true,shop:business},undefined],[{ok:false},undefined],[new Error('offline'),undefined],
 [{ok:true,shop:{...business,phone:'',category:'Hotels & resorts'},products:[]},undefined],
 [{ok:true,shop:{...business,category:'Hotels & resorts'},products:[]},'?shop=test-shop&product=missing']
 ]){
 const {dom,w}=await page(response,query);assert.equal(w.document.getElementById('request-form').hidden,true);assert.equal(w.document.getElementById('send').hasAttribute('href'),false);dom.window.close();
 }
});
test('selected public product chooses its own booking mode and unsafe scripts do not enter HTML',async()=>{
 const {dom,w}=await page({ok:true,shop:{...business,category:'Other services'},products:[{id:'room',name:'Family room',main_category:'Hotels & resorts',available:true}]},'?shop=test-shop&product=room');
 assert.equal(w.document.getElementById('service').value,'Family room');assert.equal(w.document.getElementById('time').disabled,true);dom.window.close();
 for(const path of ['public/market.html','public/shop.html','public/register.html','public/dashboard.html']){
 const html=fs.readFileSync(path,'utf8');for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1],{filename:path});
 }
});

test('business purchase enquiry carries buyer, quantity and delivery without a false order',()=>{
 const result=booking.build({...base,buyerType:'business',businessName:'Test Civil Works',businessReference:'BHF-261118-924B',fulfilment:'Delivery',location:'Naikabula, Lautoka',units:'40'},business,'purchase',now);
 assert.match(result.message,/Purchase enquiry/);assert.match(result.message,/Buying for my business: Test Civil Works/);assert.match(result.message,/customer provided/);assert.match(result.message,/Items \/ vehicles: 40/);assert.match(result.message,/Naikabula, Lautoka/);assert.match(result.message,/not a confirmed reservation or purchase order/);assert.doesNotMatch(result.message,/Return:|Guests \/ participants/);
 assert.equal(new URL(result.url).pathname,'/6799999999');
});
test('business hire enquiry includes pickup and return for a supplier quotation',()=>{
 const result=booking.build({...base,buyerType:'business',businessName:'Example Builder',fulfilment:'Pickup',units:'2'},business,'rental',now);
 assert.match(result.message,/Hire enquiry/);assert.match(result.message,/Return: 2026-11-29 at 10:00/);assert.match(result.message,/Items \/ vehicles: 2/);
});
test('buyer validation requires business name, checks optional reference and delivery location',()=>{
 for(const data of [{businessName:''},{businessReference:'verified-admin'},{fulfilment:'Delivery',location:''},{units:'0'},{units:'1001'}]){
 assert.throws(()=>booking.build({...base,buyerType:'business',businessName:'Test Business',...data},business,'purchase',now));
 }
 const personal=booking.build({...base,buyerType:'personal',businessName:'Do not include',businessReference:'BAD'},business,'purchase',now);
 assert.doesNotMatch(personal.message,/Do not include|BAD/);
 assert.throws(()=>booking.build({...base,buyerType:'admin'},business,'purchase',now));
});
test('rendered business equipment request toggles purchase and hire, validates delivery and clears stale drafts',async()=>{
 const {dom,w,requests}=await page({ok:true,shop:{...business,category:'Equipment hire'},products:[]});
 try{
 const $=id=>w.document.getElementById(id);
 $('buyer-type').value='business';$('buyer-type').dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal($('buyer-business').required,true);assert.equal($('business-fields').hidden,false);
 $('procurement').value='purchase';$('procurement').dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal($('end').required,false);assert.equal($('units').max,'1000');assert.equal($('people').disabled,true);
 const day=booking.fijiNow(new Date(Date.now()+2*86400000)).date;
 for(const [id,value] of Object.entries({'buyer-business':'Test Buyer','buyer-reference':'BHF-261118-924B',service:'Excavator',customer:'Test Operator',contact:'test@example.test',start:day,time:'09:00',units:'5'}))$(id).value=value;
 $('fulfilment').value='Delivery';$('fulfilment').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal($('location').required,true);$('consent').checked=true;
 $('request-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal($('draft-section').hidden,true);
 $('location').value='Lautoka';$('request-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal($('draft-section').hidden,false);assert.match($('draft').value,/Buying for my business: Test Buyer/);assert.match($('draft').value,/Purchase enquiry/);assert.equal(requests.length,1);
 $('procurement').value='hire';$('procurement').dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal($('end').required,true);assert.equal($('end-time').required,true);assert.equal($('send').hasAttribute('href'),false);
 $('buyer-type').value='personal';$('buyer-type').dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal($('buyer-business').disabled,true);assert.equal($('buyer-business').required,false);
 }finally{dom.window.close();}
});

test('dentists and mechanics have appointment templates rather than a retail purchase flow',async()=>{
 for(const category of ['Dentists & dental clinics','Mechanics & auto repairs']){
 const {dom,w}=await page({ok:true,shop:{...business,category},products:[]});
 assert.equal(w.document.getElementById('request-form').hidden,false);
 assert.equal(w.document.getElementById('time').required,true);
 assert.equal(w.document.getElementById('end').disabled,true);
 assert.equal(w.document.getElementById('procurement').disabled,true);
 if(category.startsWith('Dentists'))assert.match(w.document.getElementById('notes').placeholder,/Do not enter symptoms/);
 dom.window.close();
 }
});
test('sole trader can choose an industry and is recorded privately without changing consumer registration',()=>{
 const html=fs.readFileSync('public/register.html','utf8'),dom=new JSDOM(html);
 const selector=dom.window.document.getElementById('structure');
 assert.ok([...selector.options].some(x=>x.value==='Sole trader'));
 assert.ok(dom.window.document.getElementById('category').querySelector('option').parentElement!==selector);
 const fn=html.match(/function collect\(ref\)\{[\s\S]*?return data;\s*\}/)[0];
 const values={structure:'Sole trader',notes:'Private registration note',bizname:'Example sole trader',regno:'TEST123',category:'Mechanics & auto repairs'};
 const context={role:()=> 'Business',via:()=> 'Email',val:k=>values[k]||'',form:{querySelectorAll:()=>[]},$:()=>({checked:true})};
 vm.runInNewContext(fn+';result=collect("BHF-261127-TEST");',context);
 assert.match(context.result.notes,/Business structure \(self-reported\): Sole trader/);
 assert.equal(context.result.category,'Mechanics & auto repairs');
 context.role=()=> 'Customer';vm.runInNewContext('result=collect("BHF-261127-TEST");',context);
 assert.equal(context.result.notes,'Private registration note');assert.equal(context.result.business_name,undefined);
 dom.window.close();
});
