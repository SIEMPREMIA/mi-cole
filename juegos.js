/* Motores de juego tipo Wordwall, pensados para el dedo */
'use strict';
(() => {
  const M = App.MOTORES;
  // Pista automática para problemas: ¿sumo o resto?
  const pistaProblema = (q) => {
    const t = String(q).toLowerCase(); if (!/\d/.test(t)) return null;
    if (/(quedan|queda|le faltan|faltan|pierde|pierden|regala|se come|se comen|gasta|vende|se rompen|se escapan|bajan|se caen|talan|menos)/.test(t)) return 'Si se quita, se pierde o se regala… ¡restamos!';
    if (/(cada una|cada uno|veces|doble)/.test(t)) return 'Si se repite varias veces… ¡suma lo mismo varias veces!';
    if (/(más|total|entre los dos|entre las dos|juntan|compra|llegan|le da|le dan|en total|ahora)/.test(t)) return 'Si se junta o se añade… ¡sumamos!';
    return 'Lee el problema despacito y busca los números.';
  };
  const esEmoji = (s) => /^\p{Extended_Pictographic}/u.test(String(s)) && String(s).length <= 8;

  /* Cuestionario */
  M.quiz = (a, d) => {
    let lista = d.orden ? d.preguntas.slice() : a.mezclar(d.preguntas); if (d.pocas) lista = lista.slice(0, d.pocas);
    let i = 0;
    const paso = () => {
      if (i >= lista.length) return a.fin();
      a.progreso(i, lista.length);
      const p = lista[i]; let fallado = false;
      a.pista(p.pista || pistaProblema(p.q));
      const ops = a.mezclar([p.r, ...p.mal]);
      const emo = ops.every(esEmoji);
      const caja = a.h('div', { class: 'opciones', style: ops.length === 2 ? {} : {} });
      ops.forEach(o => {
        const b = a.h('button', { class: 'op' + (emo ? ' emoji' : ''), onclick: () => {
          if (b.dataset.bloq) return;
          if (o === p.r) {
            if (!fallado) a.acierto(b); else a.sfx.bien(); b.classList.add('ok'); caja.querySelectorAll('button').forEach(x => x.dataset.bloq = 1);
            let t = 900;
            if (p.pjr) { const k = a.pjPorNombre(p.r); if (k) { const pop = a.h('div', { class: 'pop-pj' }, a.pj(k, 'pj'), a.h('b', {}, p.r)); document.body.append(pop); a.habla(p.r); setTimeout(() => pop.remove(), 1700); t = 1800; } }
            a.espera(() => { i++; paso(); }, t);
          }
          else { if (!fallado) a.fallo(b); else a.sfx.mal(); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, o);
        caja.append(b);
      });
      a.cuerpo.replaceChildren(a.h('div', { class: 'pregunta' }, p.pj ? a.h('span', { class: 'img' }, a.pj(p.pj, 'pj pj-preg')) : p.img ? a.h('span', { class: 'img' }, p.img) : null, a.h('div', { class: 'instr', style: { margin: 0 } }, a.btnHablar(p.q), a.h('span', {}, p.q))), caja);
    };
    paso();
  };

  /* Reordenar frases */
  M.ordenar = (a, d) => {
    const frases = a.mezclar(d.frases); let i = 0;
    const paso = () => {
      if (i >= frases.length) return a.fin();
      a.progreso(i, frases.length);
      const f = frases[i], pal = f.split(/\s+/); let pos = 0, fallado = false;
      a.pista('La frase empieza por «' + pal[0] + '»');
      const zona = a.h('div', { class: 'zona', style: { minHeight: '120px', fontSize: '28px' } });
      let mezc = a.mezclar(pal); if (pal.length > 1) while (mezc.join(' ') === f) mezc = a.mezclar(pal);
      const banco = a.h('div', { class: 'banco' });
      mezc.forEach(w => {
        const b = a.h('button', { class: 'ficha-palabra' }, w);
        const colocar = () => {
          if (b.dataset.bloq) return;
          if (w === pal[pos]) {
            a.sfx.clic(); b.dataset.bloq = 1; b.style.visibility = 'hidden';
            zona.append(a.h('span', { class: 'ficha-palabra', style: { background: '#c9f5c2' } }, w)); pos++;
            if (pos === pal.length) { fallado ? a.sfx.bien() : a.acierto(zona); a.habla(f); a.espera(() => { i++; paso(); }, 1600); }
          } else { if (!fallado) a.fallo(b); else a.sfx.mal(); fallado = true; b.classList.remove('mal'); void b.offsetWidth; b.classList.add('mal'); setTimeout(() => b.classList.remove('mal'), 450); }
        };
        a.arrastrable(b, { destinos: '.zona', alTocar: colocar, alSoltar: (dest) => { if (dest) colocar(); } });
        banco.append(b);
      });
      a.cuerpo.replaceChildren(a.instr(d.mayus ? 'TOCA O ARRASTRA LAS PALABRAS EN ORDEN' : 'Toca o arrastra las palabras en orden'), zona, banco,
        a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#f39c33' }, onclick: () => { a.habla(f); } }, '💡 Pista (escuchar)')));
    };
    paso();
  };

  /* Ordenar por grupos */
  M.grupos = (a, d) => {
    const nombres = Object.keys(d.grupos);
    let items = []; nombres.forEach(n => a.mezclar(d.grupos[n]).slice(0, d.max || 5).forEach(t => items.push({ t, g: n })));
    items = a.mezclar(items); const total = items.length; let hechos = 0;
    const cols = a.h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${nombres.length},1fr)`, gap: '14px', marginBottom: '14px' } },
      nombres.map(n => a.h('div', { class: 'zona', 'data-g': n, style: { minHeight: '180px', flexDirection: 'column', alignItems: 'stretch' } },
        a.h('div', { style: { fontWeight: 900, fontSize: '24px', textAlign: 'center', color: 'var(--morado)' } }, n))));
    const banco = a.h('div', { class: 'banco' });
    let sel = null;
    const meter = (b, it, zona) => {
      if (zona.dataset.g === it.g) {
        a.acierto(); b.remove(); hechos++;
        zona.append(a.h('span', { class: 'ficha-palabra hecha', style: { fontSize: '20px', minHeight: '48px' } }, it.t)); a.progreso(hechos, total);
        if (hechos === total) a.espera(() => a.fin(), 900);
      } else a.fallo(b);
      sel && sel.classList.remove('sel'); sel = null;
    };
    items.forEach(it => {
      const b = a.h('button', { class: 'ficha-palabra' }, it.t);
      a.arrastrable(b, { destinos: '.zona', alSoltar: (z) => z && meter(b, it, z), alTocar: () => { sel && sel.classList.remove('sel'); sel = b; b.classList.add('sel'); b._it = it; a.sfx.clic(); } });
      banco.append(b);
    });
    cols.querySelectorAll('.zona').forEach(z => z.addEventListener('click', () => { if (sel) meter(sel, sel._it, z); }));
    a.cuerpo.replaceChildren(a.instr(a.j.instr || 'Arrastra cada palabra a su grupo'), cols, banco);
    a.cuerpo.style.overflowY = 'auto';
  };

  /* Une las parejas (toca uno de cada columna) */
  M.parejas = (a, d) => {
    const pares = a.mezclar(d.pares).slice(0, d.max || 6); let hechos = 0, selI = null;
    const izq = a.mezclar(pares.map((p, k) => ({ t: p[0], k }))), der = a.mezclar(pares.map((p, k) => ({ t: p[1], k })));
    const rel = d.relojes && App.relojSVG;
    const mk = (it, lado) => {
      const contenido = (lado === 0 && rel) ? (() => { const [hh, mm] = it.t.split(':').map(Number); const s = a.h('div', { html: App.relojSVG(hh, mm, 110) }); return s; })() : it.t;
      const b = a.h('button', { class: 'ficha-palabra', style: { fontSize: String(it.t).length > 18 ? '21px' : '' } }, contenido);
      b._it = it; b._lado = lado;
      b.onclick = () => {
        if (b.dataset.bloq) return;
        if (!selI || selI._lado === lado) { selI && selI.classList.remove('sel'); selI = b; b.classList.add('sel'); a.sfx.clic(); return; }
        if (selI._it.k === it.k) {
          a.acierto(b); [selI, b].forEach(x => { x.classList.remove('sel'); x.classList.add('hecha'); x.dataset.bloq = 1; }); hechos++; a.progreso(hechos, pares.length);
          if (hechos === pares.length) a.espera(() => a.fin(), 900);
        } else { a.fallo(b); selI.classList.remove('sel'); }
        selI = null;
      };
      return b;
    };
    a.cuerpo.replaceChildren(a.instr(a.j.instr || 'Toca una palabra de cada lado para unirlas'),
      a.h('div', { class: 'dos-col' }, a.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, izq.map(it => mk(it, 0))),
        a.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, der.map(it => mk(it, 1)))));
    a.cuerpo.style.overflowY = 'auto';
  };

  /* Memory (Parejas) */
  M.memory = (a, d) => {
    const pares = a.mezclar(d.pares).slice(0, 6);
    const cartas = a.mezclar(pares.flatMap((p, k) => [{ t: p[0], k }, { t: p[1], k }]));
    let abiertas = [], hechos = 0, bloqueo = false;
    const rej = a.h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', maxWidth: '760px', margin: '0 auto', width: '100%' } });
    cartas.forEach(c => {
      const b = a.h('button', { class: 'carta' }, '❓');
      b.onclick = () => {
        if (bloqueo || b.classList.contains('vuelta') || b.classList.contains('hecha')) return;
        b.classList.add('vuelta'); a.sfx.clic(); abiertas.push([b, c]);
        if (String(c.t).startsWith('pj:')) { b.classList.add('conpj'); b.replaceChildren(a.pj(c.t.slice(3), 'pj', 0)); }
        else { if (esEmoji(c.t)) b.classList.add('emoji'); b.textContent = c.t; if (!esEmoji(c.t)) a.habla(c.t, 1); }
        if (abiertas.length === 2) {
          const [[b1, c1], [b2, c2]] = abiertas; abiertas = [];
          if (c1.k === c2.k) { a.acierto(); [b1, b2].forEach(x => x.classList.add('hecha')); hechos++; a.progreso(hechos, pares.length); if (hechos === pares.length) a.espera(() => a.fin(), 800); }
          else { bloqueo = true; a.fallo(); setTimeout(() => { [b1, b2].forEach(x => { x.classList.remove('vuelta', 'emoji', 'conpj'); x.textContent = '❓'; }); bloqueo = false; }, 1100); }
        }
      };
      rej.append(b);
    });
    a.cuerpo.replaceChildren(a.instr(a.j.instr || 'Busca las parejas'), rej);
    a.cuerpo.style.overflowY = 'auto';
  };

  /* Sopa de letras: desliza el dedo */
  M.sopa = (a, d) => {
    const quitaTildes = (p) => p.toUpperCase().replace(/Ñ/g, '#').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/#/g, 'Ñ').replace(/[^A-ZÑ]/g, '');
    const N = 9, pal = d.palabras.map(quitaTildes).filter(p => p.length <= N);
    const g = Array.from({ length: N }, () => Array(N).fill(''));
    const dirs = [[0, 1], [1, 0], [1, 1]]; const puestas = [];
    for (const p of a.mezclar(pal)) {
      for (let t = 0; t < 200; t++) {
        const [dy, dx] = a.azar(dirs); const y = a.ent(0, N - 1 - dy * (p.length - 1)), x = a.ent(0, N - 1 - dx * (p.length - 1));
        let ok = true; for (let k = 0; k < p.length; k++) { const c = g[y + dy * k][x + dx * k]; if (c && c !== p[k]) { ok = false; break; } }
        if (!ok) continue; for (let k = 0; k < p.length; k++) g[y + dy * k][x + dx * k] = p[k]; puestas.push(p); break;
      }
    }
    const ABC = 'ABCDEFGHIJLMNOPRSTUVZ';
    const rej = a.h('div', { class: 'sopa', style: { gridTemplateColumns: `repeat(${N},1fr)`, width: 'min(560px, 60vh, 90vw)' } });
    const celdas = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = a.h('div', { 'data-y': y, 'data-x': x }, g[y][x] || a.azar(ABC)); celdas.push(c); rej.append(c); }
    const lista = a.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, puestas.map(p => a.h('div', { class: 'ficha-palabra', 'data-p': p, style: { fontSize: '22px' } }, p)));
    let ini = null, marcadas = [], halladas = 0;
    const celda = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.parentElement === rej ? el : null; };
    const linea = (c0, c1) => {
      const y0 = +c0.dataset.y, x0 = +c0.dataset.x, y1 = +c1.dataset.y, x1 = +c1.dataset.x;
      const dy = Math.sign(y1 - y0), dx = Math.sign(x1 - x0), n = Math.max(Math.abs(y1 - y0), Math.abs(x1 - x0));
      if (!(y0 === y1 || x0 === x1 || Math.abs(y1 - y0) === Math.abs(x1 - x0))) return [c0];
      return Array.from({ length: n + 1 }, (_, k) => celdas[(y0 + dy * k) * N + (x0 + dx * k)]);
    };
    rej.addEventListener('pointerdown', e => { e.preventDefault(); ini = celda(e); if (ini) { rej.setPointerCapture(e.pointerId); marcadas = [ini]; ini.classList.add('marca'); } });
    rej.addEventListener('pointermove', e => { if (!ini) return; const c = celda(e); if (!c) return; marcadas.forEach(m => m.classList.remove('marca')); marcadas = linea(ini, c); marcadas.forEach(m => m.classList.add('marca')); });
    rej.addEventListener('pointerup', () => {
      if (!ini) return; const w = marcadas.map(m => m.textContent).join(''), wr = [...w].reverse().join('');
      const p = puestas.find(p => (p === w || p === wr)); const item = p && lista.querySelector(`[data-p="${p}"]:not(.hecha)`);
      marcadas.forEach(m => m.classList.remove('marca'));
      if (item) { marcadas.forEach(m => m.classList.add('hallada')); item.classList.add('hecha'); a.acierto(); a.habla(p.toLowerCase()); halladas++; a.progreso(halladas, puestas.length); if (halladas === puestas.length) a.espera(() => a.fin(), 900); }
      else if (marcadas.length > 2) a.fallo();
      ini = null; marcadas = [];
    });
    a.cuerpo.replaceChildren(a.instr(a.j.instr || 'Desliza el dedo sobre las letras'), a.h('div', { style: { display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' } }, rej, lista));
  };

  /* Aplastatopos */
  M.topos = (a, d) => {
    const META = 10; let buenos = 0, vidas = 3;
    const marc = a.h('div', { class: 'instr' });
    const act = () => { marc.textContent = '🔨 ' + buenos + ' / ' + META + '    ' + '❤️'.repeat(vidas); a.progreso(buenos, META); };
    const hoyos = Array.from({ length: 6 }, () => { const t = a.h('button', { class: 'topo' }); const hh = a.h('div', { class: 'agujero' }, t); return { hh, t, libre: true }; });
    hoyos.forEach(o => o.t.onclick = () => {
      if (!o.t.classList.contains('arriba') || o.t.dataset.bloq) return; o.t.dataset.bloq = 1;
      if (o.si) { a.acierto(o.t); buenos++; } else { a.fallo(o.t); vidas--; }
      o.t.classList.remove('arriba'); act();
      if (buenos >= META || vidas <= 0) { a.espera(() => a.fin(vidas <= 0 ? '¡Inténtalo otra vez!' : ''), 600); fin = true; }
    });
    let fin = false;
    const salir = () => {
      if (fin) return;
      const libres = hoyos.filter(o => !o.t.classList.contains('arriba')); if (!libres.length) return;
      const o = a.azar(libres); o.si = Math.random() < 0.55; const pal = a.azar(o.si ? d.si : d.no);
      o.t.replaceChildren('🐹', a.h('b', {}, pal)); delete o.t.dataset.bloq; o.t.classList.add('arriba');
      a.espera(() => o.t.classList.remove('arriba'), 2600);
    };
    a.temporizador(salir, 1300); a.espera(salir, 300);
    act();
    a.cuerpo.replaceChildren(a.instr(d.pregunta), marc, a.h('div', { class: 'topos' }, hoyos.map(o => o.hh)));
  };

  /* Explotaglobos */
  M.globos = (a, d) => {
    const META = 10; let buenos = 0, vidas = 3, fin = false;
    const cielo = a.h('div', { class: 'cielo' });
    const marc = a.h('div', { class: 'instr', style: { margin: '0 0 8px' } });
    const act = () => { marc.textContent = '🎈 ' + buenos + ' / ' + META + '    ' + '❤️'.repeat(vidas); a.progreso(buenos, META); };
    const colores = ['#ef4a5c', '#3d8bfd', '#f39c33', '#2fb45a', '#9b5cff', '#e94fa5'];
    const soltar = () => {
      if (fin) return;
      const si = Math.random() < 0.5, t = a.azar(si ? d.si : d.no);
      const g = a.h('button', { class: 'globo', style: { left: a.ent(2, 82) + '%', top: '105%', background: a.azar(colores) } }, t);
      const dur = 7000 + Math.random() * 3000, t0 = performance.now();
      const anim = (now) => { const p = (now - t0) / dur; if (!g.isConnected) return; g.style.top = (105 - p * 125) + '%'; if (p < 1) requestAnimationFrame(anim); else g.remove(); };
      requestAnimationFrame(anim);
      g.onpointerdown = (e) => {
        e.preventDefault(); if (g.dataset.bloq) return; g.dataset.bloq = 1; a.sfx.pop();
        if (si) { a.acierto(); buenos++; g.textContent = '💥'; } else { a.fallo(); vidas--; g.textContent = '❌'; }
        setTimeout(() => g.remove(), 300); act();
        if (buenos >= META || vidas <= 0) { fin = true; a.espera(() => a.fin(vidas <= 0 ? '¡Inténtalo otra vez!' : ''), 600); }
      };
      cielo.append(g);
    };
    a.temporizador(soltar, 1250); soltar(); act();
    a.cuerpo.replaceChildren(a.instr(d.pregunta), marc, cielo);
  };

  /* Completar la frase (ortografía) */
  M.completar = (a, d) => {
    const items = a.mezclar(d.items); let i = 0;
    const paso = () => {
      if (i >= items.length) return a.fin();
      a.progreso(i, items.length);
      const it = items[i]; let fallado = false;
      const [antes, despues] = it.f.split('___');
      const hueco = a.h('span', { class: 'zona', style: { display: 'inline-flex', minHeight: '80px', minWidth: '110px', padding: '6px 12px', verticalAlign: 'middle', fontSize: 'inherit' } }, '?');
      const palabra = a.h('div', { class: 'pregunta', style: { fontSize: 'clamp(44px,7vw,80px)' } }, it.img ? a.h('span', { class: 'img' }, it.img) : null, antes, hueco, despues);
      const banco = a.h('div', { class: 'banco' });
      const elegir = (o, b) => {
        if (b.dataset.bloq) return;
        if (o === it.r) { hueco.textContent = o; hueco.style.background = '#c9f5c2'; fallado ? a.sfx.bien() : a.acierto(hueco); a.habla(antes + o + despues); banco.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => { i++; paso(); }, 1400); }
        else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); }
      };
      a.mezclar(it.ops).forEach(o => { const b = a.h('button', { class: 'ficha-palabra', style: { fontSize: '40px', minWidth: '120px' } }, o); a.arrastrable(b, { destinos: '.zona', alTocar: () => elegir(o, b), alSoltar: (z) => z && elegir(o, b) }); banco.append(b); });
      a.cuerpo.replaceChildren(a.instr(a.j.instr || 'Completa la palabra'), palabra, banco);
    };
    paso();
  };

  /* Ahorcado (versión amable: un globo menos por fallo) */
  M.ahorcado = (a, d) => {
    const pals = a.mezclar(d.palabras).slice(0, 6); let i = 0;
    const paso = () => {
      if (i >= pals.length) return a.fin();
      a.progreso(i, pals.length);
      const { p, pista } = pals[i]; const usadas = new Set([' ', '.', '-']); let vidas = 6;
      const norm = (c) => c === 'Ñ' ? c : c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const huecos = a.h('div', { class: 'huecos' }), vid = a.h('div', { class: 'instr' });
      const pintarH = () => {
        huecos.replaceChildren(...[...p].map(c => c === ' ' ? a.h('span', { class: 'esp' }, '') : a.h('span', {}, usadas.has(norm(c)) ? c : '')));
        vid.textContent = '🎈'.repeat(vidas) + '💨'.repeat(6 - vidas);
      };
      const teclas = a.h('div', { class: 'teclado' }, [...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'].map(L => {
        const b = a.h('button', { class: 'tecla' }, L);
        b.onclick = () => {
          if (usadas.has(L) || vidas <= 0) return; usadas.add(L); b.classList.add('usada');
          if ([...p].some(c => norm(c) === L)) a.acierto(); else { a.fallo(); vidas--; }
          pintarH();
          if ([...p].every(c => usadas.has(norm(c)))) { a.habla(p.toLowerCase()); a.espera(() => { i++; paso(); }, 1300); }
          else if (vidas <= 0) { huecos.replaceChildren(...[...p].map(c => a.h('span', { style: { color: '#ef4a5c' } }, c))); a.habla('Era ' + p.toLowerCase()); a.espera(() => { i++; paso(); }, 2200); }
        };
        return b;
      }));
      pintarH();
      a.cuerpo.replaceChildren(a.h('div', { class: 'pregunta' }, String(pista).startsWith('pj:') ? a.pj(pista.slice(3), 'pj pj-preg', 0) : pista), vid, huecos, teclas);
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* Dictado: escucha y escribe con el teclado grande */
  M.dictado = (a, d) => {
    const pals = a.mezclar(d.palabras).slice(0, 8); let i = 0;
    const paso = () => {
      if (i >= pals.length) return a.fin();
      a.progreso(i, pals.length);
      const p = pals[i]; let esc = ''; let intentos = 0;
      const pant = a.h('div', { class: 'pregunta', style: { minHeight: '100px', fontSize: '54px', letterSpacing: '4px' } }, ' ');
      const act = () => pant.textContent = esc || ' ';
      const may = /^[A-ZÁÉÍÓÚÑ]/.test(p);
      const letras = [...'qwertyuiopasdfghjklñzxcvbnm', 'á', 'é', 'í', 'ó', 'ú'];
      const teclas = a.h('div', { class: 'teclado' }, letras.map(L => a.h('button', { class: 'tecla', onclick: () => { esc += (esc === '' && may) ? L.toUpperCase() : L; a.sfx.clic(); act(); } }, L)),
        a.h('button', { class: 'tecla', style: { width: '130px' }, onclick: () => { esc = esc.slice(0, -1); act(); } }, '⌫'));
      const comprobar = () => {
        if (esc === p) { a.acierto(pant); pant.style.background = '#c9f5c2'; a.espera(() => { i++; paso(); }, 1100); }
        else {
          intentos++; a.fallo(pant);
          if (intentos >= 2) { pant.textContent = p; pant.style.background = '#fff3a0'; a.habla('Se escribe así: ' + p); a.espera(() => { i++; paso(); }, 2600); }
          else a.habla('Casi. Escucha otra vez: ' + p);
        }
      };
      a.cuerpo.replaceChildren(a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#f39c33', fontSize: '30px' }, onclick: () => a.habla(p, 0.75) }, '🔊 Escuchar')),
        pant, teclas, a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: comprobar }, '✅ Comprobar')));
      a.cuerpo.style.overflowY = 'auto';
      a.espera(() => a.habla(p, 0.75), 400);
    };
    paso();
  };

  /* Comprensión lectora */
  M.lectura = (a, d) => {
    const textos = a.mezclar(d.textos); let ti = 0;
    const leerTexto = () => {
      if (ti >= textos.length) return a.fin();
      const t = textos[ti];
      a.cuerpo.replaceChildren(a.h('div', { class: 'instr' }, a.btnHablar(t.titulo + '. ' + t.texto), a.h('span', {}, '📖 ' + t.titulo)),
        a.h('div', { class: 'texto-lectura' }, t.texto),
        a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: () => preguntas(t, 0) }, 'Ya lo he leído ➡️')));
      a.cuerpo.style.overflowY = 'auto';
    };
    const preguntas = (t, k) => {
      if (k >= t.preguntas.length) { ti++; return leerTexto(); }
      a.progreso(k, t.preguntas.length);
      const p = t.preguntas[k]; let fallado = false;
      const ops = a.h('div', { class: 'opciones' }, a.mezclar([p.r, ...p.mal]).map(o => {
        const b = a.h('button', { class: 'op', onclick: () => {
          if (b.dataset.bloq) return;
          if (o === p.r) { fallado ? a.sfx.bien() : a.acierto(b); b.classList.add('ok'); a.espera(() => preguntas(t, k + 1), 900); ops.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, o); return b;
      }));
      a.cuerpo.replaceChildren(a.h('div', { class: 'texto-lectura', style: { fontSize: '19px', maxHeight: '28vh', overflow: 'auto' } }, t.texto),
        a.h('div', { class: 'pregunta' }, a.h('div', { class: 'instr', style: { margin: 0 } }, a.btnHablar(p.q), a.h('span', {}, p.q))), ops);
    };
    leerTexto();
  };

  /* Rueda aleatoria */
  M.rueda = (a, d) => {
    const items = d.items, n = items.length, R = 200;
    const col = ['#ef4a5c', '#3d8bfd', '#f39c33', '#2fb45a', '#9b5cff', '#e94fa5', '#00a8a8', '#ffb648'];
    let svg = `<svg viewBox="-210 -210 420 420" width="min(440px,52vh)" style="max-width:90vw"><g id="r" style="transition:transform 4s cubic-bezier(.2,.8,.2,1)">`;
    items.forEach((t, k) => {
      const a0 = (k / n) * 2 * Math.PI - Math.PI / 2, a1 = ((k + 1) / n) * 2 * Math.PI - Math.PI / 2, am = (a0 + a1) / 2;
      svg += `<path d="M0,0 L${R * Math.cos(a0)},${R * Math.sin(a0)} A${R},${R} 0 0 1 ${R * Math.cos(a1)},${R * Math.sin(a1)} Z" fill="${col[k % col.length]}" stroke="#fff" stroke-width="3"/>`;
      svg += `<text x="${120 * Math.cos(am)}" y="${120 * Math.sin(am)}" font-size="34" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-weight="900">${k + 1}</text>`;
    });
    svg += `</g><circle r="26" fill="#fff" stroke="#6b5bd6" stroke-width="6"/><path d="M-16,-214 L16,-214 L0,-178 Z" fill="#2d2a4a"/></svg>`;
    const rueda = a.h('div', { html: svg }), res = a.h('div', { class: 'pregunta', style: { minHeight: '90px' } }, 'Gira la rueda');
    let giro = 0, hechos = 0;
    const girar = () => {
      const k = a.ent(0, n - 1); giro += 360 * 5 + (360 - (k + 0.5) * 360 / n) - (giro % 360);
      rueda.querySelector('#r').style.transform = `rotate(${giro}deg)`; a.sfx.clic(); btn.disabled = true;
      setTimeout(() => { res.textContent = items[k]; a.habla(items[k]); a.sfx.bien(); btn.disabled = false; hechos++; a.progreso(hechos, 5); if (hechos >= 5) { btn.textContent = '🏁 Terminar'; btn.onclick = () => a.fin(); } }, 4100);
    };
    const btn = a.h('button', { class: 'btn', style: { fontSize: '28px' }, onclick: girar }, '🎡 ¡Girar!');
    a.cuerpo.replaceChildren(a.h('div', { class: 'rueda-wrap' }, rueda, btn, res));
    a.cuerpo.style.overflowY = 'auto';
  };

  /* Abrecajas */
  M.abrecajas = (a, d) => {
    const pre = a.mezclar(d.preguntas).slice(0, 8); let hechas = 0;
    const col = ['#ef4a5c', '#3d8bfd', '#f39c33', '#2fb45a', '#9b5cff', '#e94fa5', '#00a8a8', '#ffb648'];
    const cajas = a.h('div', { class: 'cajas' }, pre.map((p, k) => {
      const b = a.h('button', { class: 'caja-regalo', style: { '--c': col[k % col.length] } }, '🎁');
      b.onclick = () => {
        if (b.classList.contains('abierta')) return; a.sfx.pop();
        let fallado = false;
        const ops = a.h('div', { class: 'opciones' }, a.mezclar([p.r, ...p.mal]).map(o => {
          const x = a.h('button', { class: 'op', onclick: () => {
            if (x.dataset.bloq) return;
            if (o === p.r) { fallado ? a.sfx.bien() : a.acierto(x); x.classList.add('ok'); setTimeout(() => { a.cerrarModal(); b.classList.add('abierta'); b.textContent = '✅'; hechas++; a.progreso(hechas, pre.length); if (hechas === pre.length) a.fin(); }, 800); }
            else { fallado ? a.sfx.mal() : a.fallo(x); fallado = true; x.classList.add('mal'); x.dataset.bloq = 1; }
          } }, o); return x;
        }));
        a.modal('Caja ' + (k + 1), a.h('div', {}, a.h('div', { class: 'pregunta' }, p.img ? a.h('span', { class: 'img' }, p.img) : null, a.h('div', { class: 'instr', style: { margin: 0 } }, a.btnHablar(p.q), a.h('span', {}, p.q))), ops));
      };
      return b;
    }));
    a.cuerpo.replaceChildren(a.instr('Abre todas las cajas'), cajas);
  };

  /* Tarjetas flash */
  M.tarjetas = (a, d) => {
    const ts = a.mezclar(d.tarjetas); let i = 0;
    const paso = () => {
      if (i >= ts.length) return a.fin();
      a.progreso(i, ts.length);
      const [f, b] = ts[i]; let girada = false;
      const t = a.h('button', { class: 'tarjeta-grande' }, f);
      t.onclick = () => { girada = !girada; t.classList.toggle('atras', girada); t.textContent = girada ? b : f; a.sfx.clic(); a.habla(girada ? b : f); };
      a.cuerpo.replaceChildren(a.instr('Piensa la respuesta y toca la tarjeta'), t,
        a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: () => { a.acierto(); i++; paso(); } }, '😀 ¡La sabía!'),
          a.h('button', { class: 'btn', style: { '--c': '#f39c33' }, onclick: () => { a.fallo(); i++; paso(); } }, '🤔 Tengo que repasar')));
    };
    paso();
  };

  /* Mapas: etiquetar o tocar */
  M.mapa = (a, d) => {
    const MP = a.D.mapas;
    let capa, elementos;
    if (d.capa === 'ccaa') { capa = MP.ccaa; elementos = capa.map(c => ({ id: c.id, c: c.c, tipo: 'region' })); }
    else if (d.capa === 'provincias') { capa = MP.provincias; elementos = capa.map(c => ({ id: c.id, c: c.c, tipo: 'region' })); }
    else if (d.capa === 'rios') { capa = MP.provincias; elementos = MP.rios.map(r => ({ id: r.id, c: r.c, tipo: 'rio' })); }
    else { capa = MP.provincias; elementos = [...MP.rios.map(r => ({ id: r.id, c: r.c, tipo: 'rio' })), ...MP.montanas.map(m => ({ id: m.id, c: m.c, tipo: 'monte' }))]; }
    if (d.incluir) elementos = elementos.filter(e => d.incluir.includes(e.id));
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
    const svg = mk('svg', { viewBox: MP.viewBox, class: 'mapa-svg', preserveAspectRatio: 'xMidYMid meet' });
    svg.append(mk('path', { d: MP.vecinos, class: 'vecino' }));
    const [cx, cy, cw, ch] = MP.canarias; svg.append(mk('rect', { x: cx, y: cy, width: cw, height: ch, fill: 'none', stroke: '#6b5bd6', 'stroke-width': 3, 'stroke-dasharray': '10 8', rx: 14 }));
    const regiones = {};
    const esRegion = d.capa === 'ccaa' || d.capa === 'provincias';
    capa.forEach(c => { const p = mk('path', { d: c.d, class: esRegion ? 'region' : 'tierra', 'data-id': c.id }); svg.append(p); regiones[c.id] = p; });
    if (d.capa === 'provincias' || d.capa === 'ccaa') MP.ccaa.forEach(c => d.capa === 'provincias' && svg.append(mk('path', { d: c.d, fill: 'none', stroke: '#5a4a3a', 'stroke-width': 2.6, 'pointer-events': 'none' })));
    if (d.capa === 'rios' || d.capa === 'relieve') {
      MP.ccaa.forEach(c => svg.append(mk('path', { d: c.d, fill: 'none', stroke: '#8a7a5a', 'stroke-width': 2, 'pointer-events': 'none' })));
      MP.rios.forEach(r => svg.append(mk('path', { d: r.d, class: 'rio' })));
      if (d.capa === 'relieve') MP.montanas.forEach(m => svg.append(mk('path', { d: m.d, class: 'monte' })));
    }
    // ciudades pequeñas: círculo para poder tocarlas
    capa.filter(c => c.small).forEach(c => { const k = mk('circle', { cx: c.c[0], cy: c.c[1], r: 16, class: esRegion ? 'region' : 'tierra', 'data-id': c.id, fill: '#fbe9b7', stroke: '#5a4a3a', 'stroke-width': 2 }); svg.append(k); if (esRegion) regiones[c.id + '#'] = k; });

    const total = elementos.length; let hechos = 0;
    const tit = (id) => id.toUpperCase();
    if (d.modo === 'tocar') {
      const orden = a.mezclar(elementos); let k = 0, fallos = 0;
      const pide = a.h('div', { class: 'instr', style: { fontSize: '30px', margin: '0 0 8px' } });
      const siguiente = () => {
        if (k >= orden.length || k >= 12) return a.fin();
        a.progreso(k, Math.min(12, orden.length)); fallos = 0;
        pide.replaceChildren(a.btnHablar(() => 'Toca ' + orden[k].id), a.h('span', {}, '👉 Toca: ' + orden[k].id));
        a.habla('Toca ' + orden[k].id);
      };
      svg.addEventListener('click', (e) => {
        const t = e.target.closest('[data-id]'); if (!t || k >= orden.length) return;
        const id = t.getAttribute('data-id'), obj = orden[k].id;
        const pinta = (cls) => { [regiones[obj], regiones[obj + '#']].forEach(r => r && r.classList.add(cls)); };
        if (id === obj) { a.acierto(); pinta('hecha'); addLabel(orden[k]); k++; a.espera(siguiente, 700); }
        else {
          a.fallo(); t.classList.add('mal'); setTimeout(() => t.classList.remove('mal'), 600); fallos++;
          a.habla('Eso es ' + id);
          if (fallos >= 2) { pinta('pide'); setTimeout(() => [regiones[obj], regiones[obj + '#']].forEach(r => r && r.classList.remove('pide')), 1500); }
        }
      });
      a.cuerpo.replaceChildren(pide, a.h('div', { class: 'mapa-wrap' }, svg));
      siguiente();
    } else {
      // etiquetas: puntos donde soltar cada nombre
      const puntos = {};
      elementos.forEach(e => { const p = mk('circle', { cx: e.c[0], cy: e.c[1], r: 13, class: 'punto destino-mapa', 'data-dest': e.id }); svg.append(p); puntos[e.id] = p; });
      const lista = a.h('div', { class: 'lista-etq' });
      let sel = null;
      const colocar = (b, e, destId) => {
        if (destId === e.id) {
          a.acierto(); b.remove(); hechos++; a.progreso(hechos, total); puntos[e.id].classList.add('hecho');
          if (esRegion) [regiones[e.id], regiones[e.id + '#']].forEach(r => r && r.classList.add('hecha'));
          addLabel(e); a.habla(e.id);
          if (hechos === total) a.espera(() => a.fin(), 900);
        } else { a.fallo(b); }
        sel && sel.classList.remove('sel'); sel = null;
      };
      // El destino se calcula por el punto más cercano a donde se suelta el dedo
      const destinoEn = (x, y) => {
        const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const m = svg.getScreenCTM(); if (!m) return null;
        const q = pt.matrixTransform(m.inverse()); let mejor = null, dm = 1e9;
        elementos.forEach(e => { if (puntos[e.id].classList.contains('hecho')) return; const dd = Math.hypot(e.c[0] - q.x, e.c[1] - q.y); if (dd < dm) { dm = dd; mejor = e.id; } });
        if (esRegion) { const el = document.elementFromPoint(x, y); const r = el && el.closest && el.closest('[data-id]'); if (r) return r.getAttribute('data-id'); }
        return dm < 70 ? mejor : null;
      };
      a.mezclar(elementos).forEach(e => {
        const b = a.h('button', { class: 'ficha-palabra' }, (e.tipo === 'rio' ? '🌊 ' : e.tipo === 'monte' ? '⛰️ ' : '') + tit(e.id));
        a.arrastrable(b, { alSoltar: (_, el, ev) => { const dd = destinoEn(ev.clientX, ev.clientY); if (dd) colocar(b, e, dd); }, alTocar: () => { sel && sel.classList.remove('sel'); sel = b; b._e = e; b.classList.add('sel'); a.sfx.clic(); a.habla(e.id); } });
        lista.append(b);
      });
      svg.addEventListener('click', (ev) => { if (!sel) return; const dd = destinoEn(ev.clientX, ev.clientY); if (dd) colocar(sel, sel._e, dd); });
      a.cuerpo.replaceChildren(a.instr(a.j.instr || 'Arrastra cada nombre a su sitio del mapa'), a.h('div', { class: 'mapa-wrap' }, svg, lista));
    }
    function addLabel(e) {
      const t = mk('text', { x: e.c[0], y: e.c[1] - 18, 'text-anchor': 'middle', 'font-size': d.capa === 'provincias' ? 15 : 19, fill: e.tipo === 'rio' ? '#0d4fa0' : e.tipo === 'monte' ? '#6b3a10' : '#2d2a4a', 'pointer-events': 'none' });
      t.textContent = e.id; svg.append(t);
    }
  };

  /* Problemas inventados al momento */
  const NOMBRES = ['Lucía', 'Hugo', 'Martina', 'Álex', 'Sofía', 'Pablo', 'Vera', 'Dani'];
  const COSAS = [['🍎', 'manzanas', 'f'], ['🎈', 'globos', 'm'], ['🍪', 'galletas', 'f'], ['⭐', 'estrellas', 'f'], ['🐚', 'conchas', 'f'], ['🌸', 'flores', 'f'], ['🪙', 'monedas', 'f'], ['🧸', 'peluches', 'm'], ['🖍️', 'ceras', 'f'], ['🍓', 'fresas', 'f'], ['📚', 'cuentos', 'm'], ['🚗', 'cochecitos', 'm']];
  function inventaProblema(a, d) {
    const k = d.pjs && d.pjs.length ? a.azar(d.pjs) : null;
    const quien = k ? a.D.personajes[k][0] : a.azar(NOMBRES);
    const otro = d.pjs && d.pjs.length > 1 ? a.D.personajes[a.azar(d.pjs.filter(x => x !== k))][0] : a.azar(NOMBRES.filter(n => n !== quien));
    const [emo, cosa, gen] = a.azar(COSAS); const Cu = gen === 'm' ? 'Cuántos' : 'Cuántas', le_ = gen === 'm' ? 'los' : 'las';
    const tipo = a.azar(['suma', 'resta', 'suma', 'resta', 'comparar', 'faltan', 'doble', 'tres']);
    const g = (lo, hi) => a.ent(lo, hi);
    let q, r, op, pista;
    if (tipo === 'suma') { const x = g(12, 65), y = g(8, 34); q = `${quien} tiene ${x} ${cosa} y ${otro} le da ${y} más. ¿${Cu} ${cosa} tiene ahora?`; r = x + y; op = `${x} + ${y}`; pista = 'Le dan más… ¡sumamos! Empieza por las unidades.'; }
    else if (tipo === 'resta') { const x = g(30, 95), y = g(9, x - 8); q = `${quien} tenía ${x} ${cosa} y regala ${y}. ¿${Cu} le quedan?`; r = x - y; op = `${x} − ${y}`; pista = 'Regala… ¡restamos! Al número grande le quitamos el pequeño.'; }
    else if (tipo === 'comparar') { const x = g(40, 90), y = g(10, x - 5); q = `${quien} tiene ${x} ${cosa} y ${otro} tiene ${y}. ¿${Cu} tiene ${quien} más que ${otro}?`; r = x - y; op = `${x} − ${y}`; pista = '«¿Cuántas más?» se resuelve restando.'; }
    else if (tipo === 'faltan') { const x = g(10, 60), y = g(x + 5, 99); q = `${quien} tiene ${x} ${cosa} y quiere llegar a ${y}. ¿${Cu} le faltan?`; r = y - x; op = `${y} − ${x}`; pista = 'Para saber cuánto falta: lo que quiere menos lo que tiene.'; }
    else if (tipo === 'doble') { const x = g(5, 45); q = `${otro} tiene ${x} ${cosa} y ${quien} tiene el doble. ¿${Cu} tiene ${quien}?`; r = x * 2; op = `${x} + ${x}`; pista = 'El doble es sumar el mismo número dos veces.'; }
    else { const x = g(10, 30), y = g(10, 30), z = g(5, 20); q = `${quien} tiene ${x} ${cosa}, ${otro} tiene ${y} y encuentran ${z} más. ¿${Cu} tienen en total?`; r = x + y + z; op = `${x} + ${y} + ${z}`; pista = 'En total… ¡suma todo!'; }
    const mal = new Set(); for (const v of [r + 10, r - 10, r + 1, r - 1, r + 2]) { if (v >= 0 && v !== r && mal.size < 3) mal.add(v); }
    return { q, r: String(r), mal: [...mal].map(String), pj: k, img: k ? null : emo, op, pista };
  }
  M.problemas2 = (a, d) => {
    let n = 0; const RONDA = 8;
    const paso = () => {
      if (n >= RONDA) return a.fin();
      a.progreso(n, RONDA);
      const p = inventaProblema(a, d); let fallado = false; a.pista(p.pista);
      const resp = a.h('div', { class: 'op-escrita' }, '');
      const caja = a.h('div', { class: 'opciones' }, a.mezclar([p.r, ...p.mal]).map(o => {
        const b = a.h('button', { class: 'op', onclick: () => {
          if (b.dataset.bloq) return;
          if (o === p.r) { fallado ? a.sfx.bien() : a.acierto(b); b.classList.add('ok'); resp.textContent = p.op + ' = ' + p.r; a.habla(p.op.replace('−', 'menos').replace(/\+/g, 'más') + ' igual a ' + p.r); caja.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => { n++; paso(); }, 1800); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, o); return b;
      }));
      a.cuerpo.replaceChildren(a.h('div', { class: 'pregunta' }, p.pj ? a.h('span', { class: 'img' }, a.pj(p.pj, 'pj pj-preg')) : a.h('span', { class: 'img' }, p.img),
        a.h('div', { class: 'instr', style: { margin: 0 } }, a.btnHablar(p.q), a.h('span', {}, p.q)), resp), caja);
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* Contrarreloj: 60 segundos de cálculo mental */
  M.contrarreloj = (a, d) => {
    const inicio = () => {
      a.cuerpo.replaceChildren(a.h('div', { class: 'fin' }, d.pjs && d.pjs.length ? a.h('div', { class: 'fin-pj' }, a.pj(a.quien, 'pj')) : a.h('div', { class: 'grandes' }, '⏱️'),
        a.h('h2', {}, '¿Cuántas aciertas en 60 segundos?'), a.h('button', { class: 'btn btn-seguir', style: { '--c': '#ef4a5c', fontSize: '34px' }, onclick: jugarYa }, '▶ ¡YA!')));
    };
    const jugarYa = () => {
      let puntos = 0, quedan = 60;
      const marc = a.h('div', { class: 'crono-grande' });
      const preg = a.h('div', { class: 'pregunta', style: { fontSize: 'clamp(46px,8vw,90px)' } });
      const ops = a.h('div', { class: 'opciones', style: { gridTemplateColumns: 'repeat(4,1fr)' } });
      const act = () => { marc.textContent = '⏱ ' + quedan + ' s   ·   ✅ ' + puntos; a.progreso(60 - quedan, 60); };
      const nueva = () => {
        let x, y, r, t;
        const modo = d.modo === 'tablas' ? 'tablas' : a.azar(['suma', 'resta', 'suma10', 'resta10']);
        if (modo === 'tablas') { const tb = a.azar([2, 5, 10]); x = a.ent(1, 10); r = x * tb; t = x + ' × ' + tb; }
        else if (modo === 'suma') { x = a.ent(5, 50); y = a.ent(2, 30); r = x + y; t = x + ' + ' + y; }
        else if (modo === 'resta') { x = a.ent(20, 80); y = a.ent(2, 19); r = x - y; t = x + ' − ' + y; }
        else if (modo === 'suma10') { x = a.ent(10, 89); r = x + 10; t = x + ' + 10'; }
        else { x = a.ent(20, 99); r = x - 10; t = x + ' − 10'; }
        preg.textContent = t + ' = ?';
        const c = new Set([r]); for (const v of a.mezclar([r + 1, r - 1, r + 10, r - 10, r + 2])) { if (c.size < 4 && v >= 0) c.add(v); }
        ops.replaceChildren(...a.mezclar([...c]).map(v => a.h('button', { class: 'op', onclick: (e) => { if (quedan <= 0) return; if (v === r) { puntos++; a.acierto(e.currentTarget); } else a.fallo(e.currentTarget); act(); nueva(); } }, String(v))));
      };
      a.cuerpo.replaceChildren(marc, preg, ops); act(); nueva();
      const t = a.temporizador(() => { quedan--; act(); if (quedan <= 0) { clearInterval(t); a.fin(puntos + ' puntos', puntos); } }, 1000);
    };
    inicio();
  };
})();
