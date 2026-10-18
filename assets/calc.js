/* Vacprotech, calculators. Engineering estimates; see notes under each tool. */
(function () {
  const PU = { 'mbar': 100, 'Pa': 1, 'hPa': 100, 'kPa': 1000, 'torr': 133.322368, 'mTorr': 0.133322368, 'atm': 101325, 'bar': 1e5, 'psi': 6894.757, 'µbar': 0.1 };
  const VU = { 'L': 1, 'm³': 1000, 'cm³': 0.001, 'ft³': 28.3168466 };           // -> litres
  const SU = { 'L/s': 1, 'L/min': 1 / 60, 'm³/h': 1000 / 3600, 'm³/s': 1000, 'CFM': 0.471947443 }; // -> L/s
  const QU = { 'mbar·L/s': 1, 'Pa·m³/s': 10, 'atm·cc/s': 1 / 1.01325, 'Torr·L/s': 0.750061683 }; // value in unit = mbar·L/s × factor
  const GAS = { 'Air': 3.7e-10, 'Nitrogen (N₂)': 3.64e-10, 'Oxygen (O₂)': 3.55e-10, 'Argon (Ar)': 3.58e-10, 'Helium (He)': 2.18e-10, 'Hydrogen (H₂)': 2.89e-10, 'Water vapour (H₂O)': 4.6e-10, 'CO₂': 4.53e-10 };
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(c => c === '-' ? '⁻' : SUP[+c]).join('');
  const fmt = x => {
    if (!isFinite(x)) return '—';
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a < 1e-3 || a >= 1e6) { const [m, e] = x.toExponential(3).split('e'); return m + ' × 10' + sup(parseInt(e, 10)); }
    return (+x.toPrecision(4)).toString();
  };
  const fmtTime = s => {
    if (!isFinite(s)) return '—';
    if (s < 1) return fmt(s * 1000) + ' ms';
    if (s < 120) return fmt(s) + ' s';
    if (s < 7200) return fmt(s / 60) + ' min';
    return fmt(s / 3600) + ' h';
  };
  const opts = (o, sel) => Object.keys(o).map(k => `<option ${k === sel ? 'selected' : ''}>${k}</option>`).join('');
  const val = id => parseFloat(document.getElementById(id).value);
  const sv = id => document.getElementById(id).value;
  const num = (id, label, v, extra) => `<div class="f"><label>${label}</label><input id="${id}" type="number" step="any" value="${v}" oninput="ESECalc.run()" ${extra || ''}></div>`;
  const unit = (id, label, o, sel) => `<div class="f"><label>${label}</label><select id="${id}" onchange="ESECalc.run()">${opts(o, sel)}</select></div>`;
  const res = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  const out = (rows, note) => `<div class="key" style="margin-top:6px">${rows.join('')}</div>${note ? `<div class="note">${note}</div>` : ''}`;

  const TOOLS = {
    atlas: {
      name: 'Vacuum Atlas', icon: '◉', wide: true,
      form: () => `<p style="color:var(--sub);margin-bottom:12px;font-size:14px">Read one absolute pressure on every absolute, gauge and vacuum scale at once.</p>
        <iframe src="calculators/vacuum-atlas.html?v=light1" title="Vacuum Atlas, pressure and vacuum unit graph" style="width:100%;height:min(82vh,900px);border:1px solid var(--mist);border-radius:12px;background:var(--surface)" loading="lazy"></iframe>`,
      calc: () => ''
    },
    pump: {
      name: 'Pump-down time', icon: '⏱',
      form: () => `<div class="row2">${num('p_v', 'Chamber volume', 100)}${unit('p_vu', 'Volume unit', VU, 'L')}</div>
        <div class="row2">${num('p_s', 'Pump speed at the pump inlet', 10)}${unit('p_su', 'Speed unit', SU, 'm³/h')}</div>
        <div class="row2">${num('p_c', 'Line conductance (optional, 0 = ignore)', 0)}${unit('p_cu', 'Conductance unit', SU, 'L/s')}</div>
        <div class="row2">${num('p_p1', 'Start pressure', 1013.25)}${num('p_p2', 'Target pressure', 0.1)}</div>
        <div class="row2">${num('p_pu', 'Ultimate pressure (pump / outgassing)', 0.001)}${unit('p_pru', 'Pressure unit', PU, 'mbar')}</div>`,
      calc() {
        const V = val('p_v') * VU[sv('p_vu')], S = val('p_s') * SU[sv('p_su')], C = val('p_c') * SU[sv('p_cu')];
        const k = PU[sv('p_pru')], p1 = val('p_p1') * k, p2 = val('p_p2') * k, pu = val('p_pu') * k;
        if (![V, S, p1, p2, pu].every(x => x > 0 && isFinite(x))) return '<div class="note">Enter positive values for volume, speed and pressures.</div>';
        const Se = C > 0 ? 1 / (1 / S + 1 / C) : S;
        if (p2 <= pu) return out([res('Effective speed', fmt(Se) + ' L/s')], '<b>Target is at or below the ultimate pressure</b>, it cannot be reached with these figures. Use a better pump or lower the outgassing load.');
        if (p1 <= p2) return out([res('Effective speed', fmt(Se) + ' L/s'), res('Time', '0 s')], 'Start pressure is already at or below the target.');
        const t = (V / Se) * Math.log((p1 - pu) / (p2 - pu));
        return out([res('Effective pump speed', fmt(Se) + ' L/s (' + fmt(Se * 3.6) + ' m³/h)'), res('Pump-down time', fmtTime(t)), res('Pumped volumes', fmt(Math.log((p1 - pu) / (p2 - pu))) + ' time constants')],
          't = (V / S<sub>eff</sub>) · ln[(P₁ − P<sub>u</sub>) / (P₂ − P<sub>u</sub>)]. Assumes constant speed and a pure-gas load: the real time is longer when water vapour desorption dominates (typical below ~10⁻³ mbar) or when pump speed falls at low pressure. Treat as a first estimate.');
      }
    },
    leak: {
      name: 'Leak rate', icon: '✦',
      form: () => `<div class="row2">${num('l_v', 'Chamber volume', 50)}${unit('l_vu', 'Volume unit', VU, 'L')}</div>
        <div class="row2">${num('l_p1', 'Pressure at start', 0.01)}${num('l_p2', 'Pressure at end', 0.05)}</div>
        <div class="row2">${unit('l_pu', 'Pressure unit', PU, 'mbar')}${num('l_t', 'Time between readings (s)', 600)}</div>`,
      calc() {
        const V = val('l_v') * VU[sv('l_vu')], k = PU[sv('l_pu')] / 100; // to mbar
        const dp = (val('l_p2') - val('l_p1')) * k, dt = val('l_t');
        if (!(V > 0 && dt > 0 && isFinite(dp))) return '<div class="note">Enter a positive volume and time.</div>';
        const q = V * dp / dt; // mbar·L/s
        return out(Object.keys(QU).map(u => res(u, fmt(q * QU[u]))),
          'Q = V · ΔP / Δt (rate-of-rise). Close the chamber off from the pump and let the readings settle first, a rise caused by outgassing looks like a leak and gives a pessimistic result. A helium leak detector separates real leaks from outgassing.');
      }
    },
    mfp: {
      name: 'Mean free path', icon: '◌',
      form: () => `<div class="row2">${unit('m_g', 'Gas', Object.fromEntries(Object.keys(GAS).map(k => [k, 1])), 'Air')}${num('m_t', 'Temperature (°C)', 20)}</div>
        <div class="row2">${num('m_p', 'Pressure', 1e-5)}${unit('m_pu', 'Pressure unit', PU, 'mbar')}</div>
        ${num('m_d', 'Characteristic dimension, chamber / tube diameter (cm)', 30)}`,
      calc() {
        const d = GAS[sv('m_g')], T = val('m_t') + 273.15, P = val('m_p') * PU[sv('m_pu')], D = val('m_d') / 100;
        if (!(P > 0 && T > 0 && D > 0)) return '<div class="note">Enter positive pressure, temperature above −273 °C and dimension.</div>';
        const lam = 1.380649e-23 * T / (Math.SQRT2 * Math.PI * d * d * P);
        const kn = lam / D;
        const regime = kn > 0.5 ? 'Molecular flow' : kn < 0.01 ? 'Viscous (continuum) flow' : 'Transitional flow';
        return out([res('Mean free path', lam >= 1 ? fmt(lam) + ' m' : lam >= 0.01 ? fmt(lam * 100) + ' cm' : fmt(lam * 1000) + ' mm'), res('Knudsen number', fmt(kn)), res('Flow regime', regime)],
          'λ = kT / (√2 · π · d² · P). Regimes use Kn = λ / D: viscous Kn &lt; 0.01, molecular Kn &gt; 0.5. Gas diameters are kinetic values; results are estimates.');
      }
    },
    cond: {
      name: 'Tube conductance', icon: '⌀',
      form: () => `<div class="row2">${num('t_d', 'Tube inner diameter (cm)', 4)}${num('t_l', 'Tube length (cm)', 50)}</div>
        <div class="row2">${num('t_p', 'Average pressure', 1e-4)}${unit('t_pu', 'Pressure unit', PU, 'mbar')}</div>
        <div class="row2">${num('t_s', 'Pump speed (optional, 0 = skip)', 0)}${unit('t_su', 'Speed unit', SU, 'L/s')}</div>`,
      calc() {
        const D = val('t_d'), L = val('t_l'), Ptorr = val('t_p') * PU[sv('t_pu')] / 133.322368, S = val('t_s') * SU[sv('t_su')];
        if (!(D > 0 && L > 0 && Ptorr > 0)) return '<div class="note">Enter positive diameter, length and pressure.</div>';
        const cm = 12.1 * Math.pow(D, 3) / L, cv = 180 * Math.pow(D, 4) / L * Ptorr, ct = cm + cv;
        const rows = [res('Molecular conductance', fmt(cm) + ' L/s'), res('Viscous conductance', fmt(cv) + ' L/s'), res('Approx. total (transition)', fmt(ct) + ' L/s')];
        if (S > 0) rows.push(res('Effective speed at chamber', fmt(1 / (1 / S + 1 / ct)) + ' L/s'));
        return out(rows, 'Long round tube (L ≫ D), air at 20 °C: C<sub>mol</sub> = 12.1·D³/L, C<sub>visc</sub> = 180·D⁴·P̄/L (D, L in cm, P in torr, C in L/s). Total = sum is a common transitional approximation. Bends, apertures and valves reduce conductance further.');
      }
    }
  };

  let cur = 'atlas';
  function render() {
    const tabs = Object.keys(TOOLS).map(k => `<button class="chip ${k === cur ? 'on' : ''}" onclick="ESECalc.tab('${k}')">${TOOLS[k].icon} ${TOOLS[k].name}</button>`).join('');
    return `<section class="s"><div class="wrap"><div class="crumbs"><a href="#/">Home</a> / Vacuum Atlas</div>
      <div class="kick">Engineering tools</div><h2 class="sec-h">Vacuum Atlas</h2>
      <p class="sec-p">Quick estimates for sizing pumps, checking leaks and understanding flow. Need a firm number for your system? <a href="#/contact">Ask our engineers</a>.</p>
      <div class="chips">${tabs}</div>
      <div class="panel" style="max-width:${TOOLS[cur].wide ? '1100px' : '760px'}"><h3>${TOOLS[cur].icon} ${TOOLS[cur].name}</h3>${TOOLS[cur].form()}<div id="calcOut"></div></div></div></section>`;
  }
  window.ESECalc = {
    render, run() { if (TOOLS[cur].wide) return; try { document.getElementById('calcOut').innerHTML = TOOLS[cur].calc(); } catch (e) { document.getElementById('calcOut').innerHTML = '<div class="note">Check the inputs.</div>'; } },
    tab(k) { cur = k; document.getElementById('app').innerHTML = render(); this.run(); },
    mount() { this.run(); }
  };
})();
