/* Booking enquiries only: no inventory, payment or confirmed reservation. */
(function(root){
'use strict';
function text(value,max,label){var s=String(value||'').trim();if(!s||s.length>max||/[\r\n\x00-\x1f]/.test(s))throw Error('Enter '+label+' (up to '+max+' characters).');return s;}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Choose a valid date.');return value;}
function fijiNow(now){var parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Fiji',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now||new Date());var p={};parts.forEach(function(x){p[x.type]=x.value;});return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};}
function phone(value){var p=String(value||'').replace(/[\s()+-]/g,'');if(/^\d{7}$/.test(p))p='679'+p;if(!/^[1-9]\d{7,14}$/.test(p))throw Error('This business has no usable WhatsApp number. Contact it through its shop page.');return p;}
function count(value,max,label){var s=String(value);if(!/^[1-9]\d*$/.test(s)||Number(s)>max)throw Error('Enter '+label+' between 1 and '+max+'.');return Number(s);}
function time(value){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||''))throw Error('Choose a valid Fiji time.');return value;}
function build(data,business,mode,now){
if(!['appointment','stay','rental','purchase'].includes(mode))throw Error('This business does not have a booking request template.');
if(data.consent!==true)throw Error('Confirm you want to share this request with the business.');
var clock=fijiNow(now),start=validDate(String(data.start||'')),end='',startTime='',endTime='';
if(start<clock.date)throw Error('Choose today or a future date in Fiji.');
if(mode==='stay'||mode==='rental'){end=validDate(String(data.end||''));if(end<start||(mode==='stay'&&end===start))throw Error('Choose an end date after the start date.');if((Date.parse(end)-Date.parse(start))/86400000>366)throw Error('Please ask the business directly for requests longer than one year.');}
if(mode!=='stay'){startTime=time(data.time);if(start===clock.date&&startTime<=clock.time)throw Error('Choose a future Fiji time.');if(mode==='rental'){endTime=time(data.endTime);if(end===start&&endTime<=startTime)throw Error('Return time must be after pickup time.');}}
var name=text(data.name,80,'your name'),contact=text(data.contact,120,'your contact details'),service=text(data.service,120,'the requested service'),people=(mode==='rental'||mode==='purchase')?null:count(data.people,mode==='stay'?30:100,'guests or participants'),units=mode==='stay'||mode==='rental'||mode==='purchase'?count(data.units,mode==='purchase'?1000:20,mode==='stay'?'rooms or units':'items or vehicles'):null;
var note=String(data.notes||'').trim();if(note.length>500)throw Error('Keep additional details within 500 characters.');
var buyerType=data.buyerType||'personal';if(!['personal','business'].includes(buyerType))throw Error('Choose who you are buying for.');
var buyerName='',reference='',fulfilment=data.fulfilment||'Arrange with supplier',location=String(data.location||'').trim();
if(buyerType==='business'){buyerName=text(data.businessName,120,'your business name');reference=String(data.businessReference||'').trim().toUpperCase();if(reference&&!/^BHF-\d{6}-[A-Z0-9]{4}$/.test(reference))throw Error('Enter a valid Business Hub reference or leave it blank.');}
if(!['Arrange with supplier','Delivery','Pickup','On site'].includes(fulfilment))throw Error('Choose delivery or pickup.');
if(location.length>200||/[\r\n\x00-\x1f]/.test(location))throw Error('Keep the location within 200 characters on one line.');
if(fulfilment==='Delivery'&&!location)throw Error('Enter the requested delivery location.');
var lines=['Bula '+text(business.name,160,'the business name')+',',(mode==='purchase'?'Purchase enquiry':mode==='rental'?'Hire enquiry':'Booking request')+' via Business Hub Fiji','Service: '+service,'Customer: '+name,'Contact: '+contact,mode==='stay'?'Check-in: '+start:'Requested date: '+start+(startTime?' at '+startTime:'')];
if(buyerType==='business'){lines.push('Buying for my business: '+buyerName);if(reference)lines.push('Business Hub reference (customer provided): '+reference);}
lines.push('Fulfilment: '+fulfilment);if(location)lines.push('Requested location: '+location);
if(end)lines.push((mode==='stay'?'Check-out: ':'Return: ')+end+(endTime?' at '+endTime:''));
if(people)lines.push('Guests / participants: '+people);if(units)lines.push((mode==='stay'?'Rooms / units: ':'Items / vehicles: ')+units);if(note)lines.push('Details: '+note);
lines.push('All dates and times are Fiji time.','Please confirm availability, quantity, quotation, delivery or pickup costs, any deposit, and cancellation terms. This is an enquiry, not a confirmed reservation or purchase order. No payment has been made.');
var message=lines.join('\n');return {message:message,url:'https://wa.me/'+phone(business.phone)+'?text='+encodeURIComponent(message)};
}
var api={build:build,phone:phone,fijiNow:fijiNow};if(typeof module==='object'&&module.exports)module.exports=api;else root.BHFBookingRequest=api;
})(typeof globalThis!=='undefined'?globalThis:this);
