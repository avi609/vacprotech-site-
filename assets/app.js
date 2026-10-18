/* Vacprotech, public site */
(function () {
  const { esc } = EseStore;
  let D = EseStore.load();
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const NF = () => ({ type: [], flange: [], dn: [], mat: [] });
  let F = NF(), q = '', sortBy = 'rel', limit = 24, lastCat = '', pendingF = null, tab = '', picIdx = 0, curProd = null;
  const FD = { flange: '', dn: '', type: '' };
  let basket = [];
  try { basket = JSON.parse(localStorage.getItem('vacprotech-basket') || '[]'); } catch (e) {}
  const saveBasket = () => { try { localStorage.setItem('vacprotech-basket', JSON.stringify(basket)); } catch (e) {} paintBasket(); };
  const toast = (m, linkHtml) => { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.innerHTML = esc(m) + (linkHtml || ''); document.body.appendChild(t); setTimeout(() => t.remove(), 3200); };
  const all = () => EseStore.allProducts(D);
  const catOf = id => D.categories.find(c => c.id === id);
  const prodById = id => all().find(x => x.p.id === id);
  const prods = c => (c.products || []).concat((c.groups || []).flatMap(g => g.products));
  const cover = c => { if (c.image) return c.image; const p = prods(c).find(x => x.image); return p ? p.image : ''; };
  const fv = (p, f) => { const v = p.facets && p.facets[f]; return Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)]; };
  const dnLabel = p => { const d = (p.facets && p.facets.dn) || []; return d.length ? (d.length === 1 ? 'DN ' + d[0] : 'DN ' + d[0] + '–' + d[d.length - 1]) : ''; };
  const imgTag = (src, alt) => src ? `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy">` : '';
  const catBy = {}; const rebuildIdx = () => { D.categories.forEach(c => prods(c).forEach(p => (catBy[p.id] = c))); };

  /* ---------- cards ---------- */
  function chipsFor(p) {
    const out = [];
    const dn = dnLabel(p); if (dn) out.push(dn);
    if (p.facets && p.facets.flange && out.length) out.push(p.facets.flange);
    if (!out.length) (p.specs || []).slice(0, 2).forEach(s => out.push(s.v));
    return out.slice(0, 3);
  }
  function card(p, c) {
    return `<article class="card"><div class="ph">${p.image ? imgTag(p.image, p.name) : esc(c.icon || '⬡')}</div>
      <div class="body"><span class="tag">${esc(p.tag || c.name)}</span><h3><a href="#/p/${esc(p.id)}">${esc(p.name)}</a></h3>
      <div class="specs">${chipsFor(p).map(s => `<span title="${esc(s)}">${esc(s)}</span>`).join('')}</div></div>
      <button class="quick" type="button" aria-label="Add ${esc(p.name)} to quote" title="Add to quote" onclick="ESEQ.add('${esc(p.id)}')">+</button></article>`;
  }
  const countOf = c => prods(c).length;
  const META = { furnaces: 'To 2400 °C · to 10⁻⁴ Pa', chambers: 'HV to UHV · built to drawing', fittings: 'ISO-KF · ISO-K · ISO-F · CF', flow: 'Thermal & Coriolis', leak: '5×10⁻¹³ Pa·m³/s', pumps: 'Roughing to UHV', gauges: 'Pirani to UHV · RGA', deposition: 'PVD · CVD · ALD · etch', quantum: 'Down to < 10 mK' };

  /* ---------- pressure scale hero ---------- */
  const REG = [
    { id: 'rough', short: 'Rough', name: 'Rough vacuum', range: '1013 to 1 mbar', w: 3, c: 'var(--p1)', tick: '10³', dk: false,
      blurb: 'Pumping down, degassing, drying, packaging. Dry scroll pumps, KF connections and simple angle valves do the job.',
      links: [['ISO-KF fittings', 'fittings', { flange: ['ISO-KF'] }], ['Angle & vent valves', 'fittings', { type: ['Valves'], flange: ['ISO-KF'] }], ['Dry scroll & rotary pumps', 'pumps', null], ['Pirani & capacitance gauges', 'gauges', null], ['Mass flow controllers', 'flow', null]] },
    { id: 'medium', short: 'Medium', name: 'Medium vacuum', range: '1 to 10⁻³ mbar', w: 3, c: 'var(--p2)', tick: '1', dk: false,
      blurb: 'Furnaces, freeze-drying, coating preparation. Elastomer-sealed ISO-KF and ISO-K parts are still the economical choice.',
      links: [['ISO-K & ISO-KF fittings', 'fittings', { flange: ['ISO-KF', 'ISO-K'] }], ['Vacuum furnaces', 'furnaces', null], ['Vacuum chambers', 'chambers', null]] },
    { id: 'high', short: 'High', name: 'High vacuum', range: '10⁻³ to 10⁻⁷ mbar', w: 4, c: 'var(--p3)', tick: '10⁻³', dk: true,
      blurb: 'Evaporation, sputtering, leak testing. Large-bore ISO flanges, gate valves to isolate the turbo pump, and helium leak checks.',
      links: [['ISO-K & ISO-F parts', 'fittings', { flange: ['ISO-K', 'ISO-F'] }], ['Gate valves', 'fittings', { type: ['Valves'], flange: ['ISO-K', 'ISO-F'] }], ['Turbomolecular pumps', 'pumps', null], ['Deposition & etch systems', 'deposition', null], ['Leak detection', 'leak', null], ['HV chambers', 'chambers', null]] },
    { id: 'uhv', short: 'UHV', name: 'Ultra-high vacuum', range: '10⁻⁷ to 10⁻¹² mbar', w: 5, c: 'var(--p4)', tick: '10⁻⁷', dk: true,
      blurb: 'Surface science, MBE, quantum devices. All-metal CF flanges with copper gaskets, bakeable valves and UHV chambers.',
      links: [['CF flanges & fittings', 'fittings', { flange: ['CF'] }], ['All-metal valves', 'fittings', { type: ['Valves'], flange: ['CF'] }], ['Ion & cryo pumps', 'pumps', null], ['Ion gauges & RGA', 'gauges', null], ['Quantum & cryogenics', 'quantum', null], ['UHV chambers', 'chambers', null]] },
    { id: 'xhv', short: 'XHV', name: 'Extreme-high vacuum', range: 'below 10⁻¹² mbar', w: 2, c: 'var(--p5)', tick: '10⁻¹²', dk: true,
      blurb: 'Accelerators and fundamental physics. Low-outgassing 316LN ESR CF flanges and all-metal sealing throughout.',
      links: [['CF flanges', 'fittings', { flange: ['CF'] }], ['All-metal valves', 'fittings', { type: ['Valves'], flange: ['CF'] }]] }
  ];
  let regIdx = 3;
  function scaleHtml() {
    const r = REG[regIdx];
    return `<div class="scale" id="scale"><h2>Where does your process run?</h2><p class="hint">Pick a pressure range to see the parts that belong there.</p>
      <div class="s-track" role="tablist" aria-label="Vacuum range">${REG.map((x, i) => `<button class="s-seg ${x.dk ? 'dk' : ''}" role="tab" aria-selected="${i === regIdx}" style="--w:${x.w};background:${x.c}" onclick="ESEA.reg(${i})"><span>${x.short}</span></button>`).join('')}</div>
      <div class="s-ticks">${REG.map(x => `<i style="--w:${x.w}">${x.tick}</i>`).join('')}</div>
      <div class="s-axis"><span>1 atm = 1013 mbar</span><span>mbar · log scale →</span></div>
      <div class="s-detail"><h3>${r.name}</h3><div class="rg">${r.range}</div><p>${r.blurb}</p>
      <div class="s-links">${r.links.map((l, i) => `<a href="#/cat/${l[1]}" onclick="ESEA.goR(${regIdx},${i});return false">${l[0]} →</a>`).join('')}</div></div></div>`;
  }

  /* ---------- finder ---------- */
  function finderCount() {
    return all().filter(({ cat, p }) => cat.facets && (!FD.flange || fv(p, 'flange').includes(FD.flange)) && (!FD.dn || fv(p, 'dn').includes(FD.dn)) && (!FD.type || fv(p, 'type').includes(FD.type))).length;
  }
  function finderHtml() {
    const fit = catOf('fittings'); if (!fit || !fit.live) return '';
    const ps = prods(fit);
    const dns = [...new Set(ps.flatMap(p => fv(p, 'dn')))].sort((a, b) => a - b);
    const types = [...new Set(ps.flatMap(p => fv(p, 'type')))];
    const n = finderCount();
    return `<div class="finder"><div class="wrap"><div class="finder-card"><h2>Find a fitting<small>Choose what you know. Skip the rest.</small></h2>
      <div class="f-fields">
        <div class="f-group"><label>Flange standard</label><div class="chips">${['ISO-KF', 'ISO-K', 'ISO-F', 'CF'].map(f => `<button class="chip ${FD.flange === f ? 'on' : ''}" onclick="ESEA.fd('flange','${f}')">${f}</button>`).join('')}</div></div>
        <div class="f-group"><label for="fdDn">Size</label><select class="sel" id="fdDn" onchange="ESEA.fd('dn',this.value,1)"><option value="">Any DN</option>${dns.map(d => `<option value="${d}" ${FD.dn === d ? 'selected' : ''}>DN ${d}</option>`).join('')}</select></div>
        <div class="f-group"><label for="fdType">Part type</label><select class="sel" id="fdType" onchange="ESEA.fd('type',this.value,1)"><option value="">Any part</option>${types.map(t => `<option ${FD.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
      </div>
      <button class="btn gold" onclick="ESEA.fdGo()">Show ${n} part${n === 1 ? '' : 's'} →</button></div></div></div>`;
  }

  /* ---------- home ---------- */
  function home() {
    const live = D.categories.filter(c => c.live), soon = D.categories.filter(c => !c.live);
    const total = live.reduce((a, c) => a + countOf(c), 0);
    const bento = live.map((c, i) => `<article class="bt ${i === 0 ? 'big' : ''}"><div class="bt-body"><span class="tag">${esc(c.name)}</span><h3><a href="#/cat/${c.id}">${esc(c.name)}</a></h3><p>${esc(c.blurb)}</p>
      <div class="meta"><span>${countOf(c)} product${countOf(c) === 1 ? '' : 's'}</span>${META[c.id] ? `<span>· ${META[c.id]}</span>` : ''}<span class="go">Browse →</span></div></div>
      <div class="bt-img">${cover(c) ? imgTag(cover(c), c.name) : `<span style="font-size:60px">${esc(c.icon)}</span>`}</div></article>`).join('');
    const pref = ['v-isok-gate', 'cf-6-way-cross', 'kf-4-way-cross-2', 'vf-400', 'mfc-edc-310', 'hld-1', 'ch-uhv', 'v-cf-angle'];
    const feat = pref.map(id => prodById(id)).filter(Boolean).slice(0, 8);
    return `<section class="hero"><div class="wrap"><div class="hero-grid">
      <div><div class="eyebrow">Semiconductor · Quantum · Research</div>
        <h1>Vacuum hardware for <em>cleaner</em> fabs and colder labs</h1>
        <p class="lead">${esc(D.brand.tagline)}. Furnaces, chambers, ISO and CF fittings, valves, mass flow control and leak detection, specified and supplied by ${esc(D.brand.name)}.</p>
        <div class="cta"><a class="btn gold" href="#/products">Browse products</a><button class="btn ghost on-dark" onclick="ESEQ.open()">Request a quote</button></div>
        <div class="hero-facts"><div><b>${total}</b><span>PRODUCTS</span></div><div><b>10⁻¹²</b><span>mbar · UHV READY</span></div><div><b>4</b><span>FLANGE STANDARDS</span></div></div></div>
      ${scaleHtml()}</div></div></section>
    <div id="finderBox">${finderHtml()}</div>
    <section class="s"><div class="wrap"><div class="sec-head"><div><div class="kick">Product lines</div><h2 class="sec-h">Everything for the vacuum chamber</h2></div><a class="btn ghost" href="#/products">All products</a></div>
      <div class="bento">${bento}</div></div></section>
    <section class="s alt"><div class="wrap"><div class="sec-head"><div><div class="kick">Popular parts</div><h2 class="sec-h">Start from a real part</h2></div></div>
      <div class="grid">${feat.map(({ cat, p }) => card(p, cat)).join('')}</div></div></section>
    <section class="s tight"><div class="wrap"><div style="background:var(--hero-bg);border-radius:var(--r-lg);padding:38px 40px;display:flex;gap:28px;align-items:center;flex-wrap:wrap;color:var(--hero-ink)">
      <div style="flex:1;min-width:260px"><div class="eyebrow">Free tool</div><h2 style="color:var(--hero-ink);font-size:clamp(26px,3vw,36px)">Vacuum Atlas</h2><p style="color:var(--hero-ink-2);margin-top:8px;max-width:38em">Read one pressure on every absolute, gauge and vacuum scale at once, then size pumps, check leak rates and conductance.</p></div>
      <a class="btn gold" href="#/calc">Open Vacuum Atlas</a></div></div></section>
    <section class="s"><div class="wrap"><div class="kick">On the roadmap</div><h2 class="sec-h">Coming soon</h2><p class="sec-p">Tell us what you need next and we will let you know when it is in.</p>
      <div class="soon-grid">${soon.map(c => `<div class="soon-card"><span class="pill-soon">Coming soon</span><b>${esc(c.name)}</b><span>${esc(c.blurb)}</span><button type="button" onclick="ESEQ.interest('${esc(c.name)}')">Notify me →</button></div>`).join('')}</div></div></section>`;
  }

  function products() {
    const live = D.categories.filter(c => c.live), soon = D.categories.filter(c => !c.live);
    return `<section class="s"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><span>Products</span></div>
      <h2 class="sec-h">All products</h2><p class="sec-p">Pick a line, or press <b class="mono">/</b> to search every part by name, size or material.</p>
      <div class="bento">${live.map((c, i) => `<article class="bt"><div class="bt-body"><span class="tag">${countOf(c)} product${countOf(c) === 1 ? '' : 's'}</span><h3><a href="#/cat/${c.id}">${esc(c.name)}</a></h3><p>${esc(c.blurb)}</p><div class="meta">${META[c.id] ? `<span>${META[c.id]}</span>` : ''}<span class="go">Browse →</span></div></div><div class="bt-img">${cover(c) ? imgTag(cover(c), c.name) : ''}</div></article>`).join('')}</div>
      <h3 style="margin:44px 0 14px;font-size:20px">Coming soon</h3>
      <div class="soon-grid">${soon.map(c => `<div class="soon-card"><span class="pill-soon">Coming soon</span><b>${esc(c.name)}</b><span>${esc(c.blurb)}</span><button type="button" onclick="ESEQ.interest('${esc(c.name)}')">Notify me →</button></div>`).join('')}</div></div></section>`;
  }

  /* ---------- category / shop ---------- */
  const FACETS = [['type', 'Component type'], ['flange', 'Flange type'], ['dn', 'DN size'], ['mat', 'Material']];
  const TYPE_ORDER = ['Connection Elements', 'Sealings', 'Flanges & Pipe Fittings', 'Bellows & Hoses', 'Adaptors', 'Valves', 'Accessories'];
  const FLANGE_ORDER = ['ISO-KF', 'ISO-K', 'ISO-F', 'CF'];
  const MAT_ORDER = ['Stainless Steel', 'Steel / Zinc-plated Steel', 'Aluminium', 'Plastics / Elastomers / Lubricants', 'Copper / Silver-plated Copper / Indium'];
  const qWords = () => q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = p => (p.name + ' ' + (p.tag || '') + ' ' + (p.desc || '') + ' ' + (p.keywords || '') + ' ' + (p.facets ? Object.values(p.facets).flat().join(' ') + ' ' + (p.facets.dn || []).map(d => 'dn' + d + ' dn ' + d).join(' ') : '')).toLowerCase();
  // a search word must start a word in the text, so "gate" does not match "investigate"
  const has = (h, w) => h.split(/[^a-z0-9]+/).some(t => t.startsWith(w)) || h.includes(' ' + w);
  const qOk = p => { const w = qWords(); if (!w.length) return true; const h = hay(p); return w.every(x => has(h, x)); };
  const fOk = (p, skip) => FACETS.every(([f]) => f === skip || !F[f].length || fv(p, f).some(v => F[f].includes(v)));
  const nActive = () => FACETS.reduce((a, [f]) => a + F[f].length, 0);
  const sorted = list => (sortBy === 'az' ? list.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })) : list);

  function toolbar(count, withFilters) {
    return `<div class="toolbar"><input class="search" id="q" type="search" placeholder="Search in this category: name, DN size, material…" value="${esc(q)}" oninput="ESEA.search(this.value)" aria-label="Search in this category">
      ${withFilters ? `<button class="btn ghost filters-btn" type="button" onclick="ESEA.sheet(true)">Filters${nActive() ? ' (' + nActive() + ')' : ''}</button>` : ''}
      <label class="sr" for="sortSel">Sort</label><select class="sel" id="sortSel" onchange="ESEA.sort(this.value)"><option value="rel" ${sortBy === 'rel' ? 'selected' : ''}>Sort: Featured</option><option value="az" ${sortBy === 'az' ? 'selected' : ''}>Sort: Name A–Z</option></select>
      <span class="mono" style="font-size:12.5px;color:var(--ink-2)" id="resCount">${count} result${count === 1 ? '' : 's'}</span></div>`;
  }
  function grid(list, c) {
    if (!list.length) return `<div class="note">No products match. <button class="btn ghost sm" onclick="ESEA.clear()">Clear filters</button></div>`;
    const shown = list.slice(0, limit);
    return `<div class="grid">${shown.map(p => card(p, catBy[p.id] || c)).join('')}</div>${list.length > limit ? `<div class="more-wrap"><button class="btn ghost" onclick="ESEA.more()">Show ${Math.min(24, list.length - limit)} more of ${list.length - limit} remaining</button></div>` : ''}`;
  }
  function shop(c) {
    const allP = prods(c);
    const options = f => {
      const arr = [...new Set(allP.flatMap(p => fv(p, f)))];
      if (f === 'dn') return arr.sort((a, b) => a - b);
      const ord = { type: TYPE_ORDER, flange: FLANGE_ORDER, mat: MAT_ORDER }[f];
      return arr.sort((a, b) => ((ord.indexOf(a) + 99) % 99) - ((ord.indexOf(b) + 99) % 99));
    };
    const count = (f, v) => allP.filter(p => qOk(p) && fOk(p, f) && fv(p, f).includes(v)).length;
    const box = ([f, label]) => `<details class="fbox" open><summary>${label}</summary><div class="fchips">${options(f).map(v => {
      const n = count(f, v), on = F[f].includes(v);
      return `<button class="fchip ${on ? 'on' : ''}" ${n === 0 && !on ? 'disabled' : ''} aria-pressed="${on}" onclick="ESEA.f('${f}','${esc(v).replace(/'/g, '&#39;')}')">${f === 'dn' ? 'DN ' : ''}${esc(v)} <small>${n}</small></button>`;
    }).join('')}</div></details>`;
    const list = sorted(allP.filter(p => qOk(p) && fOk(p)));
    const active = FACETS.flatMap(([f]) => F[f].map(v => [f, v]));
    return `<section class="s tight"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/products">Products</a><span>/</span><span>${esc(c.name)}</span></div>
      <h2 class="sec-h">${esc(c.name)}</h2><p class="sec-p" style="margin-bottom:22px">${esc(c.blurb)}</p>
      ${toolbar(list.length, true)}
      <div class="shop"><aside class="side" id="side" aria-label="Filters"><div class="side-h"><h3>Filter products</h3><button onclick="ESEA.clear()">Clear all</button></div>
        <div class="cnt">${list.length} of ${allP.length} products</div>${FACETS.map(box).join('')}
        <button class="btn gold sheet-close" onclick="ESEA.sheet(false)">Show ${list.length} products</button></aside>
      <div id="results">${active.length ? `<div class="sel-tags">${active.map(([f, v]) => `<button class="chip on" onclick="ESEA.f('${f}','${esc(v).replace(/'/g, '&#39;')}')" aria-label="Remove filter ${esc(v)}">${f === 'dn' ? 'DN ' : ''}${esc(v)} ✕</button>`).join('')}</div>` : ''}${grid(list, c)}</div></div></div></section>`;
  }
  function listing(c) {
    const groups = c.groups || [{ id: '_', name: '', products: c.products }];
    const chips = c.groups ? `<div class="chips"><button class="chip ${!F.type.length ? 'on' : ''}" onclick="ESEA.grp('')">All</button>${c.groups.map(g => `<button class="chip ${F.type[0] === g.id ? 'on' : ''}" onclick="ESEA.grp('${g.id}')">${esc(g.name)}</button>`).join('')}</div>` : '';
    const pick = F.type[0];
    const BAND = { 'furn-high': 'var(--p5)', 'furn-med': 'var(--p3)', 'furn-low': 'var(--p1)', 'pump-rough': 'var(--p1)', 'pump-high': 'var(--p3)', 'pump-uhv': 'var(--p5)', 'gauge-low': 'var(--p1)', 'gauge-high': 'var(--p5)' }; // same ramp as the pressure scale: deeper = better vacuum
    const secs = groups.filter(g => !pick || g.id === pick).map(g => ({ g, items: sorted(g.products.filter(qOk)) })).filter(s => s.items.length);
    const list = secs.flatMap(s => s.items);
    const body = !secs.length ? grid([], c) : secs.map(({ g, items }) => `${c.groups && c.groups.length > 1 ? `<div class="grp-head"><h3>${BAND[g.id] ? `<i class="band" style="background:${BAND[g.id]}"></i>` : ''}${esc(g.name)}</h3>${g.range ? `<span class="mono rg">${esc(g.range)}</span>` : ''}<span class="mono n">${items.length} product${items.length === 1 ? '' : 's'}</span></div>` : ''}<div class="grid">${items.map(p => card(p, catBy[p.id] || c)).join('')}</div>`).join('');
    return `<section class="s tight"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/products">Products</a><span>/</span><span>${esc(c.name)}</span></div>
      <h2 class="sec-h">${esc(c.name)}</h2><p class="sec-p" style="margin-bottom:22px">${esc(c.blurb)}</p>${toolbar(list.length, false)}${chips}<div id="results">${body}</div></div></section>`;
  }
  function category(id) {
    const c = catOf(id);
    if (!c || !c.live) return products();
    return c.facets ? shop(c) : listing(c);
  }
  const rerender = () => { const y = window.scrollY; const c = location.hash.split('/')[2]; app.innerHTML = category(c); window.scrollTo(0, y); };
  function keepFocusSearch() { const i = $('#q'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) {} } }

  /* ---------- product page ---------- */
  function tablesHtml(p, grid) {
    return (p.techParams || []).filter(t => !!t.cols === grid).map(t => {
      if (!grid) return `<table class="spec-t">${t.title ? `<caption>${esc(t.title)}</caption>` : ''}${(t.rows || []).map(r => `<tr><td>${esc(r.k)}</td><td>${esc(r.v)}</td></tr>`).join('')}</table>`;
      return `<h3 style="margin:6px 0 10px;font-size:17px">${esc(t.title || 'Sizes')}</h3><div class="tbl-wrap"><table class="spec-t grid-t"><thead><tr>${t.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(t.data || []).map(r => `<tr class="sz-row">${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }).join('');
  }
  function tabsFor(p) {
    const has = { overview: !!((p.about && p.about.length) || (p.features && p.features.length) || p.accessories || (p.featureCards && p.featureCards.length) || p.applications || p.workflow), specs: !!tablesHtml(p, false), sizes: !!tablesHtml(p, true) };
    return [['overview', 'Overview'], ['specs', 'Specifications'], ['sizes', 'Sizes & order data']].filter(([k]) => has[k]);
  }
  function tabBody(p, t) {
    if (t === 'specs') return tablesHtml(p, false);
    if (t === 'sizes') return `<div class="tbl-tools"><label class="sr" for="szq">Filter sizes</label><input id="szq" type="search" placeholder="Filter rows: e.g. 63 or 316L" oninput="ESEA.sz(this.value)"><span class="mono" style="font-size:12.5px;color:var(--ink-2)">Type a size or material to narrow the tables</span></div>${tablesHtml(p, true)}`;
    const about = (p.about || []).filter(x => x !== p.desc).map(x => `<p>${esc(x)}</p>`).join('');
    const feats = p.features && p.features.length ? `<h3>Key features</h3><ul>${p.features.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : '';
    const acc = p.accessories ? `<h3>Optional accessories</h3><p>${esc(p.accessories)}</p>` : '';
    const cards = p.featureCards && p.featureCards.length ? `<h3>Highlights</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr));margin-bottom:20px">${p.featureCards.map(c => `<div class="card" style="padding:16px 18px"><h3 style="font-size:16px;margin-bottom:6px">${esc(c.title)}</h3><p style="font-size:14.5px;color:var(--ink-2);margin:0">${esc(c.body || '')}</p></div>`).join('')}</div>` : '';
    const apps = p.applications ? `<h3>Applications</h3><div class="chips">${p.applications.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : '';
    const wf = p.workflow ? `<h3>How it works</h3><ol>${p.workflow.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
    return `<div class="prose">${about}${feats}${cards}${acc}${apps}${wf}</div>`;
  }
  function product(id) {
    const f = prodById(id);
    if (!f) return products();
    const { cat, grp, p } = f; curProd = p;
    const gal = (p.gallery && p.gallery.length ? p.gallery : p.image ? [p.image] : []);
    picIdx = 0;
    const tabs = tabsFor(p); if (!tabs.find(t => t[0] === tab)) tab = tabs.length ? tabs[0][0] : '';
    const dnChips = ((p.facets && p.facets.dn) || []).length ? `<div style="margin:0 0 20px"><div class="mono" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-bottom:8px">Available sizes</div><div style="display:flex;flex-wrap:wrap;gap:6px">${p.facets.dn.map(d => `<span class="mono" style="font-size:12.5px;padding:3px 9px;border-radius:6px;background:var(--surface-2)">DN ${d}</span>`).join('')}</div></div>` : '';
    const related = prods(cat).filter(x => x.id !== p.id && (x.tag === p.tag || (grp && grp.products.includes(x)))).slice(0, 4);
    const rel = related.length ? `<div class="related"><h2 class="sec-h" style="font-size:26px">More like this</h2><div class="grid" style="margin-top:16px">${related.map(x => card(x, cat)).join('')}</div></div>` : '';
    document.title = p.name + ', ' + D.brand.name;
    return `<section class="s tight"><div class="wrap"><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/cat/${cat.id}">${esc(cat.name)}</a>${grp && cat.groups && cat.groups.length > 1 ? `<span>/</span><span>${esc(grp.name)}</span>` : ''}<span>/</span><span>${esc(p.name)}</span></div>
      <div class="pd"><div class="gal"><div class="media" id="mainMedia" onclick="ESEA.zoom()" title="${gal.length ? 'Click to enlarge' : ''}">${gal.length ? imgTag(gal[0], p.name) : esc(cat.icon)}</div>
        ${gal.length > 1 ? `<div class="thumbs">${gal.map((g, i) => `<button type="button" aria-label="View ${i + 1}" aria-current="${i === 0}" onclick="ESEA.pic(${i})">${imgTag(g, 'View ' + (i + 1))}</button>`).join('')}</div>` : ''}</div>
      <div><span class="tag">${esc(p.tag || cat.name)}</span><h1>${esc(p.name)}</h1><p class="lede">${esc(p.desc || '')}</p>
        <div class="key">${(p.specs || []).filter(s => !(dnChips && /size|\(DN\)/i.test(s.k))).map(s => `<div><span>${esc(s.k)}</span><b>${esc(s.v)}</b></div>`).join('')}</div>${dnChips}
        <div class="cta-row"><button class="btn gold" onclick="ESEQ.add('${esc(p.id)}')">+ Add to quote</button><button class="btn ghost" onclick="ESEQ.add('${esc(p.id)}',true)">Request quote now</button></div>
        ${p.id === 'vf-400' ? '<div class="note"><b>Preliminary specification.</b> Shelf spacing, load capacity and temperature uniformity are confirmed per project.</div>' : ''}
        ${/^[vgdq]-|^p-/.test(p.id) ? '<div class="note">Typical values shown. Final data is confirmed on your quotation.</div>' : ''}
      </div></div>
      ${tabs.length ? `<div class="tabs" role="tablist" id="tabs">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" onclick="ESEA.tab('${k}')">${l}</button>`).join('')}</div><div id="tabPanel">${tabBody(p, tab)}</div>` : ''}
      ${rel}</div></section>
      <div class="pd-bar"><button class="btn gold" onclick="ESEQ.add('${esc(p.id)}')">+ Add to quote</button><button class="btn ghost" onclick="ESEQ.add('${esc(p.id)}',true)">Quote now</button></div>`;
  }

  /* ---------- router ---------- */
  function route() {
    D = EseStore.load(); rebuildIdx();
    const h = location.hash.replace(/^#\/?/, '').split('/');
    const here = h[0] === 'cat' ? h[1] : '';
    if (here !== lastCat) { q = ''; F = NF(); limit = 24; sortBy = 'rel'; lastCat = here; if (pendingF) { F = pendingF; pendingF = null; } }
    document.title = D.brand.name + ', Vacuum & High-End Equipment';
    document.body.classList.toggle('has-bar', h[0] === 'p');
    $('#mainNav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); closeMega();
    let html;
    if (h[0] === 'cat') html = category(h[1]);
    else if (h[0] === 'p') { if (h[1] !== (curProd && curProd.id)) tab = ''; html = product(h[1]); }
    else if (h[0] === 'products') html = products();
    else if (h[0] === 'calc') { html = ESECalc.render(); document.title = 'Vacuum Atlas, ' + D.brand.name; }
    else if (h[0] === 'contact') { html = home(); setTimeout(() => ESEQ.open(), 50); }
    else html = home();
    app.innerHTML = html;
    if (h[0] === 'calc') ESECalc.mount();
    document.querySelectorAll('nav.main a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/' + h.slice(0, h[0] === 'cat' ? 2 : 1).join('/')));
    window.scrollTo(0, 0);
  }

  /* ---------- actions ---------- */
  function applyAndShow(catId, pre) {
    pendingF = pre ? Object.assign(NF(), pre) : null;
    const target = '#/cat/' + catId;
    if (location.hash === target) { F = pendingF || NF(); pendingF = null; q = ''; limit = 24; rerender(); window.scrollTo(0, 0); } else location.hash = target;
  }
  window.ESEA = {
    reg(i) { regIdx = i; $('#scale').outerHTML = scaleHtml(); },
    goR(ri, li) { const l = REG[ri].links[li]; applyAndShow(l[1], l[2]); },
    go: applyAndShow,
    fd(k, v, isSel) { FD[k] = (!isSel && FD[k] === v) ? '' : v; $('#finderBox').innerHTML = finderHtml(); },
    fdGo() { const pre = NF(); if (FD.flange) pre.flange = [FD.flange]; if (FD.dn) pre.dn = [FD.dn]; if (FD.type) pre.type = [FD.type]; applyAndShow('fittings', pre); },
    search(v) { q = v; limit = 24; rerender(); keepFocusSearch(); },
    sort(v) { sortBy = v; rerender(); },
    more() { limit += 24; rerender(); },
    f(facet, v) { const a = F[facet], i = a.indexOf(v); if (i < 0) a.push(v); else a.splice(i, 1); limit = 24; const open = $('#side') && $('#side').classList.contains('open'); rerender(); if (open) $('#side').classList.add('open'); },
    clear() { F = NF(); q = ''; limit = 24; rerender(); },
    grp(g) { F.type = g ? [g] : []; limit = 24; rerender(); },
    sheet(open) { const s = $('#side'); if (s) s.classList.toggle('open', open); },
    tab(t) { tab = t; $('#tabs').innerHTML = tabsFor(curProd).map(([k, l]) => `<button role="tab" aria-selected="${k === t}" onclick="ESEA.tab('${k}')">${l}</button>`).join(''); $('#tabPanel').innerHTML = tabBody(curProd, t); },
    sz(v) { const w = v.toLowerCase().split(/\s+/).map(x => x.replace(/^dn/, '')).filter(Boolean);  document.querySelectorAll('.sz-row').forEach(r => { const t = r.textContent.toLowerCase(); r.hidden = !w.every(x => t.includes(x)); }); },
    pic(i) { const g = curProd.gallery; picIdx = i; $('#mainMedia').innerHTML = imgTag(g[i], curProd.name); document.querySelectorAll('.thumbs button').forEach((b, j) => b.setAttribute('aria-current', j === i)); },
    zoom() { const im = $('#mainMedia img'); if (!im) return; $('#lbImg').src = im.src; $('#lightbox').classList.add('open'); }
  };
  $('#lightbox').addEventListener('click', () => $('#lightbox').classList.remove('open'));

  /* ---------- quote drawer ---------- */
  function paintBasket() { const b = $('#bcount'); const n = basket.reduce((a, x) => a + (x.qty || 1), 0); b.textContent = n; b.hidden = !n; }
  let pendingMsg = '';
  window.ESEQ = {
    add(id, openNow) {
      const f = prodById(id); if (!f) return;
      const ex = basket.find(b => b.id === id); if (ex) ex.qty = (ex.qty || 1) + 1; else basket.push({ id, name: f.p.name, qty: 1 });
      saveBasket(); if (openNow) this.open(); else toast('Added to quote', ' <a href="#/contact" onclick="return ESEQ.open()">View</a>');
    },
    del(i) { basket.splice(i, 1); saveBasket(); this.open(); },
    qty(i, v) { basket[i].qty = Math.max(1, parseInt(v, 10) || 1); saveBasket(); },
    interest(name) { pendingMsg = 'I am interested in: ' + name + '.'; this.open(); },
    open() {
      const items = basket.map((b, i) => { const f = prodById(b.id); return `<div class="b-item"><div class="bt-th">${f && f.p.image ? imgTag(f.p.image, '') : ''}</div><span>${esc(b.name)}</span><input type="number" min="1" value="${b.qty || 1}" aria-label="Quantity for ${esc(b.name)}" onchange="ESEQ.qty(${i},this.value)"><button type="button" onclick="ESEQ.del(${i})" aria-label="Remove ${esc(b.name)}">×</button></div>`; }).join('');
      $('#drawer').innerHTML = `<h2>Request a quote</h2>
        ${items || '<p style="color:var(--ink-2);margin-bottom:8px">Nothing selected yet. You can still send a general enquiry, or add parts with the + button on any product.</p>'}
        <div class="f"><label for="qn">Name</label><input id="qn" autocomplete="name"></div><div class="f"><label for="qc">Company</label><input id="qc" autocomplete="organization"></div>
        <div class="f"><label for="qe">Email</label><input id="qe" type="email" autocomplete="email"></div>
        <div class="f"><label for="qm">What do you need?</label><textarea id="qm" rows="4" placeholder="Application, vacuum level, quantities, drawings…">${esc(pendingMsg)}</textarea></div>
        <div style="display:flex;gap:10px;margin-top:16px"><button class="btn gold" onclick="ESEQ.send()">Send request</button><button class="btn ghost" onclick="ESEQ.close()">Close</button></div>
        <p style="font-size:12.5px;color:var(--ink-3);margin-top:14px">This opens your email app with the request filled in. It will post directly to our server once the site is live.</p>`;
      pendingMsg = ''; $('#ov').classList.add('open'); return false;
    },
    close() { $('#ov').classList.remove('open'); },
    send() {
      const v = id => $(id).value.trim();
      if (!v('#qe') || !v('#qn')) { toast('Please enter your name and email'); return; }
      const body = `Name: ${v('#qn')}\nCompany: ${v('#qc')}\nEmail: ${v('#qe')}\n\nProducts:\n${basket.map(b => `- ${b.name} × ${b.qty || 1}`).join('\n') || '-'}\n\n${v('#qm')}`;
      location.href = `mailto:${D.brand.email}?subject=${encodeURIComponent('Quote request, ' + D.brand.name)}&body=${encodeURIComponent(body)}`;
      basket = []; saveBasket(); this.close();
    }
  };
  $('#ov').addEventListener('click', e => { if (e.target.id === 'ov') ESEQ.close(); });
  $('#basketBtn').addEventListener('click', () => ESEQ.open());

  /* ---------- search palette ---------- */
  let cmdSel = 0, cmdRes = [];
  function cmdRender() {
    const w = $('#cmdkIn').value.toLowerCase().split(/\s+/).filter(Boolean), box = $('#cmdkList');
    if (!w.length) {
      box.innerHTML = `<div class="cmdk-hint">Search ${all().length} products by name, DN size or material. Try:<div class="chips">${['DN 63', 'CF flange', 'gate valve', 'centering ring', '316L', 'helium', 'MFC'].map(t => `<button class="chip" type="button" onclick="ESEA.cmdQ('${t}')">${t}</button>`).join('')}</div></div>`; cmdRes = []; return;
    }
    cmdRes = all().map(x => { const h = hay(x.p); if (!w.every(t => has(h, t))) return null; const n = x.p.name.toLowerCase(); let s = 0; w.forEach(t => { if (n.startsWith(t)) s += 4; else if (n.includes(t)) s += 2; }); return { x, s }; }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, 8);
    cmdSel = 0;
    box.innerHTML = cmdRes.length ? cmdRes.map(({ x }, i) => `<a href="#/p/${esc(x.p.id)}" class="${i === 0 ? 'act' : ''}" onclick="ESEA.cmdClose()"><span class="th">${x.p.image ? imgTag(x.p.image, '') : ''}</span><span><b>${esc(x.p.name)}</b><span class="s2">${esc(x.p.tag || '')}${dnLabel(x.p) ? ' · ' + dnLabel(x.p) : ''}</span></span><span class="cat">${esc(x.cat.name)}</span></a>`).join('') : `<div class="cmdk-hint">Nothing matches “${esc($('#cmdkIn').value)}”. Check the size (for example DN 40) or ask us: <a href="#/contact" onclick="ESEA.cmdClose()">request a quote</a>.</div>`;
  }
  Object.assign(window.ESEA, {
    cmdOpen() { $('#cmdk').classList.add('open'); const i = $('#cmdkIn'); i.value = ''; cmdRender(); setTimeout(() => i.focus(), 20); },
    cmdClose() { $('#cmdk').classList.remove('open'); },
    cmdQ(t) { $('#cmdkIn').value = t; cmdRender(); $('#cmdkIn').focus(); }
  });
  $('#searchBtn').addEventListener('click', () => ESEA.cmdOpen());
  $('#cmdkX').addEventListener('click', () => ESEA.cmdClose());
  $('#cmdk').addEventListener('click', e => { if (e.target.id === 'cmdk') ESEA.cmdClose(); });
  $('#cmdkIn').addEventListener('input', cmdRender);
  $('#cmdkIn').addEventListener('keydown', e => {
    const links = [...document.querySelectorAll('#cmdkList a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!links.length) return; cmdSel = (cmdSel + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links.forEach((l, i) => l.classList.toggle('act', i === cmdSel)); links[cmdSel].scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter' && links[cmdSel]) { e.preventDefault(); location.hash = links[cmdSel].getAttribute('href'); ESEA.cmdClose(); }
  });
  document.addEventListener('keydown', e => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag)) { e.preventDefault(); ESEA.cmdOpen(); }
    if (e.key === 'Escape') { ESEA.cmdClose(); ESEQ.close(); $('#lightbox').classList.remove('open'); ESEA.sheet(false); closeMega(); }
  });

  /* ---------- header: mega menu, mobile menu ---------- */
  function buildMega() {
    $('#megaGrid').innerHTML = D.categories.map(c => c.live
      ? `<a href="#/cat/${c.id}"><span class="mt">${cover(c) ? imgTag(cover(c), '') : esc(c.icon)}</span><span><b>${esc(c.name)}</b><span>${countOf(c)} product${countOf(c) === 1 ? '' : 's'}</span></span></a>`
      : `<span class="soon" style="display:flex;gap:12px;align-items:center;padding:10px"><span class="mt">${esc(c.icon)}</span><span><b>${esc(c.name)}</b><span>Coming soon</span></span></span>`).join('');
    $('#footCats').innerHTML = D.categories.filter(c => c.live).map(c => `<a href="#/cat/${c.id}">${esc(c.name)}</a>`).join('');
  }
  function closeMega() { $('#mega').classList.remove('open'); $('#megaBtn').setAttribute('aria-expanded', 'false'); }
  $('#megaBtn').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) { location.hash = '#/products'; return; }
    const o = !$('#mega').classList.contains('open'); $('#mega').classList.toggle('open', o); $('#megaBtn').setAttribute('aria-expanded', o);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.top')) closeMega(); });
  $('#menuBtn').addEventListener('click', () => { const o = !$('#mainNav').classList.contains('open'); $('#mainNav').classList.toggle('open', o); $('#menuBtn').setAttribute('aria-expanded', o); });
  $('#copyMail').addEventListener('click', () => {
    const m = D.brand.email, done = () => toast('Copied ' + m);
    if (navigator.clipboard) navigator.clipboard.writeText(m).then(done, () => toast(m)); else toast(m);
  });

  rebuildIdx(); buildMega(); paintBasket();
  $('#copyMail').textContent = D.brand.email;
  window.addEventListener('hashchange', route);
  route();
})();
