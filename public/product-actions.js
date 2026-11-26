(function(root){
  'use strict';
  async function remove(api, token, id){
    var result;
    try { result = await api({action:'product_delete', token:token, id:id}); }
    catch(e) { result = {ok:false}; }
    if(result && result.ok && Array.isArray(result.products)) return result;
    if(result && result.expired) return result;
    // A write can commit even when its response is lost. Read before any retry.
    var check;
    try { check = await api({action:'shop_get',token:token}); } catch(e) {}
    if(check && check.ok && Array.isArray(check.products)){
      if(!check.products.some(function(p){return p.id===id;}))return {ok:true,products:check.products,reconciled:true};
      return {ok:false,products:check.products,error:(result&&result.error)||'The product is still listed. Refresh before trying again.'};
    }
    return {ok:false,uncertain:true,error:'We could not confirm whether deletion completed. Refresh the dashboard before trying again.'};
  }

  function matches(product, request){
    if(!product || product.id!==request.id)return false;
    if(['name','description','main_category','category'].some(function(k){return String(product[k]||'')!==String(request[k]||'');}))return false;
    if(Boolean(product.available)!==Boolean(request.available))return false;
    if(request.price==='' ? product.price!=='' : Number(product.price)!==Number(request.price))return false;
    var c=product.comparison||{}, wanted=request.comparison||{};
    return Object.keys(wanted).every(function(k){return String(c[k]==null?'':c[k])===String(wanted[k]==null?'':wanted[k]);});
  }
  async function save(api, request){
    var result;
    try{result=await api(request);}catch(e){result={ok:false,uncertain:true};}
    if(result&&result.expired)return result;
    if(result&&result.ok&&Array.isArray(result.products))return result;
    if(result&&result.ok===false&&!result.uncertain)return result;
    // Never replay a write: it may have committed before the response was lost.
    var check;
    try{check=await api({action:'shop_get',token:request.token});}catch(e){}
    if(check&&check.expired)return check;
    if(request.id&&!request.photo&&!request.remove_photo&&check&&check.ok&&Array.isArray(check.products)&&check.products.some(function(p){return matches(p,request);})){
      return {ok:true,products:check.products,reconciled:true};
    }
    return {ok:false,uncertain:true,error:'Save could not be confirmed. It may already have completed. Refresh the dashboard and reopen this product before saving again.'};
  }
  var exported={remove:remove,save:save};
  if(typeof module==='object'&&module.exports)module.exports=exported;
  else root.BHFProductActions=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
