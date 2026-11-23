/** Install in a SEPARATE Apps Script project, not the registrations project. */
function doPost(e) {
 try {
  var p=PropertiesService.getScriptProperties(), secret=p.getProperty('RECRUIT_STORE_SECRET');
  var raw=JSON.parse(e.postData.contents);
  if(!secret||secret.length<32||raw.secret!==secret)return recruitmentJson_({ok:false,error:'Access denied.'});
  if(['list','save'].indexOf(raw.action)<0)throw new Error('Unknown action.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
   var book=SpreadsheetApp.openById(p.getProperty('RECRUIT_SHEET_ID'));
   var sh=book.getSheetByName('Recruitment')||book.insertSheet('Recruitment');
   if(!sh.getLastRow())sh.appendRow(['ID','Record JSON']);
   var values=sh.getDataRange().getValues(), records=[];
   for(var i=1;i<values.length;i++)if(values[i][1])records.push(JSON.parse(values[i][1]));
   if(raw.action==='list')return recruitmentJson_({ok:true,prospects:records});
   var item=raw.prospect;
   if(!item||!item.reviewed||!item.name)throw new Error('Reviewed prospect required.');
   if(JSON.stringify(item).length>18000)throw new Error('Record too large.');
   var row=0, old=null;
   for(var j=0;j<records.length;j++){
    if(item.id&&records[j].id===item.id){row=j+2;old=records[j];}
    else if((item.placeId&&records[j].placeId===item.placeId)||(!item.id&&String(records[j].name).toLowerCase()===String(item.name).toLowerCase()&&String(records[j].area).toLowerCase()===String(item.area).toLowerCase()))throw new Error('Prospect already exists. Open the existing record.');
   }
   if(item.id&&!old)throw new Error('Prospect not found.');
   if(old&&Number(raw.version)!==old.version)throw new Error('This prospect changed. Refresh before editing.');
   item.id=old?old.id:Utilities.getUuid();item.version=old?old.version+1:1;
   item.createdAt=old?old.createdAt:new Date().toISOString();item.updatedAt=new Date().toISOString();
   if(row)sh.getRange(row,1,1,2).setValues([[item.id,JSON.stringify(item)]]);
   else sh.appendRow([item.id,JSON.stringify(item)]);
   return recruitmentJson_({ok:true,prospect:item});
  }finally{lock.releaseLock();}
 }catch(err){return recruitmentJson_({ok:false,error:String(err.message||err)});}
}
function recruitmentJson_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
