(function(root){'use strict';
function empty(){return {bookings:[],requests:[]};}
function clean(v,max,label){var s=String(v||'').trim();if(!s||s.length>max||/[\r\n\x00-\x1f]/.test(s))throw Error('Enter '+label+'.');return s;}
function instant(v){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v||'')||!Number.isFinite(Date.parse(v))||new Date(v).toISOString()!==v)throw Error('Choose valid booking times.');return v;}
function publicOwner(b){var c=JSON.parse(JSON.stringify(b));delete c.nonce;delete c.customerToken;return c;}
function event(b,type,due,now){b.events.push({id:b.id+':'+type,kind:type,due:due,state:'queued',created:now});}
function execute(input,raw,ctx){var s=JSON.parse(JSON.stringify(input||empty())),now=ctx.now;if(!Array.isArray(s.bookings)||!Array.isArray(s.requests))throw Error('Booking records need repair.');
 if(raw.action==='booking_list')return {state:s,result:{ok:true,bookings:s.bookings.map(publicOwner)}};
 var key=clean(raw.requestId,100,'a request reference');if(!/^[a-zA-Z0-9-]{16,100}$/.test(key))throw Error('Enter a valid request reference.');var prior=s.requests.find(x=>x.key===key);var signature=JSON.stringify(raw);if(prior){if(prior.signature!==signature)throw Error('This request reference was already used for different details.');return {state:s,result:{...prior.result,repeated:true}};}
 var b;
 if(raw.action==='booking_create'){
  if(raw.contactPermission!==true)throw Error('Confirm the customer requested this booking and permission to contact them.');if(s.bookings.filter(x=>Date.parse(now)-Date.parse(x.created)<3600000).length>=10)throw Error('This business has reached ten booking invitations this hour. Try later.');if(s.bookings.length>=1500)throw Error('Booking storage limit reached. Contact support.');
  var email=clean(raw.email,180,'the customer email');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid customer email.');var start=instant(raw.start),end=instant(raw.end);if(start<=now||end<=start||Date.parse(end)-Date.parse(start)>366*86400000)throw Error('Choose a future start and an end after it.');
  b={id:ctx.id(),nonce:ctx.id(),customer:clean(raw.customer,80,'the customer name'),email:email,service:clean(raw.service,160,'the service'),resource:clean(raw.resource||'Main',80,'a room, vehicle or resource').toLowerCase(),start:start,end:end,status:'Awaiting customer verification',version:1,created:now,updated:now,verified:false,reminders:false,events:[]};event(b,'invitation',now,now);s.bookings.push(b);
 }else{
  b=s.bookings.find(x=>x.id===raw.id);if(!b)throw Error('Booking not found.');if(Number(raw.version)!==b.version)throw Error('This booking changed. Refresh before continuing.');
  if(raw.action==='booking_confirm'){
   if(b.status!=='Requested'||!b.verified)throw Error('The customer must verify their email and agree to booking messages first.');if(b.start<=now)throw Error('The requested start time has passed.');
   if(s.bookings.some(x=>x.id!==b.id&&x.status==='Confirmed'&&x.resource===b.resource&&x.start<b.end&&b.start<x.end))throw Error('This resource is already booked during that time.');
   b.status='Confirmed';event(b,'confirmation',now,now);if(b.reminders)[24,2].forEach(h=>{var due=new Date(Date.parse(b.start)-h*3600000).toISOString();if(due>now)event(b,'reminder-'+h,due,now)});
  }else if(raw.action==='booking_cancel'){
   if(['Cancelled','Completed'].includes(b.status))throw Error('This booking is already closed.');b.status='Cancelled';b.events.forEach(e=>{if(e.state==='queued')e.state='cancelled'});if(b.verified)event(b,'cancellation',now,now);
  }else if(raw.action==='booking_complete'){
   if(b.status!=='Confirmed'||b.end>now)throw Error('Only a confirmed booking that has ended can be completed.');b.status='Completed';b.events.forEach(e=>{if(e.state==='queued')e.state='cancelled'});
  }else throw Error('Unknown booking action.');b.version++;b.updated=now;
 }
 var result={ok:true,booking:publicOwner(b)};s.requests.push({key:key,signature:signature,result:result,at:now});s.requests=s.requests.slice(-100);return {state:s,result:result};
}
function verify(input,id,consent,now,reminders){var s=JSON.parse(JSON.stringify(input)),b=s.bookings.find(x=>x.id===id);if(!b)throw Error('Booking not found.');if(consent!==true)throw Error('Agree to booking messages before verifying.');if(b.status!=='Awaiting customer verification')return {state:s,result:{ok:true,status:b.status}};if(b.start<=now)throw Error('This booking request has expired.');b.verified=true;b.reminders=reminders===true;b.status='Requested';b.version++;b.updated=now;return {state:s,result:{ok:true,status:b.status}};}
function due(b,now){return b.events.filter(e=>e.state==='queued'&&e.due<=now&&(e.kind==='invitation'?b.status==='Awaiting customer verification'&&b.start>now:e.kind==='cancellation'?b.status==='Cancelled':b.status==='Confirmed'&&b.verified&&b.start>now&&(e.kind==='confirmation'||b.reminders)));}
var api={empty:empty,execute:execute,verify:verify,due:due,publicOwner:publicOwner};root.BookingCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
