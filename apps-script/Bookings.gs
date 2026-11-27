/** Booking records are in a separate owner-private spreadsheet. Never replace the rest of Code.gs. */
function bookingCapabilities_(){return {ok:true,enabled:PropertiesService.getScriptProperties().getProperty('BHF_BOOKING_ENABLED')==='1',mode:'owner-confirmed-email',timezone:'Pacific/Fiji'};}
function bookingBook_(){var id=PropertiesService.getScriptProperties().getProperty('BHF_BOOKING_BOOK');if(!id)throw Error('Booking storage needs setup.');return SpreadsheetApp.openById(id).getSheetByName('Booking records');}
function bookingRows_(){var sh=bookingBook_(),v=sh.getDataRange().getValues();return {sheet:sh,rows:v.slice(1).map(function(r,i){return {row:i+2,ref:String(r[0]),state:JSON.parse(Utilities.newBlob(Utilities.base64Decode(r.slice(1).join(''))).getDataAsString())};})};}
function bookingWrite_(sh,row,ref,state){var encoded=Utilities.base64Encode(JSON.stringify(state)),chunks=encoded.match(/.{1,40000}/g)||[''];if(chunks.length>100)throw Error('Booking storage is full. Contact support.');var width=Math.max(chunks.length,sh.getLastColumn()-1);if(width+1>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),width+1-sh.getMaxColumns());while(chunks.length<width)chunks.push('');if(row)sh.getRange(row,2,1,width).setValues([chunks]);else sh.appendRow([ref].concat(chunks));}
function bookingKey_(b,ref){var secret=PropertiesService.getScriptProperties().getProperty('BHF_BOOKING_SECRET');if(!secret)throw Error('Booking security needs setup.');return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(b.id+'|'+ref+'|'+b.nonce,secret)).replace(/=+$/,'');}
function bookingEqual_(a,b){a=String(a||'');b=String(b||'');var diff=a.length^b.length;for(var i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
function bookingFiji_(date,time){var value=String(date||'')+' '+String(time||'');if(!/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Choose valid Fiji dates and times.');var d=Utilities.parseDate(value,'Pacific/Fiji','yyyy-MM-dd HH:mm');if(Utilities.formatDate(d,'Pacific/Fiji','yyyy-MM-dd HH:mm')!==value)throw Error('Choose a valid calendar date.');return d.toISOString();}
function bookingDispatch_(raw){
 if(!bookingCapabilities_().enabled)return {ok:false,error:'Email booking needs setup. Existing WhatsApp enquiries are still available.'};
 if(JSON.stringify(raw).length>6000)return {ok:false,error:'Booking request is too large.'};var writeAttempt=false;var lock=LockService.getScriptLock();if(!lock.tryLock(10000))return {ok:false,error:'Bookings are busy. Retry with the same request reference.'};
 try{
  var now=new Date().toISOString(),data=bookingRows_(),entry,b,customerAction=/^booking_customer_(get|verify|cancel|stop_reminders)$/.test(raw.action||'');
  if(customerAction){
   var id=String(raw.id||'');data.rows.some(function(r){b=r.state.bookings.find(function(x){return x.id===id;});if(b){entry=r;return true;}return false;});
   if(!entry||!bookingEqual_(raw.key,bookingKey_(b,entry.ref)))throw Error('Booking link is invalid or unavailable.');
   if(raw.action==='booking_customer_verify'){var verified=BookingCore.verify(entry.state,b.id,raw.consent===true,now,raw.reminders===true);writeAttempt=true;bookingWrite_(data.sheet,entry.row,entry.ref,verified.state);entry.state=verified.state;b=entry.state.bookings.find(function(x){return x.id===id;});}
   if(raw.action==='booking_customer_stop_reminders'){b.reminders=false;b.version++;b.updated=now;b.events.forEach(function(e){if(/^reminder-/.test(e.kind)&&e.state==='queued')e.state='cancelled';});writeAttempt=true;bookingWrite_(data.sheet,entry.row,entry.ref,entry.state);}
   if(raw.action==='booking_customer_cancel'&&!['Cancelled','Completed'].includes(b.status)){
    var cancelled=BookingCore.execute(entry.state,{action:'booking_cancel',id:b.id,version:b.version,requestId:String(raw.requestId||'')},{now:now,id:function(){return Utilities.getUuid();}});writeAttempt=true;bookingWrite_(data.sheet,entry.row,entry.ref,cancelled.state);b=cancelled.state.bookings.find(function(x){return x.id===id;});
   }
   var owner=findShop_(entry.ref);return {ok:true,booking:{id:b.id,business:owner?String(cell_(owner,'Business name')).replace(/^'/,''):'Business',service:b.service,start:b.start,end:b.end,status:b.status,verified:b.verified,reminders:b.reminders}};
  }
  var ref=session_(raw.token);if(!ref)return {ok:false,expired:true,error:'Please sign in to your business dashboard again.'};var shop=findShop_(ref);if(!shop)throw Error('Business not found.');
  entry=data.rows.find(function(x){return x.ref===ref;});var state=entry?entry.state:BookingCore.empty(),input=Object.assign({},raw);delete input.token;
  if(raw.action==='booking_create'){input.start=bookingFiji_(raw.startDate,raw.startTime);input.end=bookingFiji_(raw.endDate,raw.endTime);delete input.startDate;delete input.startTime;delete input.endDate;delete input.endTime;}
  var outcome=BookingCore.execute(state,input,{now:now,id:function(){return Utilities.getUuid();}});
  if(raw.action!=='booking_list'&&!outcome.result.repeated){writeAttempt=true;bookingWrite_(data.sheet,entry&&entry.row,ref,outcome.state);}
  outcome.result.business=String(cell_(shop,'Business name')).replace(/^'/,'');return outcome.result;
 }catch(e){var msg=String(e.message||'');return {ok:false,uncertain:writeAttempt,error:/^(Enter |Choose |This |The |Only |Booking |Business |Email |Unknown |Confirm )/.test(msg)?msg:'Booking records could not be updated. Retry with the same request reference.'};}finally{lock.releaseLock();}
}
/** Run once after adding the two booking files and dispatcher hooks. Creates no customer records/emails. */
function installBookingAutomation(){
 var props=PropertiesService.getScriptProperties();if(!props.getProperty('BHF_BOOKING_BOOK')){var ss=SpreadsheetApp.create('Business Hub Fiji Bookings - Private');var sh=ss.getSheets()[0];sh.setName('Booking records');sh.appendRow(['Shop reference','Private booking data (base64)']);sh.setFrozenRows(1);props.setProperty('BHF_BOOKING_BOOK',ss.getId());}
 if(!props.getProperty('BHF_BOOKING_SECRET'))props.setProperty('BHF_BOOKING_SECRET',Utilities.getUuid()+Utilities.getUuid());
 if(!ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='processBookingEmails';}))ScriptApp.newTrigger('processBookingEmails').timeBased().everyMinutes(5).create();
 props.setProperty('BHF_BOOKING_ENABLED','1');console.log('Booking storage and five-minute email processing are ready. No customer email was sent.');
}
function bookingMail_(b,e,ref,shop){
 var name=String(cell_(shop,'Business name')).replace(/^'/,''),reply=String(cell_(shop,'Email')).replace(/^'/,'').trim(),link='https://business-hub-fiji.vercel.app/booking-status.html#id='+encodeURIComponent(b.id)+'&key='+encodeURIComponent(bookingKey_(b,ref)),start=Utilities.formatDate(new Date(b.start),'Pacific/Fiji','dd MMM yyyy HH:mm'),end=Utilities.formatDate(new Date(b.end),'Pacific/Fiji','dd MMM yyyy HH:mm');
 var type=e.kind==='invitation'?'Please verify your booking request':e.kind==='confirmation'?'Booking confirmed':e.kind==='cancellation'?'Booking cancelled':'Booking reminder';
 var body='Bula '+b.customer+',\n\n'+type+' with '+name+'.\nService: '+b.service+'\nStart: '+start+'\nEnd: '+end+'\nAll times are Fiji time.\nReference: '+b.id+'\n\n';
 if(e.kind==='invitation')body+='The business entered this request after contact with you. It is NOT confirmed. Open your private link below and choose Verify email if the details are correct and you agree to booking updates/reminders. If this was not your request, ignore this message or contact the business.\n\n';
 body+='View status, verify or cancel: '+link+'\n\nKeep this link private. Business Hub takes no payment for this booking. Contact the business to agree charges, deposits and cancellation terms.\n\nBusiness Hub Fiji';
 var options={name:'Business Hub Fiji'};if(EMAIL_RE.test(reply))options.replyTo=reply;MailApp.sendEmail(b.email,type+' - '+name,body,options);
}
/** Emails are sent once to MailApp; an uncertain send is never automatically retried. */
function processBookingEmails(){
 if(!bookingCapabilities_().enabled)return;var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
 try{var data=bookingRows_(),now=new Date().toISOString(),sent=0;data.rows.forEach(function(entry){var shop=findShop_(entry.ref);if(!shop)return;entry.state.bookings.forEach(function(b){
  b.events.forEach(function(e){if(e.state==='sending'&&Date.parse(now)-Date.parse(e.claimed)>600000)e.state='uncertain';if(e.state==='queued'&&e.kind!=='cancellation'&&b.start<=now)e.state='expired';});
  BookingCore.due(b,now).forEach(function(e){if(sent>=20||MailApp.getRemainingDailyQuota()<1)return;
   e.state='sending';e.claimed=now;bookingWrite_(data.sheet,entry.row,entry.ref,entry.state);
   try{bookingMail_(b,e,entry.ref,shop);e.state='sent';e.sentAt=new Date().toISOString();}catch(err){e.state='uncertain';e.error='Email acceptance is uncertain. Check the mailbox before any manual resend.';}sent++;bookingWrite_(data.sheet,entry.row,entry.ref,entry.state);
  });
 });bookingWrite_(data.sheet,entry.row,entry.ref,entry.state);});
 }finally{lock.releaseLock();}
}
