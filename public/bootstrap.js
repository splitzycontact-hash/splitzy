// Pre-fetch table context before React loads, using the Convex URL
// injected by Vite via data-convex-url on this script tag.
// This avoids an inline script, which enables script-src 'self' in CSP.
(function () {
  var s = document.currentScript;
  var base = s ? s.dataset.convexUrl : null;
  if (!base || base.indexOf('VITE_CONVEX_URL') !== -1) return;

  var m = location.pathname.match(/^\/t\/([^/]+)\/(\d+)/);
  if (!m) return;
  var slug = m[1];
  var tableNumber = Number(m[2]);
  if (!slug || !Number.isFinite(tableNumber)) return;

  var ctrl = ('AbortController' in window) ? new AbortController() : null;
  if (ctrl) setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 8000);

  var t0 = Date.now();
  window.__tableBootstrap = fetch(base + '/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Convex-Client': 'splitzy-bootstrap'
    },
    body: JSON.stringify({
      path: 'restaurants:getTableContext',
      format: 'json',
      args: [{ slug: slug, tableNumber: tableNumber }]
    }),
    signal: ctrl ? ctrl.signal : undefined
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      try { console.info('[bootstrap]', Date.now() - t0, 'ms'); } catch (e) {}
      if (!d || d.status !== 'success') return null;
      return d.value;
    })
    .catch(function () { return null; });
})();
