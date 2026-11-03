/* Taller de arte: colorear personajes y dibujo libre (con el dedo o el Apple Pencil) */
'use strict';
(() => {
  const M = App.MOTORES;
  const PALETA = ['#1d1d2b', '#ffffff', '#8a8a99', '#ef4a5c', '#ff7a45', '#ffb648', '#ffe14d', '#a6e23a', '#2fb45a', '#00a8a8', '#4aa3ff', '#3d5afe',
    '#9b5cff', '#e94fa5', '#ffb3d1', '#8d5a3b', '#f2c79b', '#5be0ff'];

  // Plantillas sencillas dibujadas a mano (por si se quiere algo distinto a los personajes)
  const PLANTILLAS = {
    estrella: (c, w, h) => { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42, r = R * .45; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } c.closePath(); c.stroke(); c.beginPath(); c.arc(cx, cy, r * .5, 0, 7); c.stroke(); },
    casa: (c, w, h) => { const s = Math.min(w, h); const x = w / 2 - s * .35, y = h / 2 - s * .05; c.strokeRect(x, y, s * .7, s * .42); c.beginPath(); c.moveTo(x - s * .05, y); c.lineTo(w / 2, y - s * .32); c.lineTo(x + s * .75, y); c.closePath(); c.stroke(); c.strokeRect(w / 2 - s * .07, y + s * .2, s * .14, s * .22); c.strokeRect(x + s * .07, y + s * .08, s * .14, s * .12); c.strokeRect(x + s * .49, y + s * .08, s * .14, s * .12); c.beginPath(); c.arc(x + s * .62, y - s * .3, s * .08, 0, 7); c.stroke(); },
    flor: (c, w, h) => { const cx = w / 2, cy = h * .4, R = Math.min(w, h) * .12; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.ellipse(cx + Math.cos(a) * R * 1.6, cy + Math.sin(a) * R * 1.6, R, R * .7, a, 0, 7); c.stroke(); } c.beginPath(); c.arc(cx, cy, R * .9, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx, cy + R * 2.6); c.lineTo(cx, h * .92); c.stroke(); c.beginPath(); c.ellipse(cx + R * 1.2, h * .75, R * 1.1, R * .5, -.5, 0, 7); c.stroke(); },
    mariposa: (c, w, h) => { const cx = w / 2, cy = h / 2, s = Math.min(w, h) * .2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => { c.beginPath(); c.ellipse(cx + dx * s * 1.1, cy + dy * s * (dy < 0 ? .9 : .8), s * (dy < 0 ? 1.1 : .8), s * (dy < 0 ? 1 : .7), dx * dy * .4, 0, 7); c.stroke(); c.beginPath(); c.arc(cx + dx * s * 1.2, cy + dy * s * .9, s * .3, 0, 7); c.stroke(); }); c.beginPath(); c.ellipse(cx, cy, s * .2, s * 1.4, 0, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx, cy - s * 1.3); c.quadraticCurveTo(cx - s * .6, cy - s * 2.2, cx - s * .8, cy - s * 2); c.moveTo(cx, cy - s * 1.3); c.quadraticCurveTo(cx + s * .6, cy - s * 2.2, cx + s * .8, cy - s * 2); c.stroke(); },
    corazon: (c, w, h) => { const cx = w / 2, cy = h * .42, s = Math.min(w, h) * .38; c.beginPath(); c.moveTo(cx, cy + s * .9); c.bezierCurveTo(cx - s * 1.4, cy, cx - s * .6, cy - s * .9, cx, cy - s * .3); c.bezierCurveTo(cx + s * .6, cy - s * .9, cx + s * 1.4, cy, cx, cy + s * .9); c.stroke(); c.beginPath(); c.moveTo(cx - s * .5, cy); c.bezierCurveTo(cx - s * .6, cy + s * .2, cx - s * .1, cy + s * .5, cx, cy + s * .55); c.stroke(); },
    pez: (c, w, h) => { const cx = w * .45, cy = h / 2, s = Math.min(w, h) * .3; c.beginPath(); c.ellipse(cx, cy, s * 1.2, s * .75, 0, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx + s * 1.1, cy); c.lineTo(cx + s * 1.9, cy - s * .7); c.lineTo(cx + s * 1.9, cy + s * .7); c.closePath(); c.stroke(); c.beginPath(); c.arc(cx - s * .6, cy - s * .15, s * .15, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx - s * .2, cy - s * .7); c.quadraticCurveTo(cx, cy, cx - s * .2, cy + s * .7); c.stroke(); c.beginPath(); c.moveTo(cx + s * .3, cy - s * .7); c.quadraticCurveTo(cx + s * .5, cy, cx + s * .3, cy + s * .7); c.stroke(); },
    mandala: (c, w, h) => { const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .45; [1, .8, .55, .3, .12].forEach(f => { c.beginPath(); c.arc(cx, cy, R * f, 0, 7); c.stroke(); }); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * .12, cy + Math.sin(a) * R * .12); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke(); c.beginPath(); c.arc(cx + Math.cos(a + .26) * R * .67, cy + Math.sin(a + .26) * R * .67, R * .08, 0, 7); c.stroke(); } },
  };

  /* Lienzo común: dibuja con el dedo o el Pencil */
  function lienzo(a, opts) {
    const hoja = a.h('div', { class: 'hoja arte-hoja' });
    const pintura = a.h('canvas'), lineas = a.h('canvas', { style: { pointerEvents: 'none' } });
    hoja.append(pintura, lineas);
    const cp = pintura.getContext('2d', { willReadFrequently: true }), cl = lineas.getContext('2d', { willReadFrequently: true });
    let W = 0, H = 0, dpr = 1, historial = [], lapiz = false;
    const estado = { color: '#ef4a5c', grosor: 10, herramienta: opts.herramienta || 'pincel', pegatina: null, hue: 0 };
    const guardarPaso = () => { try { historial.push(cp.getImageData(0, 0, pintura.width, pintura.height)); if (historial.length > 15) historial.shift(); } catch (e) { } };
    const ajustar = (primera) => {
      const r = hoja.getBoundingClientRect(); if (!r.width) return;
      const prev = !primera && pintura.width ? pintura.toDataURL() : null;
      dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
      [pintura, lineas].forEach(c => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
      cp.setTransform(1, 0, 0, 1, 0, 0); cp.fillStyle = '#fff'; cp.fillRect(0, 0, pintura.width, pintura.height);
      opts.alAjustar && opts.alAjustar(cl, pintura.width, pintura.height);
      if (prev) { const im = new Image(); im.onload = () => cp.drawImage(im, 0, 0, pintura.width, pintura.height); im.src = prev; }
    };
    const pt = (e) => { const r = pintura.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; };
    let ultimo = null;
    const trazo = (x, y) => {
      const t = estado.herramienta;
      cp.lineCap = 'round'; cp.lineJoin = 'round';
      if (t === 'goma') { cp.strokeStyle = '#fff'; cp.lineWidth = estado.grosor * 2.5 * dpr; }
      else if (t === 'arcoiris') { estado.hue = (estado.hue + 4) % 360; cp.strokeStyle = `hsl(${estado.hue},90%,55%)`; cp.lineWidth = estado.grosor * dpr; }
      else { cp.strokeStyle = estado.color; cp.lineWidth = estado.grosor * dpr; }
      if (t === 'spray') { cp.fillStyle = estado.color; for (let i = 0; i < 18; i++) { const a2 = Math.random() * 7, r2 = Math.random() * estado.grosor * 1.6 * dpr; cp.fillRect(x + Math.cos(a2) * r2, y + Math.sin(a2) * r2, dpr * 1.6, dpr * 1.6); } return; }
      cp.beginPath(); cp.moveTo(ultimo[0], ultimo[1]); cp.lineTo(x, y); cp.stroke();
    };
    pintura.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') lapiz = true; if (lapiz && e.pointerType === 'touch') return;
      e.preventDefault(); pintura.setPointerCapture(e.pointerId); guardarPaso();
      const [x, y] = pt(e);
      if (estado.herramienta === 'bote') { rellenar(x | 0, y | 0); return; }
      if (estado.herramienta === 'pegatina' && estado.pegatina) { estampar(x, y); return; }
      ultimo = [x, y]; trazo(x + .1, y);
    });
    pintura.addEventListener('pointermove', (e) => {
      if (!ultimo) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs) { const [x, y] = pt(ev); trazo(x, y); ultimo = [x, y]; }
    });
    const soltar = () => { if (ultimo) { ultimo = null; opts.alCambiar && opts.alCambiar(); } };
    pintura.addEventListener('pointerup', soltar); pintura.addEventListener('pointercancel', soltar);

    // Bote de pintura: rellena la zona cerrada por las líneas
    function rellenar(x0, y0) {
      const w = pintura.width, h = pintura.height;
      const pinta = cp.getImageData(0, 0, w, h), lin = cl.getImageData(0, 0, w, h).data, d = pinta.data;
      const col = estado.color.match(/\w\w/g).map(v => parseInt(v, 16));
      const i0 = (y0 * w + x0) * 4; if (lin[i0 + 3] > 100) return;
      const r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2];
      if (Math.abs(r0 - col[0]) + Math.abs(g0 - col[1]) + Math.abs(b0 - col[2]) < 10) return;
      const parecido = (i) => lin[i + 3] < 100 && Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) < 60;
      const pila = [[x0, y0]];
      while (pila.length) {
        let [x, y] = pila.pop(); let i = (y * w + x) * 4;
        while (x >= 0 && parecido(i)) { x--; i -= 4; }
        x++; i += 4; let arriba = false, abajo = false;
        while (x < w && parecido(i)) {
          d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
          if (y > 0) { const ia = i - w * 4; if (parecido(ia)) { if (!arriba) { pila.push([x, y - 1]); arriba = true; } } else arriba = false; }
          if (y < h - 1) { const ib = i + w * 4; if (parecido(ib)) { if (!abajo) { pila.push([x, y + 1]); abajo = true; } } else abajo = false; }
          x++; i += 4;
        }
      }
      cp.putImageData(pinta, 0, 0); a.sfx.pop(); opts.alCambiar && opts.alCambiar();
    }
    function estampar(x, y) {
      const s = estado.pegatina, tam = estado.grosor * 9 * dpr;
      if (s.startsWith('data:')) { const im = new Image(); im.onload = () => { const k = tam / Math.max(im.width, im.height); cp.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k); opts.alCambiar && opts.alCambiar(); }; im.src = s; }
      else { cp.font = `${tam}px system-ui`; cp.textAlign = 'center'; cp.textBaseline = 'middle'; cp.fillText(s, x, y); }
      a.sfx.pop();
    }
    const deshacer = () => { const p = historial.pop(); if (p) cp.putImageData(p, 0, 0); };
    const borrar = () => { guardarPaso(); cp.fillStyle = '#fff'; cp.fillRect(0, 0, pintura.width, pintura.height); };
    const imagenFinal = () => { const c = document.createElement('canvas'); c.width = pintura.width; c.height = pintura.height; const x = c.getContext('2d'); x.drawImage(pintura, 0, 0); x.drawImage(lineas, 0, 0); return c.toDataURL('image/jpeg', 0.75); };
    const ro = new ResizeObserver(() => ajustar(false)); requestAnimationFrame(() => { ajustar(true); ro.observe(hoja); });
    return { hoja, estado, deshacer, borrar, imagenFinal, ajustar, cl };
  }

  function barraHerramientas(a, L, herramientas, extra) {
    const herr = a.h('div', { class: 'arte-herr' });
    const botones = [];
    const marcar = (b) => { botones.forEach(x => x.classList.toggle('sel', x === b)); };
    herramientas.forEach(([id, ico, txt]) => { const b = a.h('button', { class: 'arte-btn' + (L.estado.herramienta === id ? ' sel' : ''), title: txt }, ico, a.h('small', {}, txt)); b.onclick = () => { L.estado.herramienta = id; marcar(b); a.sfx.clic(); }; botones.push(b); herr.append(b); });
    const tam = a.h('div', { class: 'arte-tam' }, [4, 10, 22].map((g, k) => { const b = a.h('button', { class: g === L.estado.grosor ? 'sel' : '' }, a.h('i', { style: { width: (8 + k * 9) + 'px', height: (8 + k * 9) + 'px' } })); b.onclick = () => { L.estado.grosor = g; tam.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); }; return b; }));
    const pal = a.h('div', { class: 'arte-paleta' }, PALETA.map(c => { const b = a.h('button', { style: { background: c }, class: c === L.estado.color ? 'sel' : '' }); b.onclick = () => { L.estado.color = c; pal.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); if (L.estado.herramienta === 'goma' || L.estado.herramienta === 'pegatina') { L.estado.herramienta = herramientas[0][0]; marcar(botones[0]); } a.sfx.clic(); }; return b; }));
    const acciones = a.h('div', { class: 'arte-acc' }, a.h('button', { class: 'arte-btn', onclick: L.deshacer }, '↩️', a.h('small', {}, 'Deshacer')),
      a.h('button', { class: 'arte-btn', onclick: () => { if (confirm('¿Borrar todo el dibujo?')) L.borrar(); } }, '🗑️', a.h('small', {}, 'Borrar')), ...(extra || []));
    return a.h('div', { class: 'arte-barra' }, herr, tam, pal, acciones);
  }

  async function guardarEnGaleria(a, L) {
    const g = (await a.leer('galeria')) || [];
    g.unshift({ f: Date.now(), img: L.imagenFinal() }); await a.guardar('galeria', g.slice(0, 30));
    a.sfx.fiesta(); a.confeti(20); a.habla('¡Guardado en tu galería!');
  }
  function galeria(a, volver) {
    a.leer('galeria').then(g => {
      g = g || [];
      a.cuerpo.replaceChildren(a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', onclick: volver }, '⬅️ Volver a dibujar')),
        g.length ? a.h('div', { class: 'galeria' }, g.map((x, k) => a.h('div', { class: 'gal-item' }, a.h('img', { src: x.img }),
          a.h('button', { class: 'gal-borrar', onclick: async () => { if (!confirm('¿Borrar este dibujo?')) return; g.splice(k, 1); await a.guardar('galeria', g); galeria(a, volver); } }, '🗑️')))) : a.h('p', { class: 'subsaludo' }, 'Todavía no has guardado ningún dibujo.'));
      a.cuerpo.style.overflowY = 'auto';
    });
  }

  /* ---------- Dibujo libre ---------- */
  M.pintar = (a) => {
    const empezar = () => {
      const L = lienzo(a, {});
      const pegs = [...Object.keys(a.D.imagenes || {}).slice(0, 40).map(k => a.D.imagenes[k][0]), '⭐', '❤️', '🌈', '🦋', '🌸', '☀️', '🎈', '🍦', '🐶', '🐱', '🦄', '🎀'];
      const tira = a.h('div', { class: 'arte-pegatinas' }, pegs.map(p => {
        const b = a.h('button', {}, p.startsWith('data:') ? a.h('img', { src: p }) : p);
        b.onclick = () => { L.estado.herramienta = 'pegatina'; L.estado.pegatina = p; tira.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b)); a.sfx.clic(); };
        return b;
      }));
      const barra = barraHerramientas(a, L, [['pincel', '🖌️', 'Pincel'], ['arcoiris', '🌈', 'Arcoíris'], ['spray', '💨', 'Spray'], ['bote', '🪣', 'Bote'], ['goma', '🧽', 'Goma']],
        [a.h('button', { class: 'arte-btn', onclick: () => guardarEnGaleria(a, L) }, '💾', a.h('small', {}, 'Guardar')), a.h('button', { class: 'arte-btn', onclick: () => galeria(a, empezar) }, '🖼️', a.h('small', {}, 'Galería'))]);
      a.cuerpo.replaceChildren(a.h('div', { class: 'arte' }, barra, a.h('div', { class: 'arte-centro' }, L.hoja, a.h('div', { class: 'nota', style: { textAlign: 'center' } }, '⭐ Pegatinas: toca una y luego toca el dibujo'), tira)));
    };
    empezar();
  };

  /* ---------- Colorear ---------- */
  M.colorear = (a) => {
    const lams = a.D.laminas || {};
    const elegir = () => {
      const tarjeta = (l) => {
        let mini;
        if (l.plantilla) { const c = document.createElement('canvas'); c.width = 200; c.height = 200; const x = c.getContext('2d'); x.lineWidth = 4; x.strokeStyle = '#1d1d2b'; PLANTILLAS[l.k](x, 200, 200); mini = c; }
        else mini = a.h('img', { src: l.img, loading: 'lazy' });
        return a.h('button', { class: 'lamina', onclick: () => { a.sfx.clic(); pintar(l); } }, mini, a.h('span', {}, l.nombre));
      };
      const reales = a.D.dibujos || [];
      const grupos = [...a.D.mundos.map(m => [m.icono + ' ' + m.titulo, reales.filter(d => d.mundo === m.id)]), ['🌟 Otros', reales.filter(d => !a.D.mundos.some(m => m.id === d.mundo))]].filter(g => g[1].length);
      a.cuerpo.replaceChildren(a.instr('¿Qué quieres colorear?'),
        ...grupos.flatMap(([t, ls]) => [a.h('div', { class: 'seccion' }, t), a.h('div', { class: 'laminas' }, ls.map(d => tarjeta({ img: d.img, nombre: d.t })))]),
        a.h('div', { class: 'seccion' }, '✏️ Personajes sencillos'), a.h('div', { class: 'laminas' }, Object.keys(lams).map(k => tarjeta({ k, img: lams[k], nombre: (a.D.personajes[k] || [k])[0] }))),
        a.h('div', { class: 'seccion' }, '🌸 Dibujos fáciles'), a.h('div', { class: 'laminas' }, Object.keys(PLANTILLAS).map(k => tarjeta({ k, plantilla: true, nombre: k.charAt(0).toUpperCase() + k.slice(1) }))));
      a.cuerpo.style.overflowY = 'auto';
    };
    const pintar = (l) => {
      const linImg = l.plantilla ? null : new Image();
      const L = lienzo(a, { herramienta: 'bote', alAjustar: (cl, w, h) => {
        cl.clearRect(0, 0, w, h);
        if (l.plantilla) { cl.lineWidth = Math.max(4, w / 160); cl.strokeStyle = '#1d1d2b'; cl.lineCap = 'round'; cl.lineJoin = 'round'; PLANTILLAS[l.k](cl, w, h); }
        else if (linImg.complete && linImg.naturalWidth) { const k = Math.min(w / linImg.width, h / linImg.height) * .94; cl.drawImage(linImg, (w - linImg.width * k) / 2, (h - linImg.height * k) / 2, linImg.width * k, linImg.height * k); }
      } });
      if (linImg) { linImg.onload = () => L.ajustar(true); linImg.src = l.img; }
      const barra = barraHerramientas(a, L, [['bote', '🪣', 'Bote'], ['pincel', '🖌️', 'Pincel'], ['arcoiris', '🌈', 'Arcoíris'], ['goma', '🧽', 'Goma']],
        [a.h('button', { class: 'arte-btn', onclick: () => guardarEnGaleria(a, L) }, '💾', a.h('small', {}, 'Guardar')), a.h('button', { class: 'arte-btn', onclick: elegir }, '🖼️', a.h('small', {}, 'Otro dibujo'))]);
      a.cuerpo.replaceChildren(a.h('div', { class: 'arte' }, barra, a.h('div', { class: 'arte-centro' }, L.hoja)));
      a.habla('Elige un color y toca dentro del dibujo');
    };
    elegir();
  };
})();
