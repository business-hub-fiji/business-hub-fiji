/* Public product/service sections for each business template. */
(function (root) {
  "use strict";
  var templates = {
  "Fish & food": [
    "Fresh fish",
    "Seafood",
    "Bundles & packs",
    "Prepared food"
  ],
  "Supermarket & grocery": [
    "Fresh produce",
    "Meat & seafood",
    "Pantry & groceries",
    "Dairy & chilled",
    "Drinks",
    "Household essentials"
  ],
  "Restaurant & takeaway": [
    "Meals",
    "Snacks & sides",
    "Drinks",
    "Catering"
  ],
  "Hardware & building": [
    "Building materials",
    "Tools & equipment",
    "Plumbing",
    "Electrical",
    "Paint & finishes",
    "Ready-mix & aggregates"
  ],
  "Land development & civil works": [
    "Planning & approvals",
    "Earthworks",
    "Roads & drainage",
    "Materials supply",
    "Project monitoring"
  ],
  "Land surveying": [
    "Consultation",
    "Site services",
    "Surveying",
    "Planning"
  ],
  "Land consultancy": [
    "Consultation",
    "Site services",
    "Planning"
  ],
  "Car rental": [
    "Small cars",
    "SUVs & four-wheel drives",
    "Vans & buses",
    "Rental extras"
  ],
  "Carwash": [
    "Exterior wash",
    "Interior cleaning",
    "Detailing",
    "Packages"
  ],
  "Transport & delivery": [
    "Local delivery",
    "Freight",
    "Passenger transport",
    "Moving services"
  ],
  "Clothing & retail": [
    "Clothing",
    "Footwear",
    "Accessories",
    "Other retail"
  ],
  "Other services": [
    "Consultation",
    "Services",
    "Packages"
  ],
  "Furniture & homeware": [
    "Living room",
    "Bedroom",
    "Dining room",
    "Office furniture",
    "Homeware",
    "Delivery & assembly"
  ],
  "Hotels & resorts": [
    "Rooms & suites",
    "Family stays",
    "Day packages",
    "Meetings & events"
  ],
  "Guesthouses & holiday rentals": [
    "Guest rooms",
    "Apartments",
    "Holiday homes",
    "Long stays"
  ],
  "Tours & activities": [
    "Day tours",
    "Cultural experiences",
    "Water activities",
    "Adventure activities"
  ],
  "Salon, barber & spa": [
    "Haircuts",
    "Hair styling",
    "Beauty treatments",
    "Massage & spa"
  ],
  "Venues & event services": [
    "Venue hire",
    "Weddings",
    "Event equipment",
    "Photography & entertainment"
  ],
  "Trades, repairs & cleaning": [
    "Repairs",
    "Electrical services",
    "Plumbing services",
    "Cleaning",
    "Maintenance"
  ],
  "Equipment hire": [
    "Construction equipment",
    "Tools",
    "Vehicles & machinery",
    "Event equipment"
  ]
};
  var groups = [{"name":"Food & Grocery","cats":["Fish & food","Supermarket & grocery","Restaurant & takeaway"]},{"name":"Building & Land","cats":["Hardware & building","Land development & civil works","Land surveying","Land consultancy","Equipment hire"]},{"name":"Shopping & Retail","cats":["Furniture & homeware","Clothing & retail"]},{"name":"Accommodation & Experiences","cats":["Hotels & resorts","Guesthouses & holiday rentals","Tours & activities"]},{"name":"Vehicles & Transport","cats":["Car rental","Carwash","Transport & delivery"]},{"name":"Appointments & Events","cats":["Salon, barber & spa","Venues & event services","Trades, repairs & cleaning"]},{"name":"Services","cats":["Other services"]}];
  var bookings = {"Fish & food":{"mode":"appointment","label":"Request collection or delivery"},"Supermarket & grocery":{"mode":"appointment","label":"Request collection or delivery"},"Restaurant & takeaway":{"mode":"appointment","label":"Request a table or catering"},"Hardware & building":{"mode":"appointment","label":"Request collection or delivery"},"Furniture & homeware":{"mode":"appointment","label":"Request delivery or assembly"},"Hotels & resorts":{"mode":"stay","label":"Request a stay"},"Guesthouses & holiday rentals":{"mode":"stay","label":"Request a stay"},"Car rental":{"mode":"rental","label":"Request a rental"},"Equipment hire":{"mode":"rental","label":"Request equipment hire"},"Land development & civil works":{"mode":"appointment","label":"Request a site appointment"},"Land surveying":{"mode":"appointment","label":"Request a site appointment"},"Land consultancy":{"mode":"appointment","label":"Request a consultation"},"Carwash":{"mode":"appointment","label":"Request an appointment"},"Transport & delivery":{"mode":"appointment","label":"Request scheduled transport"},"Tours & activities":{"mode":"appointment","label":"Request a tour or activity"},"Salon, barber & spa":{"mode":"appointment","label":"Request an appointment"},"Venues & event services":{"mode":"appointment","label":"Request an event date"},"Trades, repairs & cleaning":{"mode":"appointment","label":"Request a call-out"}};
  function bookingFor(type){ return bookings[type] ? Object.assign({},bookings[type]) : null; }
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
  root.ShopCategories = { suggestions: suggestions, group: group, groups: groups, categories: ["Fish & food","Supermarket & grocery","Restaurant & takeaway","Hardware & building","Land development & civil works","Land surveying","Land consultancy","Equipment hire","Furniture & homeware","Clothing & retail","Hotels & resorts","Guesthouses & holiday rentals","Tours & activities","Car rental","Carwash","Transport & delivery","Salon, barber & spa","Venues & event services","Trades, repairs & cleaning","Other services"], booking: bookingFor };
  if (typeof module !== "undefined" && module.exports) module.exports = root.ShopCategories;
})(typeof window !== "undefined" ? window : globalThis);
