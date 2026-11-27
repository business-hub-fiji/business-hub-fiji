(function () {
  'use strict';

  const form = document.getElementById('service-search');
  if (!form) return;

  const feedback = document.getElementById('service-feedback');
  const results = document.getElementById('service-results');
  const earth = document.getElementById('service-earth');
  const endpoint = 'https://script.google.com/macros/s/AKfycbzk3yKpUjESUN2qbHkamU6uzlLfFQJ0idHSzpDfOpZAJwWk0LtDpK8Q2oUy6TaHrOjj/exec?action=listings';
  const grassTerms = /\b(grass cutting|cut grass|lawn mowing|mow lawn|lawn care|brush cutting|grass slashing)\b/;
  const ignored = new Set(['i', 'need', 'someone', 'for', 'a', 'the', 'to', 'please', 'my', 'looking', 'help', 'with']);
  let searchVersion = 0;

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function containsPhrase(text, phrase) {
    return (' ' + text + ' ').includes(' ' + phrase + ' ');
  }

  function matchProviders(listings, service, town) {
    const query = normalise(service);
    const terms = query.split(' ').filter(word => word && !ignored.has(word));
    const area = normalise(town);
    if (!area || !terms.length) return [];

    return listings.filter(provider => {
      if (!provider || !provider.name || !containsPhrase(normalise(provider.town), area)) return false;
      const description = normalise([provider.name, provider.category, provider.offers].join(' '));
      return (grassTerms.test(query) && grassTerms.test(description)) ||
        terms.every(word => containsPhrase(description, word));
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  function addLink(parent, label, href, external) {
    const link = document.createElement('a');
    link.textContent = label;
    link.href = href;
    if (external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    parent.append(document.createTextNode(' '), link);
  }

  function providerRow(provider, service, town) {
    const row = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = provider.name;
    row.append(name, document.createTextNode(' · ' + provider.town));
    if (provider.offers) {
      const offers = document.createElement('p');
      offers.textContent = provider.offers;
      row.append(offers);
    }
    if (/^[a-z0-9-]+$/.test(provider.slug || '')) {
      addLink(row, 'Visit shop', '/shop/' + provider.slug);
    }
    let phone = String(provider.phone || '').replace(/\D/g, '');
    if (phone.length === 7) phone = '679' + phone;
    if (/^[1-9]\d{7,14}$/.test(phone)) {
      const message = 'Bula! I found you through Business Hub Fiji. I need ' + service +
        ' in ' + town + '. Are you available, and could you send me a quote?';
      addLink(row, 'Review request on WhatsApp', 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message), true);
    }
    return row;
  }

  form.addEventListener('input', () => {
    searchVersion++;
    results.replaceChildren();
    earth.hidden = true;
    feedback.textContent = '';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const version = ++searchVersion;
    const service = form.elements.service.value.trim();
    const town = form.elements.town.value.trim();
    results.replaceChildren();
    earth.hidden = true;
    if (!normalise(service) || !normalise(town)) {
      feedback.textContent = 'Enter a service and a town or area.';
      return;
    }
    earth.href = 'https://earth.google.com/web/search/' + encodeURIComponent(town + ', Fiji');
    earth.hidden = false;
    feedback.textContent = 'Checking public business listings…';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) throw new Error('Directory unavailable');
      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.listings)) throw new Error('Directory unavailable');
      if (version !== searchVersion) return;

      const matches = matchProviders(payload.listings, service, town);
      for (const provider of matches) results.append(providerRow(provider, service, town));
      feedback.textContent = matches.length
        ? matches.length + (matches.length === 1 ? ' matching provider. ' : ' matching providers. ') + 'Contact the business to confirm availability.'
        : 'No matching businesses are listed for that service and area. Try a wider town or another service name.';
    } catch {
      if (version === searchVersion) feedback.textContent = 'Could not load business listings. Please try again.';
    } finally {
      clearTimeout(timeout);
    }
  });
})();
