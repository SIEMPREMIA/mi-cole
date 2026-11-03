/* Juegos de mates del cole, rehechos como los originales (menú de niveles, infinitos y con marcador), en español */
'use strict';
(() => {
  const M = App.MOTORES;

  /* ---------- piezas comunes ---------- */
  function barraJuego(a, titulo, alMenu) {
    const marcador = a.h('span', { class: 'tm-marcador' }, '0 / 0');
    const bar = a.h('div', { class: 'tm-barra' },
      a.h('button', { class: 'tm-btn', onclick: () => { a.sfx.clic(); alMenu(); } }, '☰ Menú'),
      a.h('span', { class: 'tm-tit' }, titulo), marcador,
      a.h('button', { class: 'tm-btn fin', onclick: () => a.fin() }, '🏁 Terminar'));
    return { bar, puntuar: (ok, tot) => { marcador.textContent = ok + ' / ' + tot; } };
  }
  function menu(a, opts) {
    // opts: { titulo, fondo, grupos: [{ titulo, botones: [{ l, v }] }], alElegir }
    const caja = a.h('div', { class: 'tm-menu', style: { background: opts.fondo } },
      a.h('h2', { class: 'tm-menu-tit' }, opts.titulo), opts.extra || null,
      a.h('div', { class: 'tm-grupos' }, opts.grupos.map(g => a.h('div', { class: 'tm-grupo' },
        g.titulo ? a.h('h3', {}, g.titulo) : null,
        g.botones.map(b => a.h('button', { class: 'tm-nivel', style: { '--c': g.color || '#ef4a5c' }, onclick: () => { a.sfx.clic(); opts.alElegir(b.v, b.l); } }, b.l))))));
    a.cuerpo.style.overflowY = 'auto';
    a.cuerpo.replaceChildren(caja);
  }
  function aviso(a, padre, texto, bien) {
    const n = a.h('div', { class: 'tm-aviso ' + (bien ? 'bien' : 'mal') }, texto);
    padre.append(n); setTimeout(() => n.remove(), 1300);
  }

  /* ---------- 1. Valor posicional (Baloncesto) ---------- */
  M.baloncesto = (a) => {
    const empezar = (max, nombre) => {
      let ok = 0, tot = 0;
      const { bar, puntuar } = barraJuego(a, 'Hasta ' + max, () => M.baloncesto(a));
      const pizarra = a.h('div', { class: 'tm-pizarra' });
      const aro = a.h('div', { class: 'tm-aro' }, '🏀');
      const balones = a.h('div', { class: 'tm-balones' });
      const pista = a.h('div', { class: 'tm-pista' }, a.h('div', { class: 'tm-canasta' }, a.h('div', { class: 'tm-tablero' }), a.h('div', { class: 'tm-red' })), pizarra, aro, balones);
      const ronda = () => {
        const n = a.ent(max > 99 ? 100 : max > 19 ? 10 : 1, max);
        const c = Math.floor(n / 100), d = Math.floor(n / 10) % 10, u = n % 10;
        pizarra.replaceChildren(
          ...Array.from({ length: c }, () => a.h('div', { class: 'cent' })),
          ...Array.from({ length: d }, () => a.h('div', { class: 'dec' })),
          a.h('div', { class: 'tm-cubos' }, Array.from({ length: u }, () => a.h('div', { class: 'tm-cubo' }))));
        const cand = new Set([n]);
        const alt = [d * 10 + u === n ? u * 10 + d : n + 9, n + 10, n - 10, n + 1, n - 1, d + u * 10 + c * 100];
        for (const x of a.mezclar(alt)) { if (cand.size >= 4) break; if (x > 0 && x <= Math.max(max, 19) + 10 && x !== n) cand.add(x); }
        while (cand.size < 4) cand.add(a.ent(1, max));
        balones.replaceChildren(...a.mezclar([...cand]).map(v => {
          const b = a.h('button', { class: 'tm-balon' }, String(v));
          b.onclick = () => {
            if (balones.dataset.bloq) return; tot++;
            if (v === n) {
              ok++; balones.dataset.bloq = 1; a.acierto(); puntuar(ok, tot);
              b.classList.add('lanzar'); a.habla(v);
              setTimeout(() => aviso(a, pista, '¡Muy bien!', true), 600);
              setTimeout(() => { delete balones.dataset.bloq; ronda(); }, 1700);
            } else { a.fallo(b); puntuar(ok, tot); b.style.visibility = 'hidden'; aviso(a, pista, 'Inténtalo otra vez', false); }
          };
          return b;
        }));
        a.progreso(tot % 10, 10);
      };
      a.cuerpo.replaceChildren(bar, a.h('p', { class: 'tm-ayuda' }, '🟩 barra = 1 decena (10) · 🟥 cubo = 1 unidad' + (max > 99 ? ' · 🟪 placa = 1 centena (100)' : '') + '. Toca el balón con el número.'), pista);
      ronda();
    };
    menu(a, { titulo: '🏀 Baloncesto del valor posicional', fondo: 'linear-gradient(#4aa3ff,#7ec8ff)', alElegir: empezar,
      grupos: [{ titulo: 'Elige juego:', color: '#9b5cff', botones: [19, 29, 49, 99, 999].map(v => ({ l: 'Números hasta ' + v, v })) }] });
  };

  /* ---------- 2 y 3. Dragón chino (ordenar) y Gusano (secuencias) ---------- */
  const SERIES = {
    dragon: [
      { titulo: 'Ordenar hacia delante', color: '#ef4a5c', botones: [
        { l: '1 a 5', v: { ini: 1, paso: 1, n: 5 } }, { l: '1 a 10', v: { ini: 1, paso: 1, n: 5, max: 10 } }, { l: 'Hasta 20', v: { max: 20, n: 5 } },
        { l: 'Hasta 50', v: { max: 50, n: 5 } }, { l: 'Hasta 100', v: { max: 100, n: 5 } }, { l: 'Hasta 999', v: { max: 999, n: 5 } }] },
      { titulo: 'Ordenar hacia atrás', color: '#f39c33', botones: [
        { l: '5 a 1', v: { ini: 1, paso: 1, n: 5, atras: true } }, { l: 'Hasta 20', v: { max: 20, n: 5, atras: true } },
        { l: 'Hasta 100', v: { max: 100, n: 5, atras: true } }, { l: 'Hasta 999', v: { max: 999, n: 5, atras: true } }] }],
    gusano: [
      { titulo: 'Contar de 1 en 1', color: '#ef4a5c', botones: [
        { l: '1 a 10', v: { ini: 1, paso: 1 } }, { l: '10 a 1', v: { ini: 10, paso: -1 } }, { l: '11 a 30', v: { min: 11, max: 30, paso: 1 } },
        { l: '30 a 11', v: { min: 11, max: 30, paso: -1 } }, { l: '0 a 100', v: { min: 0, max: 100, paso: 1 } }, { l: '100 a 0', v: { min: 0, max: 100, paso: -1 } }] },
      { titulo: 'Números pares', color: '#9b5cff', botones: [
        { l: '0 a 20', v: { min: 0, max: 20, paso: 2 } }, { l: '20 a 0', v: { min: 0, max: 20, paso: -2 } }, { l: '20 a 50', v: { min: 20, max: 50, paso: 2 } },
        { l: '50 a 20', v: { min: 20, max: 50, paso: -2 } }, { l: '0 a 100', v: { min: 0, max: 100, paso: 2 } }, { l: '100 a 0', v: { min: 0, max: 100, paso: -2 } }] },
      { titulo: 'Contar de 5 y de 10', color: '#2fb45a', botones: [
        { l: 'De 5 en 5', v: { min: 0, max: 100, paso: 5 } }, { l: '5 en 5 atrás', v: { min: 0, max: 100, paso: -5 } }, { l: 'De 10 en 10', v: { min: 0, max: 200, paso: 10 } },
        { l: '10 en 10 atrás', v: { min: 0, max: 200, paso: -10 } }, { l: 'De 100 en 100', v: { min: 0, max: 1000, paso: 100 } }, { l: 'Impares', v: { min: 1, max: 99, paso: 2, impar: true } }] }],
  };
  M.serie = (a, d) => {
    const dragon = d.modo === 'dragon';
    const empezar = (cfg, nombre) => {
      let ok = 0, tot = 0;
      const { bar, puntuar } = barraJuego(a, (dragon ? 'Ordenar: ' : 'Series: ') + nombre, () => M.serie(a, d));
      const escena = a.h('div', { class: 'tm-escena ' + (dragon ? 'dragon-esc' : 'gusano-esc') });
      const ronda = () => {
        let valores, huecos;
        if (dragon) {
          if (cfg.ini) valores = Array.from({ length: cfg.n }, (_, k) => cfg.ini + k * (cfg.max ? 2 : 1)).map((v, k) => cfg.max ? [1, 3, 5, 7, 9].map(x => x + a.ent(0, 1))[k] : v);
          else { const s = new Set(); while (s.size < cfg.n) s.add(a.ent(cfg.max > 100 ? 100 : 0, cfg.max)); valores = [...s]; }
          valores.sort((x, y) => x - y); if (cfg.atras) valores.reverse();
          huecos = valores.map((_, k) => k);
        } else {
          const n = 6, paso = cfg.paso;
          let ini;
          if (cfg.ini) ini = cfg.ini; else {
            const lo = paso > 0 ? cfg.min : cfg.min + Math.abs(paso) * (n - 1), hi = paso > 0 ? cfg.max - paso * (n - 1) : cfg.max;
            ini = a.ent(lo, Math.max(lo, hi)); if (Math.abs(paso) > 1) ini = Math.round(ini / Math.abs(paso)) * Math.abs(paso) + (cfg.impar ? 1 : 0);
          }
          valores = Array.from({ length: n }, (_, k) => ini + k * paso);
          huecos = a.mezclar([1, 2, 3, 4, 5].slice(0)).slice(0, 3).sort();
        }
        let colocados = 0;
        const cuerpo = a.h('div', { class: 'tm-cuerpo' }, a.h('div', { class: 'tm-cabeza' }, dragon ? '🐲' : '🐛'),
          valores.map((v, k) => huecos.includes(k) ? a.h('div', { class: 'tm-seg hueco tm-destino', 'data-k': k }) : a.h('div', { class: 'tm-seg' }, v)));
        if (!dragon) cuerpo.append(a.h('div', { class: 'tm-cola' }));
        const fichas = huecos.map(k => valores[k]);
        if (!dragon) { const pasoA = Math.abs(cfg.paso); [valores[huecos[0]] + 1, valores[huecos[0]] - (pasoA === 1 ? 2 : 1)].forEach(x => { if (!valores.includes(x) && x >= 0) fichas.push(x); }); }
        const banco = a.h('div', { class: 'tm-banco' });
        const siguiente = () => dragon ? cuerpo.querySelector('.tm-seg.hueco') : null;
        const poner = (b, v, destino) => {
          tot++;
          let hueco = destino && destino.classList.contains('hueco') ? destino : null;
          if (dragon) hueco = siguiente(); // el dragón se rellena en orden
          const k = hueco ? +hueco.dataset.k : -1;
          if (hueco && valores[k] === v) {
            ok++; puntuar(ok, tot); a.sfx.clic(); hueco.classList.remove('hueco'); hueco.textContent = v; b.remove(); colocados++;
            if (colocados === huecos.length) { a.acierto(); a.habla(valores.join(', ')); aviso(a, escena, '¡Correcto, muy bien!', true); setTimeout(ronda, 1600); }
          } else { a.fallo(b); puntuar(ok, tot); }
        };
        a.mezclar(fichas).forEach(v => {
          const b = a.h('div', { class: 'tm-seg suelta' }, v);
          a.arrastrable(b, { destinos: '.tm-destino', alSoltar: (z) => z && poner(b, v, z), alTocar: () => { const z = dragon ? siguiente() : cuerpo.querySelector('.tm-seg.hueco'); if (!dragon) { const ok2 = [...cuerpo.querySelectorAll('.tm-seg.hueco')].find(x => valores[+x.dataset.k] === v); poner(b, v, ok2 || z); } else poner(b, v, z); } });
          banco.append(b);
        });
        escena.replaceChildren(a.h('div', { class: 'tm-frase' }, dragon ? 'Pon mi cuerpo en el orden correcto' : 'Termina mi cuerpo para hacer la serie'), cuerpo, banco,
          a.h('button', { class: 'tm-btn reset', onclick: ronda }, '↺ Reiniciar'));
        a.progreso(ok % 10, 10);
      };
      a.cuerpo.replaceChildren(bar, escena); ronda();
    };
    menu(a, { titulo: dragon ? '🐲 El dragón chino: ordenar números' : '🐛 El gusano: series de números', fondo: dragon ? 'linear-gradient(#ffb648,#ff8f3c)' : 'linear-gradient(#7ec8ff,#bff0a8)',
      grupos: SERIES[dragon ? 'dragon' : 'gusano'], alElegir: empezar });
  };

  /* ---------- 4. Robots: más que / menos que ---------- */
  M.robots = (a) => {
    let signo = 1;
    const elegirTipo = () => menu(a, { titulo: '🤖 Robots: más que o menos que', fondo: 'linear-gradient(#4b2fa3,#2e1a6e)',
      extra: a.h('div', { class: 'tm-tabs' }, [['Más que', 1], ['Menos que', -1]].map(([l, s]) => a.h('button', { class: 'tm-tab' + (s === signo ? ' sel' : ''), onclick: () => { signo = s; elegirTipo(); } }, l))),
      grupos: [{ titulo: 'Elige hasta qué número', color: '#ef4a5c', botones: [10, 20, 50, 100].map(v => ({ l: 'Hasta ' + v, v })) }],
      alElegir: (max) => menu(a, { titulo: '¿Cuánto ' + (signo > 0 ? 'sumamos' : 'restamos') + '?', fondo: 'linear-gradient(#4b2fa3,#2e1a6e)',
        grupos: [{ color: '#f39c33', botones: [...[1, 2, 3, 4, 5].map(n => ({ l: (signo > 0 ? '+' : '−') + n, v: [n] })), { l: (signo > 0 ? '+' : '−') + '1 a 5', v: [1, 2, 3, 4, 5] }, { l: (signo > 0 ? '+' : '−') + '10', v: [10] }] }],
        alElegir: (cuantos) => empezar(max, cuantos) }) });
    const empezar = (max, cuantos) => {
      let ok = 0, tot = 0;
      const { bar, puntuar } = barraJuego(a, 'Hasta ' + max + ': ' + (cuantos.length > 1 ? '1 a 5' : cuantos[0]) + (signo > 0 ? ' más' : ' menos'), () => elegirTipo());
      const escena = a.h('div', { class: 'tm-robots' });
      const recta = a.h('div', { class: 'tm-recta' });
      let ver = true;
      const btnVer = a.h('button', { class: 'tm-btn', onclick: () => { ver = !ver; recta.style.visibility = ver ? '' : 'hidden'; btnVer.textContent = ver ? 'Ocultar' : 'Mostrar'; } }, 'Ocultar');
      const ronda = () => {
        const usados = new Set(); const items = [];
        while (items.length < 5) {
          const c = a.azar(cuantos); const x = signo > 0 ? a.ent(0, max - c) : a.ent(c, max); const r = x + signo * c;
          if (usados.has(r)) continue; usados.add(r); items.push({ x, c, r });
        }
        let hechos = 0;
        const arriba = a.h('div', { class: 'tm-fila-robots' }, a.mezclar(items).map(it => a.h('div', { class: 'tm-hueco-robot tm-destino', 'data-r': it.r }, a.h('b', {}, it.r), a.h('div', { class: 'tm-silueta' }, '🤖'))));
        const abajo = a.h('div', { class: 'tm-fila-robots abajo' }, items.map(it => {
          const rb = a.h('div', { class: 'tm-robot' }, a.h('span', { class: 'cara' }, '🤖'), a.h('span', { class: 'cuenta' }, it.x + (signo > 0 ? ' + ' : ' − ') + it.c));
          a.arrastrable(rb, { destinos: '.tm-destino', alSoltar: (z) => {
            if (!z) return; tot++;
            if (+z.dataset.r === it.r && !z.dataset.lleno) {
              ok++; z.dataset.lleno = 1; z.querySelector('.tm-silueta').replaceWith(rb); rb.classList.add('colocado'); rb.dataset.bloq = 1; a.sfx.clic(); hechos++;
              if (hechos === 5) { a.acierto(); arriba.classList.add('brilla'); aviso(a, escena, '¡Muy bien!', true); setTimeout(ronda, 1700); }
            } else { a.fallo(rb); a.habla(it.x + (signo > 0 ? ' más ' : ' menos ') + it.c); }
            puntuar(ok, tot);
          } });
          return rb;
        }));
        const top = Math.min(max, 20) === max ? max : null;
        recta.replaceChildren(...Array.from({ length: Math.min(max, 20) + 1 }, (_, k) => a.h('span', {}, top ? k : Math.max(0, Math.min(...items.map(i => i.x)) - 3) + k)));
        escena.replaceChildren(a.h('div', { class: 'tm-frase' }, 'Arrastra cada robot hasta su resultado'), arriba, abajo, a.h('div', { class: 'tm-pie' }, btnVer, recta));
      };
      a.cuerpo.replaceChildren(bar, escena); ronda();
    };
    elegirTipo();
  };

  /* ---------- 5. Juguetería (pagar el precio exacto) ---------- */
  const MONEDAS = { 1: ['1 c', 'cobre'], 2: ['2 c', 'cobre'], 5: ['5 c', 'cobre'], 10: ['10 c', 'oro'], 20: ['20 c', 'oro'], 50: ['50 c', 'oro'], 100: ['1 €', 'bi'], 200: ['2 €', 'bi2'],
    500: ['5 €', 'billete b5'], 1000: ['10 €', 'billete b10'], 2000: ['20 €', 'billete b20'] };
  const fmt = (c) => c >= 100 ? (c % 100 ? (c / 100).toFixed(2).replace('.', ',') : c / 100) + ' €' : c + ' c';
  const dinero = (a, v, peq) => { const [l, cl] = MONEDAS[v]; return a.h('div', { class: (cl.startsWith('billete') ? '' : 'tm-moneda ') + cl + (peq ? ' peq' : '') }, l); };
  M.tienda = (a, d) => {
    let mezcla = false;
    const juguetes = d.juguetes || ['🧸', '✈️', '🦁', '🦒', '🚂', '🪀', '🪁', '🎨', '🧩', '🛴', '🎲', '🦖', '🚁', '🛻', '🪆', '🎻'];
    const elegir = () => menu(a, { titulo: '🧸 La juguetería: paga el precio exacto', fondo: 'linear-gradient(#6fcf5b,#3fa83a)',
      extra: a.h('div', { class: 'tm-tabs' }, [['Un tipo de moneda', false], ['Monedas mezcladas', true]].map(([l, s]) => a.h('button', { class: 'tm-tab' + (s === mezcla ? ' sel' : ''), onclick: () => { mezcla = s; elegir(); } }, l))),
      grupos: [{ titulo: mezcla ? 'Elige hasta cuánto' : 'Paga usando solo un tipo de moneda', color: '#3d8bfd',
        botones: mezcla ? [[10, 'Hasta 10 c'], [20, 'Hasta 20 c'], [50, 'Hasta 50 c'], [100, 'Hasta 1 €'], [200, 'Hasta 2 €'], [500, 'Hasta 5 €'], [1000, 'Hasta 10 €'], [2000, 'Hasta 20 €']].map(([v, l]) => ({ l, v }))
          : [1, 2, 5, 10, 20, 50, 100, 200].map(m => ({ l: MONEDAS[m][0] + ' (hasta ' + fmt(m * 10) + ')', v: m })) }],
      alElegir: (v, nombre) => empezar(v, nombre) });
    const empezar = (v, nombre) => {
      let ok = 0, tot = 0;
      const { bar, puntuar } = barraJuego(a, (mezcla ? 'Mezcladas · ' : 'Una moneda · ') + nombre, elegir);
      const escena = a.h('div', { class: 'tm-tienda' });
      const ronda = () => {
        let precio, tipos;
        if (mezcla) { tipos = Object.keys(MONEDAS).map(Number).filter(m => m <= v); precio = v <= 100 ? a.ent(Math.ceil(v / 4), v) : Math.round(a.ent(v / 5, v) / 5) * 5; if (v <= 20) precio = a.ent(3, v); }
        else { tipos = [v]; precio = v * a.ent(2, 10); }
        let puesto = 0; const pila = [];
        const caja = a.h('div', { class: 'tm-caja tm-destino' });
        const juguete = a.azar(juguetes);
        const foto = String(juguete).startsWith('pj:') ? a.pj(juguete.slice(3), 'pj') : a.h('span', { class: 'tm-juguete' }, juguete);
        const msg = a.h('div', { class: 'tm-msg' });
        const meter = (m) => { puesto += m; pila.push(m); caja.append(dinero(a, m, true)); a.sfx.clic(); msg.textContent = ''; };
        const bandeja = a.h('div', { class: 'tm-bandeja' }, (mezcla ? tipos : Array(8).fill(v)).map(m => { const e = dinero(a, m); a.arrastrable(e, { destinos: '.tm-destino', alTocar: () => meter(m), alSoltar: (z) => z && meter(m), clon: true }); return e; }));
        escena.replaceChildren(a.h('div', { class: 'tm-frase claro' }, 'Da el dinero exacto para comprar el juguete'),
          a.h('div', { class: 'tm-fila' }, a.h('div', { class: 'tm-producto' }, foto, a.h('div', { class: 'tm-etiqueta' }, fmt(precio))), caja),
          a.h('div', { class: 'tm-botones' }, msg,
            a.h('button', { class: 'tm-btn', onclick: () => { puesto = 0; pila.length = 0; caja.innerHTML = ''; } }, 'Borrar'),
            a.h('button', { class: 'tm-btn ok', onclick: () => {
              tot++;
              if (puesto === precio) { ok++; a.acierto(); msg.className = 'tm-msg bien'; msg.textContent = '¡Correcto, muy bien!'; a.habla('¡Justo! ' + fmt(precio)); setTimeout(ronda, 1500); }
              else { a.fallo(caja); msg.className = 'tm-msg mal'; msg.textContent = puesto > precio ? 'Te has pasado: has puesto ' + fmt(puesto) : 'Te falta: has puesto ' + fmt(puesto); }
              puntuar(ok, tot);
            } }, 'Comprobar')),
          bandeja);
      };
      a.cuerpo.replaceChildren(bar, escena); a.cuerpo.style.overflowY = 'auto'; ronda();
    };
    elegir();
  };

  /* ---------- 6. Reloj de clase (herramienta como el «Teaching Clock») ---------- */
  M.reloj = (a) => {
    let min = 12 * 60, tipo = 'ana', paso = 30, retoMin = null, ok = 0, tot = 0;
    const svgBox = a.h('div', { class: 'tm-reloj-cara' });
    const digital = a.h('div', { class: 'tm-digital' });
    const tarde = a.h('div', { class: 'tm-ampm' });
    const reto = a.h('div', { class: 'tm-reto' });
    const pintar = () => {
      min = ((min % 1440) + 1440) % 1440;
      const hh = Math.floor(min / 60), mm = min % 60;
      if (tipo === 'ana') { svgBox.innerHTML = App.relojSVG(hh, mm, 'min(420px,52vh)'); digital.style.display = 'none'; svgBox.style.display = ''; }
      else { svgBox.style.display = 'none'; digital.style.display = ''; digital.textContent = tipo === 'd12' ? ((hh % 12) || 12) + ':' + String(mm).padStart(2, '0') : String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
      tarde.textContent = hh < 12 ? '☀️ MAÑANA (a. m.)' : '🌙 TARDE (p. m.)';
      const s = svgBox.querySelector('svg'); if (s) activarArrastre(s);
    };
    const activarArrastre = (svg) => {
      svg.style.touchAction = 'none'; let arr = null;
      const ang = (e) => { const r = svg.getBoundingClientRect(); const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); return { g: (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360, d: Math.hypot(x, y) / (r.width / 2) }; };
      svg.onpointerdown = (e) => { e.preventDefault(); arr = ang(e).d < 0.55 ? 'h' : 'm'; svg.setPointerCapture(e.pointerId); };
      svg.onpointermove = (e) => {
        if (!arr) return; const { g } = ang(e); const hh = Math.floor(min / 60), mm = min % 60;
        if (arr === 'm') { let nm = Math.round(g / 6) % 60; let dh = 0; if (mm > 45 && nm < 15) dh = 1; if (mm < 15 && nm > 45) dh = -1; min = (hh + dh) * 60 + nm; }
        else { let nh = Math.round(g / 30 - mm / 60) % 12; if (nh < 0) nh += 12; min = (hh >= 12 ? nh + 12 : nh) * 60 + mm; }
        const s2 = svgBox.querySelector('svg'); const h2 = Math.floor(((min % 1440) + 1440) % 1440 / 60), m2 = ((min % 60) + 60) % 60;
        s2.querySelector('#mh').setAttribute('transform', `rotate(${((h2 % 12) + m2 / 60) * 30})`); s2.querySelector('#mm').setAttribute('transform', `rotate(${m2 * 6})`);
        tarde.textContent = h2 < 12 ? '☀️ MAÑANA (a. m.)' : '🌙 TARDE (p. m.)';
      };
      svg.onpointerup = () => { arr = null; pintar(); };
    };
    const fila = (l, v) => a.h('div', { class: 'tm-fila-mas' }, a.h('button', { class: 'tm-mm', onclick: () => { min -= v; a.sfx.clic(); pintar(); } }, '−'), a.h('span', {}, l), a.h('button', { class: 'tm-mm', onclick: () => { min += v; a.sfx.clic(); pintar(); } }, '+'));
    const tipoBtn = (t, l) => a.h('button', { class: 'tm-tipo', onclick: () => { tipo = t; pintar(); } }, l);
    const pasoTxt = a.h('span', {}, paso + ' min');
    const pasos = [5, 15, 30, 60];
    const panel = a.h('div', { class: 'tm-panel-reloj' },
      a.h('div', { class: 'tm-sub' }, 'Tipo de reloj'), a.h('div', { class: 'tm-tipos' }, tipoBtn('ana', '🕒'), tipoBtn('d12', '2:20'), tipoBtn('d24', '14:20')),
      fila('1 minuto', 1), fila('5 minutos', 5), fila('10 minutos', 10), fila('15 minutos', 15), fila('30 minutos', 30), fila('1 hora', 60),
      a.h('div', { class: 'tm-botones2' },
        a.h('button', { class: 'tm-btn', onclick: () => { min = a.ent(0, 1439 / paso | 0) * paso; pintar(); } }, 'Aleatoria'),
        a.h('button', { class: 'tm-btn', onclick: () => { const n = new Date(); min = n.getHours() * 60 + n.getMinutes(); pintar(); a.habla('Ahora son ' + App.horaTexto(n.getHours(), n.getMinutes() - n.getMinutes() % 5)); } }, 'Ahora')),
      a.h('div', { class: 'tm-pasos' }, 'De ', a.h('button', { class: 'tm-mm', onclick: () => { paso = pasos[(pasos.indexOf(paso) + 3) % 4]; pasoTxt.textContent = paso + ' min'; } }, '‹'), pasoTxt, a.h('button', { class: 'tm-mm', onclick: () => { paso = pasos[(pasos.indexOf(paso) + 1) % 4]; pasoTxt.textContent = paso + ' min'; } }, '›')),
      a.h('div', { class: 'tm-botones2' }, a.h('button', { class: 'tm-btn', onclick: () => { min = 12 * 60; pintar(); } }, 'Reiniciar'),
        a.h('button', { class: 'tm-btn ok', onclick: () => nuevoReto() }, '🎯 Reto')));
    const nuevoReto = () => {
      const hh = a.ent(1, 12), mm = a.azar(paso >= 30 ? [0, 30] : paso === 15 ? [0, 15, 30, 45] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
      retoMin = hh * 60 + mm; tipo = 'ana';
      reto.replaceChildren(a.h('span', {}, '🎯 Pon las ' + hh + ':' + String(mm).padStart(2, '0') + ' (' + App.horaTexto(hh, mm) + ')'), a.h('button', { class: 'tm-btn ok', onclick: () => {
        tot++; const actual = min % 720 || 720;
        if (actual % 720 === retoMin % 720) { ok++; a.acierto(svgBox); a.habla('¡Muy bien! Son ' + App.horaTexto(hh, mm)); setTimeout(nuevoReto, 1300); }
        else { a.fallo(svgBox); }
        reto.lastChild.textContent = 'Comprobar (' + ok + '/' + tot + ')';
      } }, 'Comprobar (' + ok + '/' + tot + ')'));
      a.habla('Pon las ' + App.horaTexto(hh, mm)); pintar();
    };
    a.cuerpo.replaceChildren(a.h('div', { class: 'tm-reloj' }, panel, a.h('div', { class: 'tm-reloj-der' }, tarde, svgBox, digital, reto)));
    a.cuerpo.style.overflowY = 'auto';
    pintar();
  };
})();
