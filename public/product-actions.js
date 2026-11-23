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
  var exported={remove:remove};
  if(typeof module==='object'&&module.exports)module.exports=exported;
  else root.BHFProductActions=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
