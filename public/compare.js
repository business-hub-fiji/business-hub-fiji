(function () {
  "use strict";
  function norm(v) { return String(v || "").trim().toLowerCase().replace(/\s+/g, " "); }
  function key(o) {
    var p = o.product, c = p.comparison || {};
    return c.brand && c.model && c.specification && c.unit && Number(c.quantity) > 0
      ? JSON.stringify([o.category, o.subcategory, p.name, c.brand, c.model, c.specification, c.unit, Number(c.quantity)].map(norm))
      : "unmatched:" + o.slug + ":" + p.id;
  }
  function totals(o) {
    var p = o.product, c = p.comparison || {};
    var price = p.price === "" || p.price == null ? null : Number(p.price);
    return { price: price, unit: price != null && Number(c.quantity) > 0 ? price / Number(c.quantity) : null,
      delivered: price != null && c.delivery !== "" && c.delivery != null && c.delivery_zone ? price + Number(c.delivery) : null };
  }
  function select(offers, cats, sub, query) {
    var q = norm(query);
    return offers.filter(function(o) {
      return (!cats || cats.indexOf(o.category) >= 0) && (!sub || o.subcategory === sub) &&
        norm(JSON.stringify([o.category,o.subcategory,o.product.name,o.product.comparison,o.business,o.town])).includes(q);
    });
  }
  if (typeof module !== "undefined") module.exports = { key: key, totals: totals, select: select };
  if (typeof document === "undefined") return;
  var input = document.getElementById("product-query"), results = document.getElementById("product-results");
  var main = document.getElementById("offer-category"), sub = document.getElementById("offer-subcategory");
  var offers = [], allowed = null;
  function el(t, text) { var e = document.createElement(t); e.textContent = text; return e; }
  function money(n) { return n == null ? "Ask for a quote" : "FJD " + n.toFixed(2); }
  function updateSub() {
    var previous = sub.value; sub.textContent = ""; sub.appendChild(new Option("All subcategories", ""));
    Array.from(new Set(select(offers, allowed, "", "").map(function(o){ return o.subcategory; }))).sort()
      .forEach(function(label){ sub.appendChild(new Option(label, label)); });
    sub.value = Array.from(sub.options).some(function(o){ return o.value === previous; }) ? previous : "";
  }
  function render() {
    var matched = select(offers, allowed, sub.value, input.value), sections = new Map();
    results.textContent = "";
    matched.forEach(function(o) {
      var label = o.category + " · " + o.subcategory;
      if (!sections.has(label)) sections.set(label, []);
      sections.get(label).push(o);
    });
    sections.forEach(function(items, label) {
      var section = el("section", ""); section.appendChild(el("h3", label));
      var groups = new Map();
      items.forEach(function(o){ var k = key(o); if(!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });
      groups.forEach(function(list, k) {
        var card = el("article", ""); card.className = "offer";
        card.appendChild(el("h4", list[0].product.name));
        card.appendChild(el("p", k.indexOf("unmatched:") === 0
          ? "Shown separately: confirm service scope or product specifications with the seller."
          : list.length + " matching offer(s). Confirm scope, location and terms."));
        list.forEach(function(o) {
          var p = o.product, c = p.comparison || {}, t = totals(o);
          card.appendChild(el("h4", o.business + " · " + (c.branch || o.town || "Location unknown")));
          if (/^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(p.photo || "")) {
            var img = el("img", ""); img.src = p.photo; img.alt = p.name; img.loading = "lazy";
            img.style.maxWidth = "180px"; img.style.height = "120px"; img.style.objectFit = "cover"; card.appendChild(img);
          }
          if (p.description) card.appendChild(el("p", p.description));
          card.appendChild(el("p", [c.brand,c.model,c.specification,c.quantity,c.unit].filter(Boolean).join(" · ")));
          card.appendChild(el("p", "Price: " + money(t.price) + (t.unit == null ? "" : " · Per " + c.unit + ": " + money(t.unit))));
          var date = Date.parse(p.updated), stale = !Number.isFinite(date) || Date.now()-date > 604800000;
          var expired = c.promotion_until && c.promotion_until < new Date().toISOString().slice(0,10);
          card.appendChild(el("p", "Updated: " + (p.updated || "Unknown") + (stale ? " · Reconfirm old price" : "") + (expired ? " · Promotion expired; reconfirm price" : "")));
          card.appendChild(el("p", "Delivered total: " + (t.delivered == null ? "Quote required" : money(t.delivered)+" to "+c.delivery_zone)));
          if (/^[a-z0-9-]+$/.test(o.slug)) { var a = el("a", "Visit shop"); a.href="/shop/"+o.slug; card.appendChild(a); }
        });
        section.appendChild(card);
      });
      results.appendChild(section);
    });
    if (!matched.length) results.appendChild(el("p", "No matching products or services in this category yet. Try another category or browse the shops above."));
  }
  main.addEventListener("change", function(){ allowed = main.value ? [main.value] : null; updateSub(); render(); });
  sub.addEventListener("change", render); input.addEventListener("input", render);
  document.addEventListener("mall-category-change", function(e) {
    allowed = e.detail.categories;
    main.value = allowed && allowed.length === 1 ? allowed[0] : "";
    updateSub(); render();
  });
  fetch("https://script.google.com/macros/s/AKfycbzk3yKpUjESUN2qbHkamU6uzlLfFQJ0idHSzpDfOpZAJwWk0LtDpK8Q2oUy6TaHrOjj/exec?action=mall_offers")
    .then(function(r){return r.json();}).then(function(r){
      if(!r.ok || !Array.isArray(r.offers)) throw Error("Offer data unavailable");
      offers=r.offers; updateSub(); render();
    }).catch(function(){results.textContent="Product and service browsing is temporarily unavailable. Please browse individual shops.";});
})();
