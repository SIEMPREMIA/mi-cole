/* Juegos de clase: rehechos para funcionar sin internet, con la misma dinámica que en el cole
   (pantalla de Iniciar, cronómetro, aciertos arriba, «Inténtalo de nuevo», «Enviar respuestas» y pantalla de Juego completado). */
'use strict';
(() => {
  const M = App.MOTORES;
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* ---------- Marco común ---------- */
  function marco(a, cfg, jugar) {
    // cfg: { tema, plantilla, titulo, instr, cuentaAtras }
    const caja = a.h('div', { class: 'ww ww-' + (cfg.tema || 'clasico') });
    a.cuerpo.replaceChildren(caja); a.cuerpo.style.overflowY = 'hidden';
    const portada = () => {
      caja.replaceChildren(a.h('div', { class: 'ww-portada' },
        a.h('div', { class: 'ww-plantilla' }, cfg.plantilla),
        a.h('div', { class: 'ww-titulo' }, cfg.titulo),
        a.h('button', { class: 'ww-iniciar', onclick: () => { a.sfx.clic(); empezar(); } }, a.h('span', {}, '▶'), 'INICIAR'),
        a.h('div', { class: 'ww-instr' }, cfg.instr)));
    };
    const empezar = () => {
      const t0 = Date.now(); let ok = 0, bonus = 0, parado = false;
      const reloj = a.h('span', { class: 'ww-reloj' }), cont = a.h('span', { class: 'ww-cont' }, '✓ 0');
      const tick = setInterval(() => {
        if (parado) return; const s = (Date.now() - t0) / 1000;
        if (cfg.cuentaAtras) { const q = Math.max(0, cfg.cuentaAtras - s); reloj.textContent = mmss(q); if (q <= 0) { parado = true; api.terminar(); } }
        else reloj.textContent = mmss(s);
      }, 250);
      reloj.textContent = cfg.cuentaAtras ? mmss(cfg.cuentaAtras) : '0:00';
      const mensaje = a.h('div', { class: 'ww-mensaje' });
      const zona = a.h('div', { class: 'ww-zona' });
      const pie = a.h('div', { class: 'ww-pie' });
      caja.replaceChildren(a.h('div', { class: 'ww-hud' }, reloj, mensaje, cont), zona, pie);
      let terminado = false;
      const api = {
        zona, pie,
        sumar: (n = 1) => { ok += n; cont.textContent = '✓ ' + ok; cont.classList.remove('salta'); void cont.offsetWidth; cont.classList.add('salta'); },
        bonus: (n, el) => { bonus += n; if (el) { const b = a.h('div', { class: 'ww-bonus' }, '+' + n); el.append(b); setTimeout(() => b.remove(), 900); } },
        aviso: (t, tipo) => { mensaje.textContent = t; mensaje.className = 'ww-mensaje ' + (tipo || ''); clearTimeout(api._m); api._m = setTimeout(() => { mensaje.textContent = ''; }, 1600); },
        terminar: (total, revisar) => {
          if (terminado) return; terminado = true; parado = true; clearInterval(tick);
          const seg = (Date.now() - t0) / 1000; total = total ?? api.total;
          const r = a.registrar(ok, Math.max(0, total - ok));
          a.sfx.fiesta(); App.Musica.fanfarria(); if (ok / Math.max(1, total) >= 0.6) a.confeti(30);
          a.habla(ok === total ? '¡Perfecto!' : '¡Juego completado!');
          caja.replaceChildren(a.h('div', { class: 'ww-final' },
            a.h('div', { class: 'ww-final-caja' },
              a.h('div', { class: 'ww-final-tit' }, 'JUEGO COMPLETADO'),
              a.h('div', { class: 'ww-final-datos' },
                a.h('div', {}, a.h('small', {}, 'Puntuación'), a.h('b', {}, ok + (bonus ? ' (+' + bonus + ')' : '') + ' / ' + total)),
                a.h('div', {}, a.h('small', {}, 'Hora'), a.h('b', {}, mmss(seg)))),
              r ? a.h('div', { class: 'ww-estrellas' }, '⭐'.repeat(r.est) + '☆'.repeat(3 - r.est), r.pegatina ? a.h('div', { class: 'ww-peg' }, '🎁 ¡Nueva pegatina! ' + r.pegatina) : null) : null,
              revisar ? a.h('button', { class: 'ww-boton', onclick: () => { a.sfx.clic(); revisar(caja, () => a.reiniciar()); } }, 'Mostrar respuestas') : null,
              a.h('button', { class: 'ww-boton', onclick: () => { a.sfx.clic(); a.reiniciar(); } }, 'Volver a empezar'))));
        },
      };
      jugar(api);
    };
    portada();
  }
  function revisarLista(a, filas) {
    return (caja, volver) => caja.replaceChildren(a.h('div', { class: 'ww-revisar' },
      a.h('div', { class: 'ww-final-tit' }, 'RESPUESTAS'),
      a.h('div', { class: 'ww-lista' }, filas.map(([p, r, bien]) => a.h('div', { class: 'ww-fila ' + (bien ? 'bien' : 'mal') }, a.h('span', {}, bien ? '✔' : '✘'), a.h('span', { class: 'p' }, p), a.h('b', {}, r)))),
      a.h('button', { class: 'ww-boton', onclick: volver }, 'Volver a empezar')));
  }
  const esEmoji = (s) => /^\p{Extended_Pictographic}/u.test(String(s)) && String(s).length <= 8;

  /* ---------- Cuestionario ---------- */
  M['ww-quiz'] = (a, d) => {
    const lista = d.orden ? d.preguntas.slice() : a.mezclar(d.preguntas);
    marco(a, { tema: d.tema || 'clasico', plantilla: 'Cuestionario', titulo: d.titulo || a.j.titulo, instr: 'Una serie de preguntas de opción múltiple. Pulsa la respuesta correcta para continuar.' }, (w) => {
      w.total = lista.length; let i = 0; const hechas = [];
      const colores = ['#2c8de8', '#e5394c', '#f28a1e', '#24a148', '#9b5cff', '#e94fa5'];
      const paso = () => {
        if (i >= lista.length) return w.terminar(lista.length, revisarLista(a, hechas));
        const p = lista[i]; let intentos = 0;
        const ops = p.ops ? p.ops.slice() : a.mezclar([p.r, ...p.mal]);
        const fotos = ops.every(esEmoji);
        const rej = a.h('div', { class: 'ww-opciones' + (fotos ? ' fotos' : '') }, ops.map((o, k) => {
          const b = a.h('button', { class: 'ww-op', style: { '--c': colores[k % colores.length] } }, fotos ? a.h('span', { class: 'ww-foto' }, o) : o);
          b.onclick = () => {
            if (rej.dataset.bloq || b.dataset.mal) return;
            if (o === p.r) {
              rej.dataset.bloq = 1; b.classList.add('acierto'); b.append(a.h('i', { class: 'ww-marca' }, '✔'));
              if (intentos === 0) { w.sumar(); a.acierto(); } else a.sfx.bien();
              hechas.push([p.q, p.r, intentos === 0]);
              rej.querySelectorAll('.ww-op').forEach(x => { if (x !== b) x.classList.add('apagada'); });
              setTimeout(() => { i++; paso(); }, 1000);
            } else {
              intentos++; b.dataset.mal = 1; b.classList.add('error'); b.append(a.h('i', { class: 'ww-marca' }, '✘')); a.fallo(b);
              if (intentos === 1) w.aviso('Inténtalo de nuevo', 'mal');
              else { // segundo fallo: enseña la buena y sigue
                rej.dataset.bloq = 1; hechas.push([p.q, p.r, false]);
                const buena = [...rej.children].find(x => x.textContent.startsWith(p.r) || x.querySelector('.ww-foto')?.textContent === p.r);
                buena && buena.classList.add('revela'); setTimeout(() => { i++; paso(); }, 1600);
              }
            }
          };
          return b;
        }));
        w.zona.replaceChildren(a.h('div', { class: 'ww-pregunta' }, a.btnHablar(p.q), a.h('span', {}, p.q)), rej);
        w.pie.replaceChildren(a.h('span', { class: 'ww-pagina' }, (i + 1) + ' de ' + lista.length));
        a.progreso(i, lista.length);
      };
      paso();
    });
  };

  /* ---------- Reordenar (Ordenar frases) ---------- */
  M['ww-ordenar'] = (a, d) => {
    const frases = d.frases.slice();
    marco(a, { tema: d.tema || 'color', plantilla: 'Reordenar', titulo: d.titulo || 'FRASES', instr: 'Arrastra y suelta palabras para reordenar cada oración correctamente.', cuentaAtras: d.cuentaAtras }, (w) => {
      w.total = frases.length; let i = 0; const hechas = [];
      const paso = () => {
        if (i >= frases.length) return w.terminar(frases.length, revisarLista(a, hechas));
        const f = frases[i], pal = f.split(/\s+/);
        let orden = a.mezclar(pal.map((t, k) => ({ t, k }))); let n = 0;
        while (pal.length > 1 && orden.every((x, k) => x.t === pal[k])) orden = a.mezclar(orden);
        const minMov = (() => { const perm = orden.map(x => x.k), vis = []; let ciclos = 0; for (let s0 = 0; s0 < perm.length; s0++) { if (vis[s0]) continue; ciclos++; let x = s0; while (!vis[x]) { vis[x] = true; x = perm[x]; } } return Math.max(1, perm.length - ciclos); })();
        let movs = 0;
        const fila = a.h('div', { class: 'ww-tiras' });
        const bono = a.h('div', { class: 'ww-bono' });
        const pintar = () => {
          bono.textContent = Math.max(0, minMov - movs) + ' movimiento' + (minMov - movs === 1 ? '' : 's') + ' para el bono';
          fila.replaceChildren(...orden.map((x, k) => {
            const b = a.h('div', { class: 'ww-tira' + (x.t === pal[k] ? ' bien' : ''), 'data-k': k }, x.t);
            a.arrastrable(b, { destinos: '.ww-tira', alSoltar: (dest) => {
              if (!dest || dest === b) return;
              const j2 = +dest.dataset.k; [orden[k], orden[j2]] = [orden[j2], orden[k]]; movs++; a.sfx.clic(); pintar(); comprobar(dest);
            }, alTocar: () => {
              // tocar dos palabras también las intercambia
              if (fila._sel == null) { fila._sel = k; b.classList.add('sel'); return; }
              const j2 = fila._sel; fila._sel = null; if (j2 === k) return pintar();
              [orden[k], orden[j2]] = [orden[j2], orden[k]]; movs++; a.sfx.clic(); pintar(); comprobar(b);
            } });
            return b;
          }));
        };
        const comprobar = (el) => {
          if (!orden.every((x, k) => x.t === pal[k])) return;
          const conBono = movs <= minMov; w.sumar(); a.acierto(); if (conBono) w.bonus(5, w.zona); else w.bonus(1, w.zona);
          hechas.push([orden.map(x => x.t).join(' '), f, true]); fila.classList.add('completa'); a.habla(f);
          setTimeout(() => { i++; paso(); }, 1500);
        };
        pintar();
        w.zona.replaceChildren(bono, fila);
        w.pie.replaceChildren(a.h('button', { class: 'ww-flecha', onclick: () => { if (i > 0) { i--; paso(); } } }, '◁'), a.h('span', { class: 'ww-pagina' }, (i + 1) + ' de ' + frases.length),
          a.h('button', { class: 'ww-flecha', onclick: () => { hechas.push([orden.map(x => x.t).join(' '), f, false]); i++; paso(); } }, '▷'));
        a.progreso(i, frases.length);
      };
      paso();
    });
  };

  /* ---------- Une las parejas (Agrupamientos) ---------- */
  M['ww-parejas'] = (a, d) => {
    marco(a, { tema: d.tema || 'pizarra', plantilla: 'Une las parejas', titulo: d.titulo || a.j.titulo, instr: 'Arrastra y suelta cada palabra junto a su definición.' }, (w) => {
      const pares = d.pares; w.total = pares.length;
      const izq = a.h('div', { class: 'ww-col-palabras' }), der = a.h('div', { class: 'ww-col-defs' });
      const huecos = pares.map(([clave, def], k) => {
        const hueco = a.h('div', { class: 'ww-hueco', 'data-k': k });
        der.append(a.h('div', { class: 'ww-def' }, hueco, a.h('div', { class: 'ww-texto-def' }, def)));
        return hueco;
      });
      let sel = null;
      const colocar = (b, hueco) => {
        const viejo = hueco.firstChild; if (viejo && viejo !== b) izq.append(viejo);
        hueco.append(b); a.sfx.clic(); sel && sel.classList.remove('sel'); sel = null; enviar.disabled = huecos.some(x => !x.firstChild);
      };
      a.mezclar(pares.map(([c], k) => ({ c, k }))).forEach(({ c, k }) => {
        const b = a.h('div', { class: 'ww-palabra', 'data-k': k }, c);
        a.arrastrable(b, { destinos: '.ww-hueco, .ww-col-palabras', alSoltar: (z) => { if (!z) return; if (z.classList.contains('ww-hueco')) colocar(b, z); else { izq.append(b); enviar.disabled = true; } },
          alTocar: () => { sel && sel.classList.remove('sel'); sel = b; b.classList.add('sel'); } });
        izq.append(b);
      });
      huecos.forEach(hu => hu.addEventListener('click', () => sel && colocar(sel, hu)));
      const enviar = a.h('button', { class: 'ww-enviar', disabled: true, onclick: () => {
        let ok = 0; const filas = [];
        huecos.forEach((hu, k) => { const b = hu.firstChild; const bien = b && +b.dataset.k === k; if (bien) ok++; hu.classList.add(bien ? 'bien' : 'mal'); hu.append(a.h('i', { class: 'ww-marca' }, bien ? '✔' : '✘')); filas.push([pares[k][1], pares[k][0], bien]); });
        for (let n = 0; n < ok; n++) w.sumar(); ok === pares.length ? a.acierto() : a.fallo();
        enviar.disabled = true; setTimeout(() => w.terminar(pares.length, revisarLista(a, filas)), 2000);
      } }, 'Enviar respuestas');
      w.zona.replaceChildren(a.h('div', { class: 'ww-parejas' }, izq, der));
      w.pie.replaceChildren(enviar);
    });
  };

  /* ---------- Diagrama con etiquetas (Mapas de clase) ---------- */
  M['ww-mapa'] = (a, d) => {
    marco(a, { tema: 'clasico', plantilla: 'Diagrama con etiquetas', titulo: d.titulo || a.j.titulo, instr: 'Arrastra y suelta las chinchetas en su lugar correcto de la imagen.' }, (w) => {
      const MP = a.D.mapas, NS = 'http://www.w3.org/2000/svg';
      const mk = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
      let capa = d.capa === 'ccaa' ? MP.ccaa : MP.provincias, elementos;
      if (d.capa === 'ccaa' || d.capa === 'provincias') elementos = capa.map(c => ({ id: c.id, c: c.c }));
      else if (d.capa === 'rios') elementos = MP.rios.map(r => ({ id: r.id, c: r.c }));
      else elementos = [...MP.rios.map(r => ({ id: (d.prefijoRio || '') + r.id, base: r.id, c: r.c })), ...MP.montanas.map(m => ({ id: m.id, c: m.c }))];
      if (d.incluir) elementos = elementos.filter(e => d.incluir.includes(e.base || e.id));
      if (d.nombres) elementos.forEach(e => { if (d.nombres[e.base || e.id]) e.id = d.nombres[e.base || e.id]; });
      w.total = elementos.length;
      const svg = mk('svg', { viewBox: MP.viewBox, class: 'ww-mapa-svg', preserveAspectRatio: 'xMidYMid meet' });
      svg.append(mk('path', { d: MP.vecinos, class: 'vecino' }));
      const pinta = { ccaa: ['#f7a8b8', '#ffd27f', '#a8e6a1', '#9ad0ff', '#d7b3ff', '#ffb38a', '#fff38a', '#8fe3d4'], otras: ['#f6dcae'] };
      capa.forEach((c, k) => svg.append(mk('path', { d: c.d, fill: d.capa === 'ccaa' || d.capa === 'provincias' ? pinta.ccaa[k % 8] : '#f6e2b3', stroke: '#6b5a44', 'stroke-width': 1.4 })));
      if (d.capa === 'rios' || d.capa === 'relieve') MP.rios.forEach(r => svg.append(mk('path', { d: r.d, fill: 'none', stroke: '#1f74d8', 'stroke-width': 5, 'stroke-linecap': 'round' })));
      if (d.capa === 'relieve') MP.montanas.forEach(m => svg.append(mk('path', { d: m.d, fill: 'none', stroke: '#7a4a1a', 'stroke-width': 9, 'stroke-dasharray': '1 14', 'stroke-linecap': 'round' })));
      const [cx, cy, cw, ch] = MP.canarias; svg.append(mk('rect', { x: cx, y: cy, width: cw, height: ch, fill: 'none', stroke: '#555', 'stroke-width': 2, rx: 6 }));
      const pines = {};
      elementos.forEach(e => { const g = mk('g', { class: 'ww-pin', 'data-id': e.id }); g.append(mk('circle', { cx: e.c[0], cy: e.c[1], r: 10, fill: '#fff', stroke: '#222', 'stroke-width': 3 })); svg.append(g); pines[e.id] = { g, e, etiqueta: null }; });
      const lineas = mk('svg', { class: 'ww-lineas' });
      const mapa = a.h('div', { class: 'ww-mapa-centro' }, svg);
      const colI = a.h('div', { class: 'ww-etiquetas' }), colD = a.h('div', { class: 'ww-etiquetas' });
      const escena = a.h('div', { class: 'ww-diagrama' }, colI, mapa, colD, lineas);
      const colores = ['#e5394c', '#2c8de8', '#24a148', '#f28a1e', '#9b5cff', '#e94fa5', '#00a8a8'];
      const etiquetas = a.mezclar(elementos).map((e, k) => {
        const b = a.h('div', { class: 'ww-etiqueta', style: { '--c': colores[k % colores.length] } }, e.id.toUpperCase()); b._id = e.id;
        b._casa = k % 2 ? colD : colI; b._casa.append(b); b._pin = null;
        a.arrastrable(b, { alSoltar: (_, el, ev) => soltar(b, ev.clientX, ev.clientY), alTocar: () => { sel && sel.classList.remove('sel'); sel = b; b.classList.add('sel'); } });
        return b;
      });
      let sel = null;
      const pinMasCercano = (x, y) => {
        const p = svg.createSVGPoint(); p.x = x; p.y = y; const m = svg.getScreenCTM(); if (!m) return null; const q = p.matrixTransform(m.inverse());
        let mejor = null, dm = 1e9; for (const id in pines) { const e = pines[id].e; const dd = Math.hypot(e.c[0] - q.x, e.c[1] - q.y); if (dd < dm) { dm = dd; mejor = id; } }
        return dm < 60 ? mejor : null;
      };
      const soltar = (b, x, y) => {
        const id = pinMasCercano(x, y);
        if (b._pin) { pines[b._pin].etiqueta = null; b._pin = null; }
        if (id) { const otra = pines[id].etiqueta; if (otra) { otra._pin = null; } pines[id].etiqueta = b; b._pin = id; a.sfx.clic(); }
        sel && sel.classList.remove('sel'); sel = null; dibujar();
      };
      svg.addEventListener('click', (ev) => { if (sel) soltar(sel, ev.clientX, ev.clientY); });
      const dibujar = () => {
        const r0 = escena.getBoundingClientRect(); lineas.setAttribute('viewBox', `0 0 ${r0.width} ${r0.height}`); lineas.innerHTML = '';
        etiquetas.forEach(b => {
          b.classList.toggle('puesta', !!b._pin);
          if (!b._pin) return;
          const rb = b.getBoundingClientRect(), rp = pines[b._pin].g.getBoundingClientRect();
          const xb = (b._casa === colI ? rb.right : rb.left) - r0.left, yb = rb.top + rb.height / 2 - r0.top, xp = rp.left + rp.width / 2 - r0.left, yp = rp.top + rp.height / 2 - r0.top;
          lineas.append(mk('line', { x1: xb, y1: yb, x2: xp, y2: yp, stroke: getComputedStyle(b).getPropertyValue('--c') || '#333', 'stroke-width': 3 }));
          lineas.append(mk('circle', { cx: xp, cy: yp, r: 7, fill: getComputedStyle(b).getPropertyValue('--c') || '#333' }));
        });
        enviar.disabled = etiquetas.some(b => !b._pin);
      };
      const ro = new ResizeObserver(dibujar); ro.observe(escena);
      const enviar = a.h('button', { class: 'ww-enviar', disabled: true, onclick: () => {
        let ok = 0; const filas = [];
        etiquetas.forEach(b => { const bien = b._pin === b._id; if (bien) ok++; b.classList.add(bien ? 'bien' : 'mal'); b.append(a.h('i', { class: 'ww-marca' }, bien ? '✔' : '✘')); filas.push([b._id, bien ? '✔ bien colocado' : 'estaba mal colocado', bien]); });
        for (let n = 0; n < ok; n++) w.sumar(); ok === etiquetas.length ? a.acierto() : a.fallo();
        enviar.disabled = true; setTimeout(() => w.terminar(etiquetas.length, revisarLista(a, filas)), 2200);
      } }, 'Enviar respuestas');
      w.zona.replaceChildren(escena); w.pie.replaceChildren(enviar);
      requestAnimationFrame(dibujar);
    });
  };
})();
