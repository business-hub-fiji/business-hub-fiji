const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {createRequire}=require('node:module');const path=require('node:path');const {JSDOM}=require('jsdom');
test('pending saves and drafts lock editing, switching and logout; duplicate requests suppressed',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test/recruit'});global.window=dom.window;global.document=dom.window.document;global.HTMLElement=dom.window.HTMLElement;global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=require('react');const {createRoot}=require('react-dom/client');const {act}=React;
 const lead={id:'a',version:1,name:'Business A',area:'Lautoka',stage:'Found',websiteCheck:'Unknown',reviewed:true,draft:''};const leads=[lead,{...lead,id:'b',name:'Business B'}];let waiting=null,drafts=0;
 global.fetch=async(_url,opts)=>{const d=JSON.parse(opts.body);let data;if(d.action==='status')data={storage:true,discovery:false,ai:false};else if(d.action==='list')data={ok:true,prospects:leads};else if(d.action==='save'||d.action==='draft'){if(d.action==='draft')drafts++;return new Promise(resolve=>{waiting=()=>resolve({ok:true,json:async()=>d.action==='save'?{ok:true,prospect:{...d.prospect,version:2}}:{draft:'Two-month offer',source:'Template'}});});}else throw Error(d.action);return {ok:true,json:async()=>data};};
 const src=fs.readFileSync('app/recruit/page.js','utf8');const code=require('next/dist/build/swc').transformSync(src,{jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,fetch:global.fetch,require:createRequire(path.resolve('app/recruit/page.js'))});const root=createRoot(document.getElementById('root'));
 const button=t=>[...document.querySelectorAll('button')].find(x=>x.textContent===t);const click=async b=>act(async()=>{b.click();await Promise.resolve();});
 try{
  await act(async()=>root.render(React.createElement(mod.exports.default)));await click(button('Open workspace'));assert.ok(button('Save prospect'));
  await click(button('Open prospect'));assert.equal(document.querySelector('input').value,'Lautoka');
  await click(button('Save prospect'));assert.ok(waiting);assert.equal(document.querySelector('fieldset').disabled,true);
  for(const text of ['New prospect','Lock workspace','Open prospect']){const b=button(text);assert.equal(b.matches(':disabled'),true);b.click();}
  assert.equal([...document.querySelectorAll('input')].find(x=>x.value==='Business A')?.value,'Business A');
  await act(async()=>{waiting();await Promise.resolve();});assert.equal(document.querySelector('fieldset').disabled,false);assert.ok(button('Save prospect'));
  const draftButton=button('Prepare template');await act(async()=>{draftButton.click();draftButton.click();await Promise.resolve();});assert.equal(drafts,1);assert.equal(document.querySelector('fieldset').disabled,true);assert.ok([...document.querySelectorAll('textarea')].every(x=>x.matches(':disabled')));
  await act(async()=>{waiting();await Promise.resolve();});assert.equal(document.querySelector('fieldset').disabled,false);assert.ok([...document.querySelectorAll('textarea')].some(x=>x.value==='Two-month offer'));
 }finally{await act(async()=>root.unmount());dom.window.close();delete global.window;delete global.document;delete global.HTMLElement;delete global.IS_REACT_ACT_ENVIRONMENT;delete global.fetch;}
});
