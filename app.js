/* Carcasa pública de la app. No contiene contenido: todo llega cifrado en data.enc */
'use strict';
const App = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, attrs = {}, ...hijos) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') { for (const [p, q] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, q); else el.style[p] = q; } }
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (const c of hijos.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  };
  const azar = (a) => a[Math.floor(Math.random() * a.length)];
  const mezclar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ent = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /* ---------------- Cifrado (AES-GCM 256 + PBKDF2-SHA256) ---------------- */
  const DB = 'cole-db';
  function idb() {
    return new Promise((ok, ko) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('k'); r.result.createObjectStore('d'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
    });
  }
  async function idbGet(store, key) {
    const db = await idb();
    return new Promise((ok) => { const t = db.transaction(store).objectStore(store).get(key); t.onsuccess = () => ok(t.result); t.onerror = () => ok(undefined); });
  }
  async function idbSet(store, key, val) {
    const db = await idb();
    return new Promise((ok) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(val, key); tx.oncomplete = () => ok(true); tx.onerror = () => ok(false); });
  }
  async function idbDel(store, key) {
    const db = await idb();
    return new Promise((ok) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete = () => ok(true); });
  }
  let CLAVE = null, BLOB = null;
  function trocear(buf) {
    const u = new Uint8Array(buf), mag = new TextDecoder().decode(u.slice(0, 4));
    if (mag !== 'MIA1') throw new Error('formato');
    const iter = new DataView(buf).getUint32(4, false);
    return { iter, sal: u.slice(8, 24), iv: u.slice(24, 36), ct: u.slice(36) };
  }
  async function derivar(pass, sal, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function descifrar(clave) {
    const p = trocear(BLOB);
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: p.iv }, clave, p.ct);
    return JSON.parse(new TextDecoder().decode(plano));
  }
  async function cifrarLocal(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, CLAVE, new TextEncoder().encode(JSON.stringify(obj)));
    return { iv, ct: new Uint8Array(ct) };
  }
  async function descifrarLocal(r) {
    if (!r) return null;
    try { return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, CLAVE, r.ct))); } catch (e) { return null; }
  }
  const guardar = async (k, v) => idbSet('d', k, await cifrarLocal(v));
  const leer = async (k) => descifrarLocal(await idbGet('d', k));

  /* ---------------- Estado ---------------- */
  let D = null; // datos descifrados
  let P = { estrellas: 0, juegos: {}, dias: [], tiempo: {}, peg: 0 };
  const guardarProgreso = () => guardar('progreso', P);

  /* ---------------- Sonido y voz ---------------- */
  /* ---------------- Sonido: efectos y música compuesta al momento (sin archivos) ---------------- */
  let AC = null, SALIDA_FX = null, SALIDA_MUS = null;
  const PREF = (() => { try { return Object.assign({ musica: true, efectos: true }, JSON.parse(localStorage.getItem('cole-sonido') || '{}')); } catch (e) { return { musica: true, efectos: true }; } })();
  const guardarPref = () => { try { localStorage.setItem('cole-sonido', JSON.stringify(PREF)); } catch (e) { } };
  function audio() {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const comp = AC.createDynamicsCompressor(); comp.connect(AC.destination);
      SALIDA_FX = AC.createGain(); SALIDA_FX.gain.value = PREF.efectos ? 1 : 0; SALIDA_FX.connect(comp);
      SALIDA_MUS = AC.createGain(); SALIDA_MUS.gain.value = PREF.musica ? 0.55 : 0; SALIDA_MUS.connect(comp);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function nota(f, t, dur, tipo, vol, destino, ataque = 0.01) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(destino); o.start(t); o.stop(t + dur + 0.02);
  }
  function tono(frecs, dur = 0.12, tipo = 'sine', vol = 0.18) {
    try { audio(); let t = AC.currentTime; for (const f of frecs) { nota(f, t, dur, tipo, vol, SALIDA_FX); t += dur * 0.8; } } catch (e) { }
  }
  function ruido(dur, vol, filtro = 4000, destino) {
    const n = AC.sampleRate * dur, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = b; f.type = 'highpass'; f.frequency.value = filtro; g.gain.value = vol;
    s.connect(f).connect(g).connect(destino || SALIDA_FX); return s;
  }
  const sfx = {
    bien: () => tono([784, 988, 1319], 0.1, 'triangle', 0.2),
    mal: () => tono([330, 247], 0.15, 'sawtooth', 0.06),
    clic: () => tono([700], 0.04, 'sine', 0.08),
    fiesta: () => tono([523, 659, 784, 1046, 784, 1046], 0.12, 'triangle'),
    pop: () => { try { audio(); const t = AC.currentTime; nota(900, t, 0.08, 'sine', 0.2, SALIDA_FX); ruido(0.06, 0.15, 2000).start(t); } catch (e) { } },
    moneda: () => tono([988, 1319], 0.08, 'square', 0.06),
  };
  const Musica = (() => {
    const M = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const MAYOR = [0, 2, 4, 5, 7, 9, 11], MENOR = [0, 2, 3, 5, 7, 8, 10], PENTA = [0, 2, 4, 7, 9], MIXO = [0, 2, 4, 5, 7, 9, 10];
    // Cada tema: tempo, escala, tónica, acordes (grados), timbres y ritmo
    const TEMAS = {
      menu: { bpm: 112, esc: MAYOR, raiz: 60, acordes: [0, 4, 5, 3], lead: 'triangle', bajo: 'sine', bat: 1, semilla: 3 },
      asamblea: { bpm: 92, esc: PENTA, raiz: 62, acordes: [0, 3, 4, 0], lead: 'sine', bajo: 'sine', bat: 0, semilla: 7, vol: 0.7 },
      clase: { bpm: 84, esc: MAYOR, raiz: 65, acordes: [0, 5, 3, 4], lead: 'sine', bajo: 'sine', bat: 0, semilla: 11, vol: 0.45, escaso: true },
      princesas: { bpm: 96, esc: MAYOR, raiz: 67, acordes: [0, 5, 3, 4], lead: 'sine', bajo: 'triangle', bat: 0, semilla: 21, arpegio: true, campana: true },
      stitch: { bpm: 108, esc: MAYOR, raiz: 62, acordes: [0, 3, 4, 0], lead: 'triangle', bajo: 'sine', bat: 2, semilla: 31, ukelele: true },
      kpop: { bpm: 124, esc: MENOR, raiz: 57, acordes: [0, 5, 2, 6], lead: 'square', bajo: 'sawtooth', bat: 3, semilla: 41 },
      toystory: { bpm: 116, esc: MAYOR, raiz: 60, acordes: [0, 3, 4, 4], lead: 'triangle', bajo: 'triangle', bat: 2, semilla: 51, swing: true },
      trolls: { bpm: 118, esc: MIXO, raiz: 64, acordes: [0, 3, 6, 3], lead: 'square', bajo: 'sawtooth', bat: 3, semilla: 61 },
      mario: { bpm: 140, esc: MAYOR, raiz: 64, acordes: [0, 3, 4, 0], lead: 'square', bajo: 'triangle', bat: 1, semilla: 71, chip: true },
      bluey: { bpm: 110, esc: PENTA, raiz: 60, acordes: [0, 3, 4, 3], lead: 'triangle', bajo: 'sine', bat: 1, semilla: 81 },
      monstruos: { bpm: 100, esc: MENOR, raiz: 55, acordes: [0, 3, 4, 0], lead: 'triangle', bajo: 'sawtooth', bat: 1, semilla: 91, swing: true },
      zootropolis: { bpm: 120, esc: MIXO, raiz: 62, acordes: [0, 6, 3, 4], lead: 'square', bajo: 'sine', bat: 2, semilla: 101 },
      minnie: { bpm: 104, esc: MAYOR, raiz: 65, acordes: [0, 5, 1, 4], lead: 'triangle', bajo: 'triangle', bat: 1, semilla: 111, swing: true },
      crono: { bpm: 150, esc: MENOR, raiz: 57, acordes: [0, 0, 5, 4], lead: 'square', bajo: 'sawtooth', bat: 3, semilla: 121 },
      arte: { bpm: 76, esc: PENTA, raiz: 67, acordes: [0, 3, 0, 4], lead: 'sine', bajo: 'sine', bat: 0, semilla: 131, arpegio: true, vol: 0.6 },
    };
    let actual = null, paso = 0, siguiente = 0, timer = null, melodia = [];
    const aleatorio = (s) => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    function componer(T) {
      const r = aleatorio(T.semilla); const mel = []; let g = 4;
      for (let i = 0; i < 32; i++) {
        const suena = T.escaso ? r() < 0.35 : (i % 2 === 0 ? r() < 0.85 : r() < 0.4);
        if (suena) { g += Math.round((r() - 0.5) * 4); g = Math.max(0, Math.min(10, g)); mel.push(g); } else mel.push(null);
      }
      // la segunda mitad repite la primera con un final distinto: así suena a canción
      for (let i = 16; i < 28; i++) mel[i] = mel[i - 16];
      mel[30] = 0; mel[31] = null; return mel;
    }
    const grado = (T, gr, oct = 0) => { const e = T.esc, n = e.length; const o = Math.floor(gr / n); return T.raiz + e[((gr % n) + n) % n] + 12 * (o + oct); };
    function programar() {
      const T = TEMAS[actual]; if (!T) return;
      const sem = 60 / T.bpm / 2; // corcheas
      while (siguiente < AC.currentTime + 0.25) {
        let t = siguiente; if (T.swing && paso % 2 === 1) t += sem * 0.18;
        const comp = Math.floor(paso / 8) % 4, acorde = T.acordes[comp], v = (T.vol || 1);
        const m = melodia[paso % 32];
        if (m != null) nota(M(grado(T, m + acorde, 0)), t, sem * (T.chip ? 0.9 : 1.6), T.lead, 0.07 * v, SALIDA_MUS, T.ukelele ? 0.003 : 0.02);
        if (paso % 4 === 0) nota(M(grado(T, acorde, -1) - 12), t, sem * 3.5, T.bajo, 0.09 * v, SALIDA_MUS, 0.02);
        if (T.arpegio || T.ukelele) { const k = paso % 4; nota(M(grado(T, acorde + [0, 2, 4, 2][k], 1)), t, sem * 1.2, T.ukelele ? 'triangle' : 'sine', 0.035 * v, SALIDA_MUS, 0.004); }
        if (T.campana && paso % 16 === 0) nota(M(grado(T, acorde + 4, 2)), t, sem * 6, 'sine', 0.03 * v, SALIDA_MUS);
        if (T.bat) {
          if (paso % 8 === 0 || (T.bat >= 2 && paso % 8 === 5)) { nota(110, t, 0.16, 'sine', 0.16 * v, SALIDA_MUS, 0.002); }
          if (T.bat >= 2 && paso % 8 === 4) ruido(0.12, 0.08 * v, 1500, SALIDA_MUS).start(t);
          if (T.bat >= 1 && paso % 2 === 1) ruido(0.03, 0.03 * v, 7000, SALIDA_MUS).start(t);
          if (T.bat >= 3 && paso % 2 === 0) ruido(0.02, 0.02 * v, 9000, SALIDA_MUS).start(t);
        }
        siguiente += sem; paso++;
      }
    }
    return {
      tema(nombre) {
        if (!TEMAS[nombre]) nombre = 'menu';
        if (nombre === actual && timer) return;
        actual = nombre;
        try { audio(); } catch (e) { return; }
        melodia = componer(TEMAS[nombre]); paso = 0; siguiente = AC.currentTime + 0.1;
        if (!timer) timer = setInterval(() => { if (PREF.musica && document.visibilityState === 'visible') programar(); else siguiente = AC.currentTime + 0.1; }, 100);
      },
      fanfarria() { try { audio(); const t = AC.currentTime; [523, 659, 784, 1046].forEach((f, k) => nota(f, t + k * 0.11, k === 3 ? 0.6 : 0.14, 'triangle', 0.12, SALIDA_FX)); } catch (e) { } },
      musica(on) { PREF.musica = on; guardarPref(); if (SALIDA_MUS) SALIDA_MUS.gain.setTargetAtTime(on ? 0.55 : 0, AC.currentTime, 0.1); },
      efectos(on) { PREF.efectos = on; guardarPref(); if (SALIDA_FX) SALIDA_FX.gain.setTargetAtTime(on ? 1 : 0, AC.currentTime, 0.05); },
      get pref() { return PREF; },
    };
  })();
  function botonMusica() {
    const b = h('button', { class: 'btn-musica', 'aria-label': 'música' }, PREF.musica ? '🎵' : '🔇');
    b.onclick = (e) => { e.stopPropagation(); Musica.musica(!PREF.musica); document.querySelectorAll('.btn-musica').forEach(x => x.textContent = PREF.musica ? '🎵' : '🔇'); };
    return b;
  }
  let VOZ = null;
  function cargarVoz() {
    const vs = speechSynthesis.getVoices();
    VOZ = vs.find(v => /es[-_]ES/i.test(v.lang) && /m[oó]nica|paulina|marisol|google/i.test(v.name)) || vs.find(v => /es[-_]ES/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { cargarVoz(); speechSynthesis.onvoiceschanged = cargarVoz; }
  function habla(texto, vel = 0.9) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(texto).replace(/[_]{2,}/g, ' hueco '));
    u.lang = 'es-ES'; u.rate = vel; if (VOZ) u.voice = VOZ; speechSynthesis.speak(u);
  }
  const btnHablar = (texto) => h('button', { class: 'hablar', 'aria-label': 'escuchar', onclick: (e) => { e.stopPropagation(); habla(typeof texto === 'function' ? texto() : texto); } }, '🔊');

  /* ---------------- Arrastrar (táctil) ---------------- */
  // Arrastra con el dedo; si se toca sin mover, cuenta como "tocar".
  function arrastrable(el, { destinos, alSoltar, alTocar, clon = true }) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (ev) => {
      if (el.dataset.bloq) return;
      ev.preventDefault();
      const x0 = ev.clientX, y0 = ev.clientY; let fant = null, sobre = null, movido = false;
      const id = ev.pointerId; try { el.setPointerCapture(id); } catch (e) { }
      const mover = (e) => {
        if (e.pointerId !== id) return;
        if (!movido && Math.hypot(e.clientX - x0, e.clientY - y0) < 8) return;
        if (!movido) {
          movido = true;
          if (clon) { const r = el.getBoundingClientRect(); fant = el.cloneNode(true); fant.classList.add('arrastrando'); fant.style.width = r.width + 'px'; document.body.append(fant); el.style.opacity = '.35'; }
        }
        if (fant) { fant.style.left = e.clientX + 'px'; fant.style.top = e.clientY + 'px'; }
        const bajo = document.elementFromPoint(e.clientX, e.clientY);
        const d = bajo && destinos ? bajo.closest(destinos) : null;
        if (d !== sobre) { sobre && sobre.classList.remove('encima'); sobre = d; sobre && sobre.classList.add('encima'); }
      };
      const fin = (e) => {
        if (e.pointerId !== id) return;
        el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', fin); el.removeEventListener('pointercancel', fin);
        if (fant) fant.remove(); el.style.opacity = '';
        sobre && sobre.classList.remove('encima');
        if (!movido) { alTocar && alTocar(el); return; }
        if (e.type === 'pointercancel') return;
        if (sobre && alSoltar) alSoltar(sobre, el, e); else if (alSoltar) alSoltar(null, el, e);
      };
      el.addEventListener('pointermove', mover); el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
    });
  }

  /* ---------------- Navegación ---------------- */
  const pila = [];
  function ir(fn, ...args) { pila.push([fn, args]); pintar(); }
  function atras() { document.body.classList.remove('ficha-grande'); speechSynthesis && speechSynthesis.cancel(); cerrarModal(); if (pila.length > 1) pila.pop(); pintar(); }
  function pintar() {
    limpiarTemporizadores();
    const [fn, args] = pila[pila.length - 1];
    const app = $('#app'); app.innerHTML = ''; fn(app, ...args);
  }
  let TIMERS = [];
  const temporizador = (f, ms) => { const t = setInterval(f, ms); TIMERS.push(t); return t; };
  const espera = (f, ms) => { const t = setTimeout(f, ms); TIMERS.push(t); return t; };
  function limpiarTemporizadores() { TIMERS.forEach(t => { clearInterval(t); clearTimeout(t); }); TIMERS = []; }

  function cabecera(titulo, conAtras = true, extra, logo) {
    return h('div', { class: 'cab' },
      conAtras ? h('button', { class: 'btn-atras', 'aria-label': 'volver', onclick: () => { sfx.clic(); atras(); } }, h('span', { class: 'flecha' }, '⬅'), h('span', { class: 'txt' }, 'Atrás')) : h('div', { style: { width: '96px' } }),
      h('h1', {}, logo ? h('img', { class: 'logo-tit', src: logo, alt: '' }) : null, logo && titulo ? h('span', { class: 'sub-tit' }, titulo) : (logo ? null : titulo)), extra || h('div', { class: 'cab-der' }, botonMusica(), h('div', { class: 'estrellas' }, '⭐ ' + P.estrellas)));
  }
  function modal(titulo, contenido, alCerrar) {
    cerrarModal();
    const m = h('div', { class: 'modal', onclick: (e) => { if (e.target === m) { cerrarModal(); alCerrar && alCerrar(); } } },
      h('div', { class: 'ventana' }, h('button', { class: 'cerrar', onclick: () => { cerrarModal(); alCerrar && alCerrar(); } }, '✕'), titulo ? h('h3', {}, titulo) : null, contenido));
    $('#capa').append(m); return m;
  }
  function cerrarModal() { $('#capa').innerHTML = ''; }
  function confeti(n = 40) {
    const em = ['🎉', '⭐', '✨', '🎈', '💜', '🌟', '🎊'];
    for (let i = 0; i < n; i++) {
      const c = h('div', { class: 'confeti', style: { left: Math.random() * 100 + 'vw', animationDuration: (2 + Math.random() * 2.5) + 's', animationDelay: (Math.random() * .8) + 's' } }, azar(em));
      document.body.append(c); setTimeout(() => c.remove(), 5500);
    }
  }

  /* ---------------- Pantallas ---------------- */
  function pantallaBloqueo(app, error) {
    const inp = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Contraseña de papá o mamá', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
    const rec = h('input', { type: 'checkbox', checked: true, style: { width: '26px', height: '26px', margin: '0 8px 0 0', verticalAlign: 'middle' } });
    const msg = h('p', { class: 'nota', style: { color: error ? '#d33' : '' } }, error || 'Solo hace falta la primera vez en este iPad.');
    const entrar = async () => {
      const pass = inp.value.trim(); if (!pass) return;
      caja.replaceChildren(h('div', { class: 'carga' }), h('p', {}, 'Abriendo…'));
      try {
        const p = trocear(BLOB);
        const k = await derivar(pass, p.sal, p.iter);
        D = await descifrar(k); CLAVE = k;
        if (rec.checked) await idbSet('k', 'clave', k);
        await despuesDeAbrir();
      } catch (e) { pila.length = 0; ir(pantallaBloqueo, 'Contraseña incorrecta. Prueba otra vez.'); }
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });
    const caja = h('div', { class: 'caja' }, h('div', { style: { fontSize: '80px' } }, '🔒'), h('h2', { style: { color: 'var(--morado)', margin: '6px 0' } }, 'Mi cole'),
      inp, h('label', { style: { fontSize: '18px', display: 'block', margin: '4px 0 16px' } }, rec, 'Recordar en este dispositivo'),
      h('button', { class: 'btn', onclick: entrar }, 'Entrar'), msg);
    app.append(h('div', { class: 'bloqueo' }, caja));
    setTimeout(() => inp.focus(), 300);
  }

  async function despuesDeAbrir() {
    P = Object.assign({ estrellas: 0, juegos: {}, dias: [], tiempo: {}, peg: 0, guia: null }, (await leer('progreso')) || {});
    const hoy = fechaISO(new Date());
    if (!P.dias.includes(hoy)) { P.dias.push(hoy); P.dias = P.dias.slice(-400); guardarProgreso(); }
    pila.length = 0; ir(portada);
  }
  const fechaISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function racha() {
    let n = 0; const d = new Date();
    while (P.dias.includes(fechaISO(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------- Personajes: imagen si la hay, si no emoji ---------- */
  function pj(id, clase = 'pj', variante) {
    const im = D.imagenes && D.imagenes[id];
    if (im && im.length) return h('img', { class: clase, src: variante != null ? im[variante % im.length] : azar(im), alt: '', draggable: 'false' });
    const p = D.personajes && D.personajes[id];
    return h('span', { class: clase + ' pj-emoji' }, p ? p[2] : '⭐');
  }
  const pjPorNombre = (nombre) => Object.keys(D.personajes || {}).find(k => D.personajes[k][0] === nombre);
  const guia = () => P.guia || (D.mundos[0] && D.mundos[0].pj) || 'elsa';

  function losa(icono, titulo, color, onclick, extra, k = 0) {
    const ico = typeof icono === 'string' ? h('div', { class: 'ico' }, icono) : h('div', { class: 'ico' }, icono);
    return h('button', { class: 'losa' + (color ? '' : ' clara'), style: Object.assign(color ? { '--c': color } : {}, { animationDelay: (k * 0.05) + 's' }), onclick: () => { sfx.clic(); onclick(); } },
      extra, ico, h('div', { class: 'tit' }, titulo));
  }

  function portada(app) {
    const colores = ['#ff5d8f', '#ffb648', '#4aa3ff', '#2fb45a', '#9b5cff', '#ff7a45'];
    const nombre = h('div', { class: 'nombre-portada' }, [...D.hija].map((l, k) => h('span', { style: { color: colores[k % colores.length], animationDelay: (k * 0.15) + 's' } }, l)));
    const g = pj(guia(), 'pj portada-pj');
    const mg = D.personajes[guia()] && D.mundos.find(m => m.id === D.personajes[guia()][1]);
    const fondoP = mg && D.fondos && D.fondos[mg.id] ? { background: `radial-gradient(circle at 50% 40%, rgba(255,255,255,.85), rgba(255,255,255,.35) 60%), url(${azar(D.fondos[mg.id])}) center/cover` } : {};
    app.append(h('div', { class: 'portada', style: fondoP, onclick: () => { Musica.tema('menu'); sfx.fiesta(); habla('¡Hola, ' + D.hija + '! ¿Jugamos?'); pila.length = 0; ir(inicio); } },
      h('div', { class: 'deco' }, ['⭐', '🌈', '✨', '🎈', '💜', '🌟', '🎀', '🦋'].map((e, k) => h('span', { style: { left: [6, 82, 14, 88, 4, 70, 30, 60][k] + '%', top: [10, 12, 70, 62, 40, 84, 86, 6][k] + '%', animationDelay: (k * 0.4) + 's' } }, e))),
      h('div', { class: 'mi-cole' }, 'El cole de'), nombre, g,
      h('div', { class: 'fecha-portada' }, '📅 ' + fechaLarga(new Date()) + ' · ' + tipoDia(new Date())[1]),
      h('button', { class: 'btn-vamos' }, '▶ ¡VAMOS!')));
  }

  function inicio(app) {
    const r = racha();
    const g = h('button', { class: 'avatar', onclick: () => ir(elegirGuia) }, pj(guia(), 'pj'), h('span', {}, 'Cambiar'));
    Musica.tema('menu');
    app.append(h('div', { class: 'cab' }, g, h('h1', { class: 'hola' }, '¡Hola, ' + D.hija + '!'), h('div', { class: 'cab-der' }, botonMusica(), h('div', { class: 'estrellas' }, '⭐ ' + P.estrellas))),
      h('div', { class: 'cuerpo' },
        h('p', { class: 'subsaludo' }, r > 1 ? '🔥 ¡Llevas ' + r + ' días seguidos aprendiendo!' : '¿Qué quieres hacer hoy?'),
        h('div', { class: 'rejilla grande' },
          losa('🏫', 'Asamblea', '#36a9e1', () => ir(asamblea), null, 0),
          ...D.areas.map((a, k) => losa(a.icono, a.titulo, a.color, () => ir(area, a.id), null, k + 1)),
          losa('✨', 'Mundos mágicos', 'linear-gradient(135deg,#ff8fc8,#9b5cff,#4aa3ff)', () => ir(mundos), null, 6),
          losa('📒', 'Mis pegatinas', '#ffb648', () => ir(pegatinas), null, 7),
          losa('⚙️', 'Papá y mamá', null, () => puertaPadres(), null, 8)
        )));
  }
  function elegirGuia(app) {
    app.append(cabecera('¿Quién te acompaña?'), h('div', { class: 'cuerpo' },
      D.mundos.map(m => [h('div', { class: 'seccion' }, m.icono + ' ' + m.titulo),
        h('div', { class: 'rejilla' }, Object.keys(D.personajes).filter(k => D.personajes[k][1] === m.id).map((k, i) =>
          losa(pj(k, 'pj', 0), D.personajes[k][0], k === guia() ? '#2fb45a' : m.color, () => { P.guia = k; guardarProgreso(); sfx.bien(); habla('¡Hola! Soy ' + D.personajes[k][0]); atras(); }, null, i)))])));
  }

  function tarjetaJuego(j, k = 0) {
    const pjj = P.juegos[j.id];
    const extra = [j.clase ? h('span', { class: 'chapa' }, '🏫 clase') : null, pjj ? h('span', { class: 'hecho' }, '⭐'.repeat(pjj.mejor || 1)) : null];
    return losa(j.icono, j.titulo, j.color || colorArea(j), () => ir(jugar, j.id), extra, k);
  }
  function colorArea(j) {
    if (j.mundo) { const m = D.mundos.find(m => m.id === j.mundo); return m ? m.color : '#9b5cff'; }
    const a = D.areas.find(a => a.id === j.area); return a ? a.color : '#6b5bd6';
  }
  function area(app, id) {
    const a = D.areas.find(a => a.id === id);
    const js = D.juegos.filter(j => j.area === id);
    const clase = js.filter(j => j.clase), mas = js.filter(j => !j.clase);
    app.append(cabecera(a.icono + ' ' + a.titulo), h('div', { class: 'cuerpo' },
      clase.length ? h('div', { class: 'seccion clase' }, '🏫 Como en clase') : null, h('div', { class: 'rejilla' }, clase.map(tarjetaJuego)),
      mas.length ? h('div', { class: 'seccion' }, '🚀 Más juegos') : null, h('div', { class: 'rejilla' }, mas.map(tarjetaJuego))));
  }
  function fondoMundo(m, velo = 0.2) {
    const f = D.fondos && D.fondos[m.id];
    return f && f.length ? { background: `linear-gradient(rgba(255,255,255,${velo}),rgba(255,255,255,${velo + 0.15})), url(${azar(f)}) center/cover no-repeat` } : { background: `linear-gradient(160deg, ${m.color}55, #fff 70%)` };
  }
  function mundos(app) {
    app.append(cabecera('✨ Mundos mágicos'), h('div', { class: 'cuerpo' }, h('div', { class: 'rejilla grande' },
      D.mundos.map((m, k) => losa(D.logos && D.logos[m.id] ? h('img', { class: 'pj logo', src: D.logos[m.id][0], alt: '' }) : m.pj ? pj(m.pj, 'pj', 0) : m.icono, m.titulo, m.color, () => ir(mundo, m.id), null, k)))));
  }
  function mundo(app, id) {
    const m = D.mundos.find(m => m.id === id); Musica.tema(id);
    const conImg = (k) => D.imagenes && D.imagenes[k] ? 0 : 1;
    const amigos = Object.keys(D.personajes).filter(k => D.personajes[k][1] === id).sort((x, y) => conImg(x) - conImg(y)).slice(0, 9);
    const grupo = D.grupos && D.grupos[id];
    const logoM = D.logos && D.logos[id] && D.logos[id][0];
    app.append(cabecera(logoM ? '' : m.icono + ' ' + m.titulo, true, null, logoM), h('div', { class: 'cuerpo', style: fondoMundo(m) },
      grupo ? h('div', { class: 'cartel' }, h('img', { src: azar(grupo), alt: '' })) : null,
      h('div', { class: 'desfile' }, amigos.map((k, i) => h('button', { class: 'amigo', style: { animationDelay: (i * 0.2) + 's' }, onclick: () => { sfx.pop(); habla(D.personajes[k][0]); } }, pj(k, 'pj', 0)))),
      h('div', { class: 'rejilla' }, D.juegos.filter(j => j.mundo === id).map(tarjetaJuego))));
  }
  function pegatinas(app) {
    const n = Math.min(P.peg, D.pegatinas.length);
    const falta = 5 - (P.estrellas % 5);
    app.append(cabecera('📒 Mis pegatinas'), h('div', { class: 'cuerpo' },
      h('p', { class: 'subsaludo' }, 'Tienes ' + n + ' de ' + D.pegatinas.length + ' pegatinas. Te faltan ' + falta + ' ⭐ para la siguiente.'),
      h('div', { class: 'album' }, D.pegatinas.map((p, i) => h('div', { class: 'peg' + (i < n ? '' : ' no') }, i < n ? p : '❔')))));
  }

  /* ---------------- Padres ---------------- */
  function puertaPadres() {
    const a = ent(6, 9), b = ent(6, 9);
    const inp = h('input', { type: 'number', inputmode: 'numeric', style: { fontSize: '30px', width: '160px', textAlign: 'center', padding: '10px', borderRadius: '14px', border: '3px solid #ccd' } });
    modal('Solo para mayores', h('div', { style: { textAlign: 'center' } }, h('p', { style: { fontSize: '26px' } }, '¿Cuánto es ' + a + ' × ' + b + '?'), inp, h('div', { class: 'centro' },
      h('button', { class: 'btn', onclick: () => { if (+inp.value === a * b) { cerrarModal(); ir(panelPadres); } else { inp.value = ''; sfx.mal(); } } }, 'Entrar'))));
    setTimeout(() => inp.focus(), 200);
  }
  function panelPadres(app) {
    const filas = D.juegos.filter(j => P.juegos[j.id]).sort((x, y) => (P.juegos[y.id].ultima || 0) - (P.juegos[x.id].ultima || 0)).map(j => {
      const g = P.juegos[j.id];
      return h('tr', {}, h('td', {}, j.icono + ' ' + j.titulo), h('td', {}, g.veces), h('td', {}, Math.round(100 * g.aciertos / Math.max(1, g.aciertos + g.fallos)) + '%'), h('td', {}, '⭐'.repeat(g.mejor || 0)));
    });
    const tabla = h('table', { style: { width: '100%', fontSize: '18px', borderCollapse: 'collapse', background: '#fff', borderRadius: '16px' } },
      h('tr', {}, ['Juego', 'Veces', 'Aciertos', 'Mejor'].map(t => h('th', { style: { textAlign: 'left', padding: '8px' } }, t))), filas);
    app.append(cabecera('⚙️ Papá y mamá'), h('div', { class: 'cuerpo' },
      h('p', { style: { fontSize: '20px' } }, '⭐ Estrellas: ' + P.estrellas + ' · 📅 Días usando la app: ' + P.dias.length + ' · 🔥 Racha: ' + racha() + ' · 🎮 Juegos: ' + D.juegos.length),
      h('div', { class: 'seccion' }, 'Lo último que ha practicado'), filas.length ? tabla : h('p', {}, 'Todavía no ha jugado.'),
      h('div', { class: 'seccion' }, 'Ajustes'),
      h('div', { class: 'centro', style: { justifyContent: 'flex-start' } },
        h('label', { class: 'ajuste' }, h('input', { type: 'checkbox', checked: PREF.musica, onchange: (e) => Musica.musica(e.target.checked) }), ' 🎵 Música'),
        h('label', { class: 'ajuste' }, h('input', { type: 'checkbox', checked: PREF.efectos, onchange: (e) => Musica.efectos(e.target.checked) }), ' 🔔 Efectos de sonido')),
      h('div', { class: 'centro', style: { justifyContent: 'flex-start' } },
        h('button', { class: 'btn', style: { '--c': '#f39c33' }, onclick: () => { if (confirm('¿Borrar todo el progreso?')) { P = { estrellas: 0, juegos: {}, dias: [], tiempo: {}, peg: 0 }; guardarProgreso(); atras(); } } }, 'Reiniciar progreso'),
        h('button', { class: 'btn', style: { '--c': '#ef4a5c' }, onclick: async () => { if (confirm('Se pedirá la contraseña la próxima vez. ¿Continuar?')) { await idbDel('k', 'clave'); location.reload(); } } }, 'Olvidar contraseña en este iPad'),
        h('button', { class: 'btn', style: { '--c': '#3d8bfd' }, onclick: () => { if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.update())); location.reload(); } }, 'Buscar actualización'))));
  }

  /* ---------------- Asamblea (igual que la de clase) ---------------- */
  const ACCIONES = { canciones: () => canciones(), lista: () => pasarLista(), tiempo: () => tiempo(), calendario: () => calendario() };
  function accion(ic) {
    if (ic.sub) return submenu(ic.sub.titulo, ic.sub.ids || ic.sub.prefijo);
    if (ic.accion) return ACCIONES[ic.accion] && ACCIONES[ic.accion]();
    if (ic.id) ir(jugar, ic.id);
  }
  function asamblea(app) {
    Musica.tema('asamblea');
    const hoy = new Date();
    const fecha = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    app.append(cabecera('🏫 Asamblea ' + (D.cole.clase || '')), h('div', { class: 'cuerpo' },
      h('p', { class: 'subsaludo', style: { margin: '0 0 12px' } }, '📅 ' + fecha.charAt(0).toUpperCase() + fecha.slice(1)),
      h('div', { class: 'asam' }, h('h2', {}, D.asamblea.titulo),
        D.asamblea.filas.map(f => h('div', { class: 'fila' },
          h('button', { class: 'etq', onclick: () => { sfx.clic(); accion(f); } }, h('span', { class: 'bola', style: { background: f.c } }, f.bola), f.etq),
          h('div', { class: 'iconos' }, f.iconos.map(ic => h('button', { class: 'ia', onclick: () => { sfx.clic(); accion(ic); } },
            h('div', { class: 'cuadro', style: { '--c': ic.c } }, ic.i), h('span', {}, ic.l))))))),
      h('div', { class: 'paginas' }, D.asamblea.paginas.map(p => h('button', { class: 'pill', style: { '--c': '#fff' }, onclick: () => { sfx.clic(); accion(p); } }, p.i + ' ' + p.l)))));
  }
  function submenu(titulo, filtro) {
    const js = Array.isArray(filtro) ? filtro.map(id => D.juegos.find(j => j.id === id)).filter(Boolean) : D.juegos.filter(j => j.id.startsWith(filtro));
    modal(titulo, h('div', { class: 'rejilla' }, js.map(j => losa(j.icono, j.titulo, colorArea(j), () => { cerrarModal(); ir(jugar, j.id); }))));
  }
  function canciones() {
    const cont = h('div', {});
    const lista = () => cont.replaceChildren(h('div', { class: 'rejilla' }, D.canciones.map(c => losa(c.i, c.t, '#8bc34a', () => ver(c)))));
    const ver = (c) => {
      if (!navigator.onLine) { cont.replaceChildren(h('p', { class: 'subsaludo' }, '📶 Para ver las canciones hace falta internet.'), h('div', { class: 'centro' }, h('button', { class: 'btn', onclick: lista }, 'Volver'))); return; }
      cont.replaceChildren(h('div', { class: 'video' }, h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + c.yt + '?autoplay=1&rel=0&modestbranding=1&playsinline=1', allow: 'autoplay; fullscreen; encrypted-media', allowfullscreen: true })),
        h('div', { class: 'centro' }, h('button', { class: 'btn', onclick: lista }, '⬅️ Otras canciones')));
    };
    lista(); modal('🎶 Canciones', cont);
  }
  function pasarLista() {
    const est = {}; const cuenta = h('p', { class: 'subsaludo', style: { fontWeight: 800 } });
    const act = () => { const si = Object.values(est).filter(v => v === 'si').length, no = Object.values(est).filter(v => v === 'no').length; cuenta.textContent = '✅ Vienen: ' + si + '   ❌ Faltan: ' + no + '   👥 Somos ' + D.alumnos.length; };
    const lista = h('div', { class: 'lista' }, D.alumnos.map((n, i) => {
      const b = h('button', { class: 'alumno' + (n.startsWith(D.hija) ? ' yo' : ''), onclick: () => {
        est[i] = est[i] === 'si' ? 'no' : est[i] === 'no' ? undefined : 'si'; b.className = 'alumno ' + (est[i] || '') + (n.startsWith(D.hija) ? ' yo' : ''); sfx.clic(); act();
        if (est[i] === 'si') habla(n);
      } }, (i + 1) + '. ' + n);
      return b;
    }));
    act();
    modal('🙋 Pasamos lista', h('div', {}, h('p', { class: 'nota', style: { textAlign: 'center' } }, 'Toca una vez: ha venido ✅ · dos veces: falta ❌'), cuenta, lista));
  }
  const TIEMPOS = [['sol', '☀️', 'Sol'], ['nubes', '☁️', 'Nubes'], ['lluvia', '🌧️', 'Lluvia'], ['niebla', '🌫️', 'Niebla'], ['nieve', '❄️', 'Nieve'], ['viento', '💨', 'Viento']];
  // Código del tiempo de Open-Meteo → nuestras 6 opciones
  const tiempoDeCodigo = (c, viento) => c >= 71 && c <= 86 ? 'nieve' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95 ? 'lluvia' : c === 45 || c === 48 ? 'niebla' : viento > 35 ? 'viento' : c <= 1 ? 'sol' : 'nubes';
  async function tiempoReal(cont, alApuntar) {
    cont.replaceChildren(h('div', { class: 'carga' }), h('p', { class: 'nota', style: { textAlign: 'center' } }, 'Mirando el cielo…'));
    const pedir = async (lat, lon, sitio) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FMadrid&forecast_days=2`;
      const r = await (await fetch(url)).json();
      const ahora = tiempoDeCodigo(r.current.weather_code, r.current.wind_speed_10m);
      const man = tiempoDeCodigo(r.daily.weather_code[1], 0);
      const t = TIEMPOS.find(x => x[0] === ahora), tm = TIEMPOS.find(x => x[0] === man);
      cont.replaceChildren(h('div', { class: 'tiempo-real' },
        h('div', { class: 'tr-sitio' }, '📍 ' + sitio),
        h('div', { class: 'tr-ahora' }, h('span', { class: 'tr-ico' }, t[1]), h('span', { class: 'tr-temp' }, Math.round(r.current.temperature_2m) + '°')),
        h('div', { class: 'tr-detalle' }, 'Hoy: ' + t[2] + ' · máx. ' + Math.round(r.daily.temperature_2m_max[0]) + '° · mín. ' + Math.round(r.daily.temperature_2m_min[0]) + '° · lluvia ' + (r.daily.precipitation_probability_max[0] ?? 0) + '%'),
        h('div', { class: 'tr-detalle' }, 'Mañana: ' + tm[1] + ' ' + tm[2] + ' · máx. ' + Math.round(r.daily.temperature_2m_max[1]) + '°'),
        h('div', { class: 'centro' }, h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: () => alApuntar(ahora, t[2]) }, '✏️ Apuntar «' + t[2] + '» en nuestro registro'))));
      habla('Ahora en ' + sitio + ' hay ' + t[2].toLowerCase() + ' y ' + Math.round(r.current.temperature_2m) + ' grados');
    };
    const porDefecto = () => pedir(40.2842, -3.7942, D.cole.pueblo).catch(() => cont.replaceChildren(h('p', { class: 'subsaludo' }, '📶 No se ha podido consultar el tiempo. ¿Hay internet?')));
    if (!navigator.onLine) return cont.replaceChildren(h('p', { class: 'subsaludo' }, '📶 Para ver el tiempo de hoy hace falta internet.'));
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => pedir(p.coords.latitude.toFixed(3), p.coords.longitude.toFixed(3), 'donde estás').catch(porDefecto), porDefecto, { timeout: 6000, maximumAge: 3600000 });
    else porDefecto();
  }
  function tiempo() {
    const hoy = fechaISO(new Date()), mes = hoy.slice(0, 7);
    const cont = h('div', {});
    const apuntar = (k, t) => { P.tiempo[hoy] = k; guardarProgreso(); sfx.bien(); habla('Hoy hay ' + t.toLowerCase()); pintarT(); };
    const pintarT = () => {
      const delMes = Object.entries(P.tiempo).filter(([d]) => d.startsWith(mes)).map(([, v]) => v);
      const cuenta = TIEMPOS.map(([k]) => delMes.filter(v => v === k).length);
      const colores = ['#f5b82e', '#3d8bfd', '#1b2a6b', '#9aa', '#cfe8ff', '#7ad46f'];
      const total = cuenta.reduce((a, b) => a + b, 0); let ang = -Math.PI / 2; const R = 90;
      const sectores = cuenta.map((n, i) => {
        if (!n) return null; const a2 = ang + 2 * Math.PI * n / total;
        const p = n === total ? `<circle cx="100" cy="100" r="${R}" fill="${colores[i]}"/>` :
          `<path d="M100,100 L${100 + R * Math.cos(ang)},${100 + R * Math.sin(ang)} A${R},${R} 0 ${a2 - ang > Math.PI ? 1 : 0} 1 ${100 + R * Math.cos(a2)},${100 + R * Math.sin(a2)} Z" fill="${colores[i]}"/>`;
        ang = a2; return p;
      }).join('');
      const max = Math.max(1, ...cuenta);
      const barras = TIEMPOS.map(([k, e, t], i) => `<text x="0" y="${22 + i * 30}" font-size="16">${e} ${t}</text><rect x="95" y="${8 + i * 30}" height="20" rx="6" width="${(cuenta[i] / max) * 200}" fill="${colores[i]}"/><text x="${100 + (cuenta[i] / max) * 200}" y="${24 + i * 30}" font-size="15">${cuenta[i]}</text>`).join('');
      const real = h('div', {});
      cont.replaceChildren(
        h('div', { class: 'centro' }, h('button', { class: 'btn', style: { '--c': '#3d8bfd', fontSize: '24px' }, onclick: () => tiempoReal(real, apuntar) }, '🌤️ Ver el tiempo de hoy de verdad')), real,
        h('p', { class: 'subsaludo' }, '¿Qué tiempo hace hoy en ' + D.cole.pueblo + '?'),
        h('div', { class: 'tiempo-ops' }, TIEMPOS.map(([k, e, t]) => h('button', { class: P.tiempo[hoy] === k ? 'sel' : '', onclick: () => apuntar(k, t) }, e, h('span', {}, t)))),
        h('h3', { style: { marginTop: '22px' } }, 'Así ha sido este mes (' + total + ' días)'),
        h('div', { style: { display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }, html: total ? `<svg viewBox="0 0 200 200" width="220">${sectores}</svg><svg viewBox="0 0 330 190" width="360">${barras}</svg>` : '<p>Aún no hay días apuntados.</p>' }));
    };
    pintarT(); modal('☁️ Previsión meteorológica', cont);
  }

  /* ---------- Calendario escolar ---------- */
  function tipoDia(d) {
    const C = D.calendario || {}; const iso = fechaISO(d); const dow = d.getDay();
    if (C.festivos && C.festivos[iso]) return ['festivo', C.festivos[iso]];
    for (const [a, b, t] of (C.vacaciones || [])) if (iso >= a && iso <= b) return ['vacaciones', t];
    if (dow === 0 || dow === 6) return ['finde', 'Fin de semana'];
    if (C.inicio && (iso < C.inicio || iso > C.fin)) return ['vacaciones', 'Vacaciones de verano'];
    return ['cole', '¡Hay cole!'];
  }
  const fechaLarga = (d) => { const t = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
  function calendario() {
    const hoy = new Date(); let y = hoy.getFullYear(), m = hoy.getMonth();
    const cont = h('div', {});
    const pintarC = () => {
      const ref = new Date(y, m, 1);
      const nombreMes = ref.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
      const primero = (ref.getDay() + 6) % 7, dias = new Date(y, m + 1, 0).getDate();
      const celdas = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'].map(d => h('div', { class: 'dia-sem' }, d));
      for (let i = 0; i < primero; i++) celdas.push(h('div', { class: 'vacio' }));
      for (let d = 1; d <= dias; d++) {
        const f = new Date(y, m, d); const [tipo, txt] = tipoDia(f);
        const esHoy = fechaISO(f) === fechaISO(hoy), pasado = f < hoy && !esHoy;
        celdas.push(h('button', { class: 'dia ' + tipo + (esHoy ? ' hoy' : '') + (pasado ? ' pasado' : ''), title: txt, onclick: () => { info.textContent = fechaLarga(f) + ': ' + txt; habla(info.textContent); } },
          h('b', {}, d), tipo === 'festivo' ? h('i', {}, '🎉') : tipo === 'vacaciones' ? h('i', {}, '🏖️') : pasado && tipo === 'cole' ? h('i', {}, '✔') : null));
      }
      const [tHoy, txtHoy] = tipoDia(hoy);
      const info = h('div', { class: 'cal-info' }, '📅 Hoy es ' + fechaLarga(hoy).toLowerCase() + ' · ' + txtHoy);
      const op = (f) => { const x = new Date(hoy); x.setDate(x.getDate() + f); return x.toLocaleDateString('es-ES', { weekday: 'long' }); };
      cont.replaceChildren(
        h('div', { class: 'cal-nav' }, h('button', { class: 'tm-mm', onclick: () => { m--; if (m < 0) { m = 11; y--; } pintarC(); } }, '‹'), h('b', {}, nombreMes), h('button', { class: 'tm-mm', onclick: () => { m++; if (m > 11) { m = 0; y++; } pintarC(); } }, '›')),
        info, h('div', { class: 'cal' }, celdas),
        h('div', { class: 'cal-leyenda' }, h('span', { class: 'dia cole' }, 'Cole'), h('span', { class: 'dia festivo' }, '🎉 Festivo'), h('span', { class: 'dia vacaciones' }, '🏖️ Vacaciones'), h('span', { class: 'dia finde' }, 'Fin de semana'), h('span', { class: 'dia hoy' }, 'Hoy')),
        h('div', { class: 'centro' }, [['¿Qué día es hoy?', 0], ['¿Qué día fue ayer?', -1], ['¿Qué día será mañana?', 1]].map(([t, f]) =>
          h('button', { class: 'pill', style: { '--c': '#fff3a0' }, onclick: (e) => { e.currentTarget.textContent = t.replace('¿', '').replace('?', '') + ': ' + op(f); habla(e.currentTarget.textContent); } }, t))));
    };
    pintarC(); modal('📅 CALENDARIO ESCOLAR', cont);
  }

  /* ---------------- Motor de juego ---------------- */
  const MOTORES = {};
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function jugar(app, id) {
    const j = D.juegos.find(j => j.id === id);
    if (!j) { atras(); return; }
    const motor = MOTORES[j.tipo];
    let aciertos = 0, fallos = 0, terminado = false, seguidos = 0;
    const barra = h('i');
    const cuerpo = h('div', { class: 'cuerpo fijo' + (j.mundo ? ' mundo-juego' : '') });
    const mundoJ = j.mundo && D.mundos.find(m => m.id === j.mundo);
    if (mundoJ) Object.assign(cuerpo.style, fondoMundo(mundoJ, 0.45));
    let amigosMundo = mundoJ ? Object.keys(D.personajes).filter(k => D.personajes[k][1] === mundoJ.id) : [];
    const conFoto = amigosMundo.filter(k => D.imagenes && D.imagenes[k]); if (conFoto.length) amigosMundo = conFoto;
    const quien = amigosMundo.length ? azar(amigosMundo) : guia();
    const nombreQuien = (D.personajes[quien] || ['¡Hola!'])[0];
    const bocadillo = h('div', { class: 'bocadillo' });
    const sinMascota = j.clase || j.area === 'arte' || j.tipo === 'ficha';
    const mascota = sinMascota ? null : h('div', { class: 'mascota' }, bocadillo, pj(quien, 'pj'));
    let pistaActual = null;
    const di = (texto, voz) => { if (!mascota) return; bocadillo.textContent = texto; bocadillo.classList.remove('pop'); void bocadillo.offsetWidth; bocadillo.classList.add('pop'); if (voz) habla(texto); };
    if (mascota) mascota.addEventListener('click', () => { if (pistaActual) di('💡 ' + pistaActual, true); else di(j.instr || '¡Tú puedes!', true); });
    const reaccion = (ok) => {
      if (!mascota) return;
      mascota.classList.remove('salta', 'triste'); void mascota.offsetWidth; mascota.classList.add(ok ? 'salta' : 'triste');
      if (ok) di(seguidos >= 3 ? azar(['¡' + seguidos + ' seguidas! 🔥', '¡Racha de ' + seguidos + '!']) : azar(['¡Bien!', '¡Genial!', '¡Sí!', '¡Toma ya!', '¡Súper!', '¡Muy bien, ' + D.hija + '!']));
      else di(pistaActual ? '💡 ' + pistaActual : azar(['¡Casi! Fíjate bien.', '¡Otra vez, tú puedes!', 'Piénsalo despacito.']), !!pistaActual);
    };
    // Cronómetro (como en Wordwall)
    const t0 = Date.now(); const reloj = h('span', { class: 'crono' }, '⏱ 0:00');
    const tick = temporizador(() => { reloj.textContent = '⏱ ' + mmss((Date.now() - t0) / 1000); }, 1000);
    const api = {
      j, D, h, $, azar, mezclar, ent, pj, pjPorNombre, sfx, habla, btnHablar, arrastrable, modal, cerrarModal, confeti, temporizador, espera, guardar, leer,
      cuerpo, color: colorArea(j), quien, nombreQuien, di, mundo: mundoJ,
      pista: (t) => { pistaActual = t; },
      progreso: (n, t) => { barra.style.width = Math.round(100 * Math.min(1, n / t)) + '%'; },
      acierto: (el) => { aciertos++; seguidos++; pistaActual = null; sfx.bien(); reaccion(true); if (el) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('ok'); } },
      fallo: (el) => { fallos++; seguidos = 0; sfx.mal(); reaccion(false); if (el) { el.classList.remove('mal'); void el.offsetWidth; el.classList.add('mal'); } },
      instr: (texto, conVoz = true) => h('div', { class: 'instr' }, conVoz ? btnHablar(texto) : null, h('span', {}, texto)),
      // Guarda el resultado sin cambiar la pantalla (lo usan los juegos de clase, que tienen su propia pantalla final)
      registrar: (ok, mal) => {
        if (terminado) return null; terminado = true; clearInterval(tick);
        const tot = ok + mal, pct = tot ? ok / tot : 1, est = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
        const g = P.juegos[id] || { veces: 0, aciertos: 0, fallos: 0, mejor: 0 };
        g.veces++; g.aciertos += ok; g.fallos += mal; g.mejor = Math.max(g.mejor, est); g.ultima = Date.now(); P.juegos[id] = g;
        const antes = Math.floor(P.estrellas / 5); P.estrellas += est; const nuevas = Math.floor(P.estrellas / 5) - antes;
        P.peg = Math.min(D.pegatinas.length, (P.peg || 0) + nuevas); guardarProgreso();
        document.querySelectorAll('.estrellas').forEach(e => e.textContent = '⭐ ' + P.estrellas);
        barra.style.width = '100%';
        return { est, nuevas, pegatina: nuevas > 0 ? D.pegatinas[P.peg - 1] : null };
      },
      reiniciar: () => pintar(),
      fin: (extraMsg, puntos) => {
        if (terminado) return; terminado = true; clearInterval(tick);
        Musica.fanfarria();
        const seg = Math.round((Date.now() - t0) / 1000);
        const tot = aciertos + fallos, pct = tot ? aciertos / tot : 1;
        const est = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
        const g = P.juegos[id] || { veces: 0, aciertos: 0, fallos: 0, mejor: 0 };
        let record = '';
        if (puntos != null) { if (!g.recordPuntos || puntos > g.recordPuntos) { g.recordPuntos = puntos; record = '🏆 ¡Nuevo récord: ' + puntos + '!'; } else record = 'Récord: ' + g.recordPuntos; }
        else if (tot >= 3 && pct >= 0.6) { if (!g.mejorTiempo || seg < g.mejorTiempo) { g.mejorTiempo = seg; record = '🏆 ¡Nuevo récord de tiempo!'; } else record = 'Tu récord: ' + mmss(g.mejorTiempo); }
        g.veces++; g.aciertos += aciertos; g.fallos += fallos; g.mejor = Math.max(g.mejor, est); g.ultima = Date.now(); P.juegos[id] = g;
        const antes = Math.floor(P.estrellas / 5); P.estrellas += est; const nuevas = Math.floor(P.estrellas / 5) - antes;
        P.peg = Math.min(D.pegatinas.length, (P.peg || 0) + nuevas);
        guardarProgreso(); sfx.fiesta(); confeti();
        document.querySelectorAll('.estrellas').forEach(e => e.textContent = '⭐ ' + P.estrellas);
        const msgs = ['¡Lo has conseguido!', '¡Muy bien, ' + D.hija + '!', '¡Eres una campeona!', '¡Genial!', '¡Fenomenal!'];
        const m = azar(msgs); habla(m);
        mascota && mascota.remove();
        cuerpo.replaceChildren(h('div', { class: 'fin' },
          h('div', { class: 'fin-pj' }, pj(j.clase ? guia() : quien, 'pj')),
          h('div', { class: 'grandes' }, '⭐'.repeat(est) + '☆'.repeat(3 - est)), h('h2', {}, m),
          h('p', { class: 'subsaludo' }, (tot ? '✅ ' + aciertos + ' · ❌ ' + fallos + ' · ' : '') + '⏱ ' + mmss(seg) + (extraMsg ? ' · ' + extraMsg : '')),
          record ? h('p', { class: 'subsaludo', style: { fontWeight: 900 } }, record) : null,
          nuevas > 0 ? h('div', { style: { fontSize: '26px', fontWeight: 800, margin: '10px' } }, '🎁 ¡Nueva pegatina! ', D.pegatinas[P.peg - 1] || '') : null,
          h('div', { class: 'centro' }, h('button', { class: 'btn btn-seguir', style: { '--c': '#2fb45a' }, onclick: () => pintar() }, '▶ ¡Seguir jugando!'), h('button', { class: 'btn', onclick: atras }, '🏠 Volver'))));
        barra.style.width = '100%';
      },
    };
    const logoJ = j.mundo && D.logos && D.logos[j.mundo] && D.logos[j.mundo][0];
    const propioReloj = j.tipo.startsWith('ww-') || (j.datos && j.datos.modo === 'ww');
    const extraCab = h('div', { class: 'cab-der' }, j.area !== 'arte' && j.tipo !== 'ficha' && !propioReloj ? reloj : null, botonMusica(), h('div', { class: 'estrellas' }, '⭐ ' + P.estrellas));
    app.append(cabecera(j.icono + ' ' + j.titulo, true, extraCab, logoJ), h('div', { class: 'progreso' }, barra), cuerpo);
    Musica.tema(j.tipo === 'contrarreloj' ? 'crono' : j.area === 'arte' ? 'arte' : j.mundo || (j.clase ? 'clase' : 'menu'));
    if (mascota) { cuerpo.classList.add('con-mascota'); app.append(mascota); setTimeout(() => di(j.instr || '¡Vamos a jugar!'), 400); }
    if (!motor) { cuerpo.append(h('p', {}, 'Juego no disponible.')); return; }
    try { motor(api, j.datos || {}); } catch (e) { console.error(e); cuerpo.append(h('p', {}, 'Ups, algo ha fallado.')); }
  }

  /* ---------------- Arranque ---------------- */
  const VERSION = '642d73e6796a';
  let ACTUALIZANDO = false;
  // Cada vez que se abre: una consulta pequeñita (version.json). Si es la misma versión, no se descarga nada.
  async function buscarActualizacion(reg) {
    if (!navigator.onLine) return;
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      const { v } = await r.json();
      if (v && v !== VERSION) {
        ACTUALIZANDO = true;
        const aviso = h('div', { class: 'aviso-act' }, '✨ Descargando novedades…');
        document.body.append(aviso);
        await reg.update();
        setTimeout(() => aviso.remove(), 15000);
      }
    } catch (e) { }
  }
  async function arrancar() {
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => buscarActualizacion(reg)).catch(() => { });
      let recargado = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargado && ACTUALIZANDO) { recargado = true; location.reload(); } });
    }
    const app = $('#app'); app.append(h('div', { class: 'bloqueo' }, h('div', { class: 'carga' })));
    try { BLOB = await (await fetch('data.enc?v=' + VERSION)).arrayBuffer(); }
    catch (e) { try { const c = await caches.match('data.enc', { ignoreSearch: true }); BLOB = await c.arrayBuffer(); } catch (e2) { app.innerHTML = '<p style="padding:40px;font-size:24px">Sin conexión y sin copia guardada.</p>'; return; } }
    try {
      const k = await idbGet('k', 'clave');
      if (k) { D = await descifrar(k); CLAVE = k; await despuesDeAbrir(); return; }
    } catch (e) { await idbDel('k', 'clave'); }
    pila.length = 0; ir(pantallaBloqueo);
  }

  return { Musica, pj, pjPorNombre, guia, arrancar, MOTORES, h, $, mezclar, azar, ent, ir, atras, abrir: (id) => ir(jugar, id), pantalla: (n) => ir({ asamblea, mundos, pegatinas, panelPadres, portada, inicio, elegirGuia }[n]), area: (id) => ir(area, id), mundo: (id) => ir(mundo, id), datos: () => D };
})();
