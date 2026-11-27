(function(){
 'use strict';
 var root=document.getElementById('shopify-directory');if(!root)return;
 var catalog=typeof ShopCategories!=='undefined'?ShopCategories.categories:[],offers=[],allowed=null;
 var heading=document.createElement('h2');heading.textContent='Buy from participating online shops';root.appendChild(heading);
 var note=document.createElement('p');note.textContent='Seller-authorised product listings. You leave Business Hub Fiji to buy from the named seller. Confirm current price, delivery, taxes, returns and payment terms at the seller’s checkout.';root.appendChild(note);
 var controls=document.createElement('div');root.appendChild(controls);
 var label=document.createElement('label');label.textContent='Product category ';var select=document.createElement('select');select.setAttribute('aria-label','Online shop product category');label.appendChild(select);controls.appendChild(label);
 var option=document.createElement('option');option.value='';option.textContent='All categories';select.appendChild(option);
 catalog.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;select.appendChild(o);});
 var search=document.createElement('input');search.type='search';search.placeholder='Search seller or product';search.setAttribute('aria-label','Search online shop products');controls.appendChild(search);
 var status=document.createElement('p');status.setAttribute('role','status');status.textContent='Checking participating shops…';root.appendChild(status);
 var grid=document.createElement('div');grid.className='shopify-directory-grid';root.appendChild(grid);
 var policy=document.createElement('a');policy.href='/shopify-listing-policy.html';policy.textContent='Seller permissions, privacy and removal requests';root.appendChild(policy);
 var slug=location.pathname.indexOf('/shop/')===0?location.pathname.split('/').filter(Boolean).pop():null;
 function clearLinks(){grid.textContent='';status.textContent='Product details have expired. Refresh to check current listings.';}
 function render(){
  grid.textContent='';var query=search.value.trim().toLowerCase();var found=offers.filter(function(o){return (!slug||o.slug===slug)&&(!allowed||allowed.indexOf(o.category)>=0)&&(!select.value||o.category===select.value)&&(o.title+' '+o.business).toLowerCase().includes(query);});
  found.forEach(function(o){
   if(Date.now()-Date.parse(o.checkedAt)>300000)return;
   var card=document.createElement('article');card.className='shopify-directory-card';
   function line(tag,text){var e=document.createElement(tag);e.textContent=text;card.appendChild(e);return e;}
   if(o.image){var img=document.createElement('img');img.src=o.image;img.alt=o.title;img.loading='lazy';img.referrerPolicy='no-referrer';card.appendChild(img);}
   line('p',o.sponsored?'Sponsored listing':'Participating seller');line('h3',o.title);line('p','Sold by '+o.business);line('p',o.category);
   line('p',(Number(o.price)!==Number(o.maxPrice)?'From ':'')+o.currency+' '+Number(o.price).toFixed(2));
   line('p','Delivery and taxes: confirm at seller checkout.');line('p','Checked '+new Date(o.checkedAt).toLocaleString('en-GB',{timeZone:'Pacific/Fiji'})+' Fiji time');
   var a=line('a','Buy from '+o.business);a.href=o.url;a.target='_blank';a.rel='noopener noreferrer'+(o.sponsored?' sponsored':'');grid.appendChild(card);
  });
  status.textContent=grid.children.length?grid.children.length+' matching seller product(s).':'No participating products match these filters.';
 }
 select.addEventListener('change',render);search.addEventListener('input',render);
 document.addEventListener('mall-category-change',function(e){allowed=e.detail.categories;select.value='';render();});
 fetch('/api/shopify-offers',{cache:'no-store'}).then(function(r){if(!r.ok)throw Error();return r.json();}).then(function(r){
  if(!Array.isArray(r.offers))throw Error();offers=r.offers;render();if(!r.connected)status.textContent='No seller-authorised Shopify connections are active yet.';else if(r.unavailable)status.textContent+=' Some shops could not be refreshed and are hidden.';
  setTimeout(clearLinks,300000);
 }).catch(function(){status.textContent='Online shop listings are temporarily unavailable. Browse Business Hub shops above.';});
})();
