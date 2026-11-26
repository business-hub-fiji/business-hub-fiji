(function(){
'use strict';
var $=function(id){return document.getElementById(id);}, query=new URLSearchParams(location.search),slug=query.get('shop')||'',productId=query.get('product')||'', business,products=[],mode;
function status(message){$('status').textContent=message;}
function resetDraft(){$('draft-section').hidden=true;$('send').removeAttribute('href');$('draft').value='';}
function configure(category){var booking=ShopCategories.booking(category);if(!booking)throw Error('Booking requests are not available for this service. Contact the business through its shop page.');mode=booking.mode;
$('time-wrap').hidden=mode==='stay';$('time').required=mode!=='stay';$('time').disabled=mode==='stay';
$('end-wrap').hidden=mode==='appointment';$('end').required=mode!=='appointment';$('end').disabled=mode==='appointment';
$('end-time-wrap').hidden=mode!=='rental';$('end-time').required=mode==='rental';$('end-time').disabled=mode!=='rental';
$('units-wrap').hidden=mode==='appointment';$('units').disabled=mode==='appointment';$('units').required=mode!=='appointment';
$('units-label').textContent=mode==='rental'?'Items or vehicles':'Rooms or units';$('start-label').textContent=mode==='stay'?'Check-in date':mode==='rental'?'Pickup date':'Requested date';$('end-label').textContent=mode==='stay'?'Check-out date':'Return date';$('people').max=mode==='stay'?'30':'100';
resetDraft();}
$('request-form').addEventListener('input',resetDraft);
$('service-choice').addEventListener('change',function(){var product=products.find(function(p){return p.id===$('service-choice').value;});$('service').value=product?product.name:'';try{configure(product&&(product.main_category||business.category)||business.category);status('Choose your requested dates. Availability is subject to confirmation.');}catch(e){$('request-form').hidden=true;status(e.message);}});
$('start').addEventListener('change',function(){$('end').min=$('start').value;});
$('request-form').addEventListener('submit',function(event){event.preventDefault();resetDraft();try{if(!$('request-form').reportValidity())return;var prepared=BHFBookingRequest.build({service:$('service').value,name:$('customer').value,contact:$('contact').value,start:$('start').value,end:$('end').value,time:$('time').value,endTime:$('end-time').value,people:$('people').value,units:$('units').value,notes:$('notes').value,consent:$('consent').checked},business,mode);$('draft').value=prepared.message;$('send').href=prepared.url;$('draft-section').hidden=false;status('Draft prepared. Nothing has been sent.');$('draft-section').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){status(e.message);}});
if(!/^[a-z0-9-]{1,80}$/.test(slug)){status('Choose a business from its shop page first.');return;}
$('back').href='/shop/'+encodeURIComponent(slug);$('back').textContent='Back to the shop';
fetch('https://script.google.com/macros/s/AKfycbzk3yKpUjESUN2qbHkamU6uzlLfFQJ0idHSzpDfOpZAJwWk0LtDpK8Q2oUy6TaHrOjj/exec?action=shop&slug='+encodeURIComponent(slug),{signal:AbortSignal.timeout(20000)}).then(function(r){if(!r.ok)throw Error('Business details could not be loaded.');return r.json();}).then(function(r){
if(!r.ok||r.paused||!r.shop)throw Error('This shop is not currently available for booking enquiries.');business=r.shop;BHFBookingRequest.phone(business.phone);products=(r.products||[]).filter(function(p){return p.available!==false&&ShopCategories.booking(p.main_category||business.category);});
if(productId&&!products.some(function(p){return p.id===productId;}))throw Error('This service is no longer available. Return to the shop to choose another service.');
products.forEach(function(p){var option=document.createElement('option');option.value=p.id;option.textContent=p.name;$('service-choice').appendChild(option);});
var selected=products.find(function(p){return p.id===productId;});if(selected){$('service-choice').value=selected.id;$('service').value=selected.name;}
configure(selected&&(selected.main_category||business.category)||business.category);
$('title').textContent='Request a booking · '+business.name;$('start').min=BHFBookingRequest.fijiNow().date;$('end').min=$('start').min;$('request-form').hidden=false;status('All dates and times are Fiji time. The business must confirm your request.');
}).catch(function(){status('Booking enquiries could not be loaded. Return to the shop and contact the business directly.');});
})();
