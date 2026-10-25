// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The browser code behind EventTracking.astro (PORTS.md card 89), kept as a plain
// file so a unit test can run the exact text that ships. It is wrapped by the
// component as `(function (gaHosts) { <this file> })(<hosts or null>)`, so
// `gaHosts` is a free variable here: the hostnames the tag may fire on, or null
// to fire anywhere (the same rule and the same fail-open as GoogleAnalytics.astro).
// ES5 on purpose: it is inlined into every page and is never transpiled.
// Never throws, never sends PII: link URLs and button names only, no form values.
if (!gaHosts || gaHosts.indexOf(location.hostname) !== -1) {
  var send = function (name, params) {
    try {
      // GoogleAnalytics.astro defines the gtag() stub immediately, so a call made
      // before gtag.js arrives is queued on the dataLayer, not lost.
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
    } catch (e) {
      /* analytics must never break the page */
    }
  };

  document.addEventListener('click', function (ev) {
    try {
      var t = ev.target;
      if (!t || typeof t.closest !== 'function') return;
      var a = t.closest('a[href]');
      var href = a ? a.getAttribute('href') || '' : '';
      var lower = href.toLowerCase();
      if (lower.indexOf('tel:') === 0) send('click_to_call', { link_url: href });
      else if (lower.indexOf('mailto:') === 0) send('click_email', { link_url: href });
      var tracked = t.closest('[data-track]');
      var name = tracked ? tracked.getAttribute('data-track') : '';
      if (name) {
        var p = { cta_name: name };
        var link = tracked.tagName === 'A' ? tracked : tracked.closest('a[href]') || a;
        if (link) p.link_url = link.getAttribute('href') || '';
        send('cta_click', p);
      }
    } catch (e) {
      /* ignore */
    }
  });

  // Call from a form's success path. Same event and parameters as the Theology
  // Matters WordPress site, so GA4 reports are comparable across the family.
  window.ncsTrackLead = function (formName, extra) {
    try {
      var key = 'ncs_lead_' + formName;
      try {
        var last = Number(sessionStorage.getItem(key) || 0);
        if (last && Date.now() - last < 5000) return;
        sessionStorage.setItem(key, String(Date.now()));
      } catch (e) {
        /* storage blocked: send anyway */
      }
      var params = { form_name: formName, form_location: location.pathname };
      if (extra && typeof extra === 'object') {
        for (var k in extra) {
          if (Object.prototype.hasOwnProperty.call(extra, k) && !(k in params))
            params[k] = extra[k];
        }
      }
      send('generate_lead', params);
    } catch (e) {
      /* ignore */
    }
  };
}
