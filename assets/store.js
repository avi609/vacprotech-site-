/* Shared data layer. Admin edits persist in localStorage (template stage);
   swap save() for a server call (/api/save-bundle) when this goes live. */
(function () {
  const KEY = 'vacprotech-data-v1'; // new key so old browser-stored edits cannot mask the renamed catalogue
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && d.categories) return d; } } catch (e) {}
    return clone(window.ESE_VAC_DEFAULT);
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function allProducts(d) {
    const out = [];
    d.categories.forEach(c => {
      (c.products || []).forEach(p => out.push({ cat: c, grp: null, p }));
      (c.groups || []).forEach(g => g.products.forEach(p => out.push({ cat: c, grp: g, p })));
    });
    return out;
  }
  window.EseStore = { load, save, reset, allProducts, clone, esc, KEY };
})();
