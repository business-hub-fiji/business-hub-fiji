/* Public product/service sections for each business template. */
(function (root) {
  "use strict";
  var templates = {
    "Fish & food": ["Fresh fish", "Seafood", "Bundles & packs", "Prepared food"],
    "Supermarket & grocery": ["Fresh produce", "Meat & seafood", "Pantry & groceries", "Dairy & chilled", "Drinks", "Household essentials"],
    "Restaurant & takeaway": ["Meals", "Snacks & sides", "Drinks", "Catering"],
    "Hardware & building": ["Building materials", "Tools & equipment", "Plumbing", "Electrical", "Paint & finishes", "Ready-mix & aggregates"],
    "Land development & civil works": ["Planning & approvals", "Earthworks", "Roads & drainage", "Materials supply", "Project monitoring"],
    "Land surveying": ["Consultation", "Site services", "Surveying", "Planning"],
    "Land consultancy": ["Consultation", "Site services", "Planning"],
    "Car rental": ["Small cars", "SUVs & four-wheel drives", "Vans & buses", "Rental extras"],
    "Carwash": ["Exterior wash", "Interior cleaning", "Detailing", "Packages"],
    "Transport & delivery": ["Local delivery", "Freight", "Passenger transport", "Moving services"],
    "Clothing & retail": ["Clothing", "Footwear", "Accessories", "Other retail"],
    "Other services": ["Consultation", "Services", "Packages"]
  };
  function suggestions(type) { return (templates[type] || templates["Other services"]).slice(); }
  function group(products, type) {
    var buckets = new Map();
    (products || []).forEach(function (p) {
      var label = String(p.category || "").trim() || "Other products & services";
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label).push(p);
    });
    var order = suggestions(type);
    return Array.from(buckets, function (entry) { return { name: entry[0], products: entry[1] }; })
      .sort(function (a, b) {
        if (a.name === "Other products & services") return 1;
        if (b.name === "Other products & services") return -1;
        var ai = order.indexOf(a.name), bi = order.indexOf(b.name);
        if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
        return a.name.localeCompare(b.name);
      });
  }
  root.ShopCategories = { suggestions: suggestions, group: group };
  if (typeof module !== "undefined" && module.exports) module.exports = root.ShopCategories;
})(typeof window !== "undefined" ? window : globalThis);
