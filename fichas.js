/* Fichas para escribir con el dedo o el Apple Pencil */
'use strict';
(() => {
  const M = App.MOTORES;
  const PLANTILLAS = {
    libre(ctx, w, hgt) { },
    lamela(ctx, w, hgt, modelo) {
      const filas = hgt < 420 ? 3 : hgt < 650 ? 4 : 5, alto = hgt / filas;
      for (let f = 0; f < filas; f++) {
        const y0 = f * alto + alto * 0.18, paso = alto * 0.2;
        // pauta Lamela: 4 líneas, la central de la x más marcada
        [[0, '#9ec5f2', 1.5], [1, '#3d8bfd', 3], [2, '#3d8bfd', 3], [3, '#9ec5f2', 1.5]].forEach(([k, c, g]) => {
          ctx.strokeStyle = c; ctx.lineWidth = g; ctx.setLineDash(k === 0 || k === 3 ? [8, 8] : []);
          ctx.beginPath(); ctx.moveTo(20, y0 + k * paso); ctx.lineTo(w - 20, y0 + k * paso); ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,213,74,.18)'; ctx.fillRect(20, y0 + paso, w - 40, paso);
        if (modelo && f < 3) {
          ctx.fillStyle = f === 0 ? 'rgba(45,42,74,.85)' : 'rgba(45,42,74,.18)';
          ctx.font = `${paso * 2.6}px "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive`;
          ctx.textBaseline = 'alphabetic';
          const texto = (modelo + '   ').repeat(30);
          ctx.fillText(texto, 30, y0 + paso * 2);
        }
      }
    },
    noticia(ctx, w, hgt) {
      ctx.fillStyle = '#6b5bd6'; ctx.font = 'bold 34px ui-rounded, system-ui'; ctx.textAlign = 'center'; ctx.fillText('📰 LA NOTICIA', w / 2, 46); ctx.textAlign = 'left';
      const caja = (x, y, cw, ch, t, lineas) => {
        ctx.strokeStyle = '#6b5bd6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 16); ctx.stroke();
        ctx.fillStyle = '#e94fa5'; ctx.font = 'bold 22px ui-rounded, system-ui'; ctx.fillText(t, x + 14, y + 30);
        ctx.strokeStyle = '#c9d6f5'; ctx.lineWidth = 1.5;
        for (let k = 1; k <= lineas; k++) { const yy = y + 30 + k * ((ch - 40) / (lineas + 0.3)); ctx.beginPath(); ctx.moveTo(x + 14, yy); ctx.lineTo(x + cw - 14, yy); ctx.stroke(); }
      };
      const m = 20, top = 66, W = w - 2 * m;
      caja(m, top, W, hgt * 0.14, 'TITULAR', 1);
      const y2 = top + hgt * 0.14 + 12;
      if (w < 560) { // móvil: una columna
        const h2 = hgt * 0.11; ['¿QUÉ PASÓ?', '¿QUIÉN?', '¿DÓNDE?', '¿CUÁNDO?'].forEach((t, k) => caja(m, y2 + k * (h2 + 8), W, h2, t, 1));
        const y3 = y2 + 4 * (h2 + 8); caja(m, y3, W, hgt - y3 - m, 'DIBUJO', 0);
      } else {
        const colW = (W - 12) / 2, h2 = hgt * 0.17;
        caja(m, y2, colW, h2, '¿QUÉ PASÓ?', 2); caja(m + colW + 12, y2, colW, h2, '¿QUIÉN?', 2);
        caja(m, y2 + h2 + 12, colW, h2, '¿DÓNDE?', 2); caja(m + colW + 12, y2 + h2 + 12, colW, h2, '¿CUÁNDO?', 2);
        const y3 = y2 + 2 * h2 + 24; caja(m, y3, W, hgt - y3 - m, 'DIBUJO', 0);
      }
    },
    titular(ctx, w, hgt) {
      ctx.fillStyle = '#6b5bd6'; ctx.font = 'bold 34px ui-rounded, system-ui'; ctx.textAlign = 'center'; ctx.fillText('🗞️ TITULAR', w / 2, 46); ctx.textAlign = 'left';
      ctx.strokeStyle = '#6b5bd6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(20, 66, w - 40, hgt * 0.22, 16); ctx.stroke();
      ctx.strokeStyle = '#c9d6f5'; for (let k = 1; k <= 2; k++) { const y = 66 + k * hgt * 0.07; ctx.beginPath(); ctx.moveTo(34, y); ctx.lineTo(w - 34, y); ctx.stroke(); }
      ctx.strokeStyle = '#6b5bd6'; ctx.beginPath(); ctx.roundRect(20, 80 + hgt * 0.22, w - 40, hgt - 100 - hgt * 0.22, 16); ctx.stroke();
      ctx.fillStyle = '#e94fa5'; ctx.font = 'bold 22px ui-rounded, system-ui'; ctx.fillText('DIBUJO', 34, 110 + hgt * 0.22);
    },
  };

  M.ficha = (a, d) => {
    const tipo = d.plantilla || 'libre', clave = 'ficha-' + a.j.id;
    const hoja = a.h('div', { class: 'hoja' });
    const fondo = a.h('canvas'), tinta = a.h('canvas'); hoja.append(fondo, tinta);
    const ctxF = fondo.getContext('2d'), ctx = tinta.getContext('2d');
    let color = '#2d2a4a', grosor = 5, goma = false, modelo = tipo === 'lamela' ? 'a' : '', trazos = [], actual = null, usaLapiz = false, dpr = 1, W = 0, H = 0;
    const ajustar = () => {
      const r = hoja.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
      [fondo, tinta].forEach(c => { c.width = W * dpr; c.height = H * dpr; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
      ctxF.fillStyle = '#fff'; ctxF.fillRect(0, 0, W, H); PLANTILLAS[tipo](ctxF, W, H, modelo); redibujar();
    };
    const redibujar = () => {
      ctx.clearRect(0, 0, W, H);
      for (const t of trazos) {
        ctx.globalCompositeOperation = t.goma ? 'destination-out' : 'source-over';
        ctx.strokeStyle = t.c; ctx.lineWidth = t.g; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); t.p.forEach(([x, y], k) => k ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)); if (t.p.length === 1) ctx.lineTo(t.p[0][0] * W + .1, t.p[0][1] * H); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    };
    const pto = (e) => { const r = tinta.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    tinta.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') usaLapiz = true;
      if (usaLapiz && e.pointerType === 'touch') return; // ignora la palma si se usa el Pencil
      e.preventDefault(); tinta.setPointerCapture(e.pointerId);
      actual = { c: color, g: goma ? grosor * 5 : grosor, goma, p: [pto(e)] }; trazos.push(actual); redibujar();
    });
    tinta.addEventListener('pointermove', (e) => {
      if (!actual) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      evs.forEach(ev => actual.p.push(pto(ev))); redibujar();
    });
    const soltar = () => { if (actual) { actual = null; a.guardar(clave, trazos.slice(-600)); } };
    tinta.addEventListener('pointerup', soltar); tinta.addEventListener('pointercancel', soltar);

    const herr = a.h('div', { class: 'herr' });
    const colores = ['#2d2a4a', '#3d8bfd', '#ef4a5c', '#2fb45a', '#f39c33', '#9b5cff'];
    const botones = [];
    colores.forEach(c => { const b = a.h('button', { style: { background: c } }, ''); b.onclick = () => { color = c; goma = false; sel(b); }; botones.push(b); herr.append(b); });
    const bG = a.h('button', {}, '🧽'); bG.onclick = () => { goma = true; sel(bG); }; botones.push(bG);
    const sel = (b) => { botones.forEach(x => x.classList.toggle('sel', x === b)); a.sfx.clic(); };
    herr.append(bG,
      a.h('button', { onclick: () => { grosor = grosor === 5 ? 10 : grosor === 10 ? 3 : 5; a.sfx.clic(); } }, '✏️'),
      a.h('button', { onclick: () => { trazos.pop(); redibujar(); a.guardar(clave, trazos); } }, '↩️'),
      a.h('button', { onclick: () => { if (confirm('¿Borrar toda la ficha?')) { trazos = []; redibujar(); a.guardar(clave, trazos); } } }, '🗑️'),
      a.h('button', { title: 'Pantalla grande', onclick: () => { const g = document.body.classList.toggle('ficha-grande'); a.sfx.clic(); setTimeout(ajustar, 50); grande.textContent = g ? '↙️' : '⛶'; } }, '⛶'),
      a.h('button', { onclick: () => { document.body.classList.remove('ficha-grande'); a.fin('¡Ficha terminada!'); } }, '✅'));
    const grande = herr.querySelector('button[title="Pantalla grande"]');
    sel(botones[0]);
    const extra = [];
    if (tipo === 'lamela') {
      const letras = ['a', 'e', 'i', 'o', 'u', 'm', 'p', 'l', 's', 't', 'n', 'd', 'b', 'r', 'c', 'g', 'f', 'j', 'mamá', 'papá', a.D.hija];
      extra.push(a.h('div', { class: 'letras-modelo', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '8px' } },
        letras.map(L => a.h('button', { class: 'tecla', style: { width: 'auto', minWidth: '56px', padding: '0 10px', height: '52px', fontSize: '24px' }, onclick: () => { modelo = L; trazos = []; ajustar(); a.guardar(clave, trazos); a.habla(L); } }, L))));
    }
    a.cuerpo.replaceChildren(...extra, a.h('div', { class: 'ficha-wrap' }, hoja, herr));
    a.leer(clave).then(t => { if (Array.isArray(t)) trazos = t; requestAnimationFrame(ajustar); });
    const ro = new ResizeObserver(() => ajustar()); ro.observe(hoja);
  };
})();
