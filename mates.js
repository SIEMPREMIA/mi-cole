/* Juegos de matemáticas (inspirados en los que usan en clase) */
'use strict';
(() => {
  const M = App.MOTORES;
  const NUM = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];
  const MIN = { 0: 'en punto', 5: 'y cinco', 10: 'y diez', 15: 'y cuarto', 20: 'y veinte', 25: 'y veinticinco', 30: 'y media', 35: 'menos veinticinco', 40: 'menos veinte', 45: 'menos cuarto', 50: 'menos diez', 55: 'menos cinco' };
  function horaTexto(hh, mm) {
    let hr = mm > 30 ? hh + 1 : hh; hr = ((hr - 1) % 12) + 1;
    const art = hr === 1 ? 'la ' : 'las ';
    return (art + NUM[hr] + ' ' + MIN[mm]).replace('las una', 'la una');
  }
  App.horaTexto = horaTexto;
  App.relojSVG = (hh, mm, tam = 220, conManillas = true) => {
    let s = `<svg viewBox="-110 -110 220 220" width="${tam}" height="${tam}"><circle r="104" fill="#fff" stroke="#2d2a4a" stroke-width="8"/>`;
    for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, l = i % 5 ? 92 : 84; s += `<line x1="${96 * Math.sin(a)}" y1="${-96 * Math.cos(a)}" x2="${l * Math.sin(a)}" y2="${-l * Math.cos(a)}" stroke="#2d2a4a" stroke-width="${i % 5 ? 1.5 : 4}"/>`; }
    for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6; s += `<text x="${70 * Math.sin(a)}" y="${-70 * Math.cos(a) + 8}" font-size="22" font-weight="900" text-anchor="middle" fill="#2d2a4a">${n}</text>`; }
    if (conManillas) {
      const ah = ((hh % 12) + mm / 60) * 30, am = mm * 6;
      s += `<line id="mh" x2="0" y2="-48" stroke="#ef4a5c" stroke-width="10" stroke-linecap="round" transform="rotate(${ah})"/><line id="mm" x2="0" y2="-80" stroke="#3d8bfd" stroke-width="7" stroke-linecap="round" transform="rotate(${am})"/>`;
    }
    return s + `<circle r="8" fill="#2d2a4a"/></svg>`;
  };

  /* Valor posicional: baloncesto */
  M.baloncesto = (a) => {
    const RONDAS = 10; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const n = i < 4 ? a.ent(10, 99) : a.ent(100, 999); const s = String(n); const pos = a.ent(0, s.length - 1);
      const dig = +s[pos], valor = dig * 10 ** (s.length - 1 - pos);
      const nombres = ['unidades', 'decenas', 'centenas'];
      const opciones = [...new Set([valor, dig, dig * 100, dig * 10, valor + 1, valor + 10].filter(v => v >= 0))].slice(0, 4);
      let fallado = false;
      const aro = a.h('div', { class: 'canasta' }, '🗑️🏀');
      const num = a.h('div', { class: 'numero-grande' }, [...s].map((c, k) => k === pos ? a.h('span', { class: 'resalta' }, c) : c));
      const ops = a.h('div', { class: 'opciones', style: { gridTemplateColumns: 'repeat(4,1fr)' } }, a.mezclar(opciones).map(o => {
        const b = a.h('button', { class: 'op', onclick: () => {
          if (b.dataset.bloq) return;
          if (o === valor) { fallado ? a.sfx.bien() : a.acierto(b); aro.textContent = '🏀🗑️ ¡CANASTA!'; a.habla(dig + ' ' + nombres[s.length - 1 - pos] + ', vale ' + valor); ops.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => { i++; paso(); }, 1500); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, String(o)); return b;
      }));
      a.cuerpo.replaceChildren(a.instr('¿Cuánto vale la cifra rosa?'), aro, num, ops);
    };
    paso();
  };

  /* Series: dragón (ordenar) y gusano (completar huecos) */
  M.serie = (a, d) => {
    const RONDAS = 6; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      if (d.modo === 'dragon') {
        const salto = a.azar([1, 2, 5, 10]), ini = a.ent(1, 60) * (salto === 10 ? 1 : 1); const n = 5;
        const serie = Array.from({ length: n }, (_, k) => ini + k * salto);
        const cuerpo = a.h('div', { class: 'dragon' }, a.h('span', { class: 'cabeza' }, '🐲'), serie.map((_, k) => a.h('div', { class: 'seg hueco zona-seg', 'data-k': k }, '')));
        const banco = a.h('div', { class: 'dragon' });
        let pos = 0, fallado = false;
        const huecos = () => [...cuerpo.querySelectorAll('.zona-seg')];
        const poner = (b, v) => {
          if (v === serie[pos]) { const hu = huecos()[pos]; hu.textContent = v; hu.classList.remove('hueco'); hu.style.setProperty('--c', ['#ef4a5c', '#f39c33', '#ffd54a', '#2fb45a', '#3d8bfd'][pos % 5]); b.remove(); pos++; a.sfx.clic();
            if (pos === n) { fallado ? a.sfx.bien() : a.acierto(); a.habla(serie.join(', ')); a.espera(() => { i++; paso(); }, 1400); } }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; }
        };
        a.mezclar(serie).forEach(v => { const b = a.h('button', { class: 'seg', style: { '--c': '#9b5cff' } }, v); a.arrastrable(b, { destinos: '.zona-seg', alTocar: () => poner(b, v), alSoltar: (z) => z && poner(b, v) }); banco.append(b); });
        a.cuerpo.replaceChildren(a.instr('Ordena de menor a mayor (toca o arrastra)'), cuerpo, banco);
      } else {
        const salto = a.azar([1, 2, 5, 10]), desc = i % 2 === 1, ini = desc ? a.ent(40, 99) : a.ent(0, 50);
        const serie = Array.from({ length: 7 }, (_, k) => desc ? ini - k * salto : ini + k * salto);
        const ocultos = a.mezclar([1, 2, 3, 4, 5, 6]).slice(0, 3).sort((x, y) => x - y); let k = 0, fallado = false;
        const fila = a.h('div', { class: 'dragon' }, a.h('span', { class: 'cabeza' }, '🐛'), serie.map((v, j) => a.h('div', { class: 'seg' + (ocultos.includes(j) ? ' hueco' : ''), style: { '--c': '#7ad46f' }, 'data-j': j }, ocultos.includes(j) ? '?' : v)));
        const marcar = () => fila.querySelectorAll('.hueco').forEach(e => e.style.outline = +e.dataset.j === ocultos[k] ? '5px solid #3d8bfd' : '');
        const correcta = () => serie[ocultos[k]];
        const opciones = () => a.mezclar([...new Set([correcta(), correcta() + salto, correcta() - salto, correcta() + 1])]);
        const banco = a.h('div', { class: 'banco' });
        const pintarOps = () => {
          banco.replaceChildren(...opciones().map(o => a.h('button', { class: 'ficha-palabra', style: { fontSize: '34px', minWidth: '100px' }, onclick: (e) => {
            if (o === correcta()) { const el = fila.querySelector(`[data-j="${ocultos[k]}"]`); el.textContent = o; el.classList.remove('hueco'); el.style.outline = ''; a.sfx.clic(); k++;
              if (k === ocultos.length) { fallado ? a.sfx.bien() : a.acierto(); a.habla(serie.join(', ')); a.espera(() => { i++; paso(); }, 1400); } else { marcar(); pintarOps(); } }
            else { fallado ? a.sfx.mal() : a.fallo(e.currentTarget); fallado = true; }
          } }, o)));
        };
        marcar(); pintarOps();
        a.cuerpo.replaceChildren(a.instr((desc ? 'Hacia atrás' : 'Hacia delante') + ': ¿qué número falta?'), fila, banco);
      }
    };
    paso();
  };

  /* Robots: 1 más / 1 menos / 10 más / 10 menos */
  M.robots = (a) => {
    const RONDAS = 10; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const op = a.azar([1, -1, 10, -10]); const n = a.ent(op < 0 ? 12 : 5, 189);
      const r = n + op; const txt = (Math.abs(op) === 1 ? '1 ' : '10 ') + (op > 0 ? 'más' : 'menos');
      let fallado = false;
      const cand = [...new Set([r, n - op, r + 1, r - 1, n, r + 10, r - 10].filter(v => v >= 0))].slice(0, 4);
      const ops = a.h('div', { class: 'opciones', style: { gridTemplateColumns: 'repeat(4,1fr)' } }, a.mezclar(cand).map(o => {
        const b = a.h('button', { class: 'op', onclick: () => {
          if (b.dataset.bloq) return;
          if (o === r) { fallado ? a.sfx.bien() : a.acierto(b); robot.textContent = '🤖✨'; ops.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => { i++; paso(); }, 1000); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, String(o)); return b;
      }));
      const robot = a.h('div', { class: 'cabeza', style: { textAlign: 'center' } }, '🤖');
      a.cuerpo.replaceChildren(robot, a.h('div', { class: 'pregunta' }, a.h('div', { class: 'instr', style: { margin: 0 } }, a.btnHablar(txt + ' que ' + n), a.h('span', {}, '¿Cuánto es ' + txt + ' que ' + n + '?'))), ops);
    };
    paso();
  };

  /* Juguetería: pagar con monedas y billetes */
  M.tienda = (a) => {
    const juguetes = ['🧸', '🪀', '🚂', '🪁', '🎨', '🧩', '🪆', '🛴', '🎲', '🚁', '🦖', '🎻'];
    const DINERO = [[1, 'm', 'cobre', '1 c'], [2, 'm', 'cobre', '2 c'], [5, 'm', 'cobre', '5 c'], [10, 'm', '', '10 c'], [20, 'm', '', '20 c'], [50, 'm', '', '50 c'],
      [100, 'm', 'bi', '1 €'], [200, 'm', 'bi', '2 €'], [500, 'b', '#7f9c98', '5 €'], [1000, 'b', '#e0604f', '10 €'], [2000, 'b', '#4a87c8', '20 €']];
    const RONDAS = 6; let i = 0;
    const fmt = (c) => c % 100 === 0 ? (c / 100) + ' €' : c >= 100 ? (Math.floor(c / 100) + ',' + String(c % 100).padStart(2, '0') + ' €') : c + ' céntimos';
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const precio = i < 2 ? a.ent(2, 15) * 100 : i < 4 ? a.ent(10, 95) * 10 : a.ent(105, 2500 / 5) * 5;
      let pagado = 0, fallado = false; const dejado = [];
      const caja = a.h('div', { class: 'zona zona-pago', style: { minHeight: '150px' } }, a.h('span', { class: 'nota' }, 'Suelta aquí el dinero'));
      const total = a.h('div', { class: 'instr' });
      const act = () => { total.textContent = 'Has puesto: ' + fmt(pagado); };
      const quitar = () => { if (!dejado.length) return; const v = dejado.pop(); pagado -= v; caja.removeChild(caja.lastChild); act(); };
      const meter = (v, cl, lab, tipo) => {
        if (caja.querySelector('.nota')) caja.querySelector('.nota').remove();
        pagado += v; dejado.push(v); a.sfx.clic();
        const src = a.rec((tipo === 'b' ? 'din-b' : 'din-m') + v); caja.append(src ? a.h('div', { class: (tipo === 'b' ? 'din-billete' : 'din-moneda') + ' peq din-' + v }, a.h('img', { src, alt: lab })) : tipo === 'b' ? a.h('div', { class: 'billete', style: { background: cl, width: '100px', height: '54px', fontSize: '18px' } }, lab) : a.h('div', { class: 'moneda ' + cl, style: { width: '62px', fontSize: '14px' } }, lab));
        act();
      };
      const mon = a.h('div', { class: 'monedas' }, DINERO.filter(([v]) => v <= Math.max(precio, 200) * 1.5).map(([v, t, cl, lab]) => {
        const src = a.rec((t === 'b' ? 'din-b' : 'din-m') + v); const e = src ? a.h('div', { class: (t === 'b' ? 'din-billete' : 'din-moneda') + ' din-' + v }, a.h('img', { src, alt: lab, draggable: false })) : t === 'b' ? a.h('div', { class: 'billete', style: { background: cl } }, lab) : a.h('div', { class: 'moneda ' + cl }, lab);
        a.arrastrable(e, { destinos: '.zona-pago', alTocar: () => meter(v, cl, lab, t), alSoltar: (z) => z && meter(v, cl, lab, t) });
        return e;
      }));
      const comprobar = () => {
        if (pagado === precio) { fallado ? a.sfx.bien() : a.acierto(caja); a.habla('¡Justo! ' + fmt(precio)); a.espera(() => { i++; paso(); }, 1300); }
        else { fallado ? a.sfx.mal() : a.fallo(caja); fallado = true; a.habla(pagado > precio ? 'Te has pasado' : 'Te falta dinero'); }
      };
      const j = a.azar(juguetes);
      a.cuerpo.replaceChildren(a.h('div', { class: 'pregunta', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '12px' } },
        a.h('span', { style: { fontSize: '80px' } }, j), a.h('span', {}, 'Cuesta ' + fmt(precio)), a.btnHablar('Cuesta ' + fmt(precio))),
        caja, total, mon, a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#f39c33' }, onclick: quitar }, '↩️ Quitar'), a.h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: comprobar }, '🛒 Pagar')));
      a.cuerpo.style.overflowY = 'auto'; act();
    };
    paso();
  };

  /* Reloj: mover agujas */
  M.reloj = (a) => {
    const RONDAS = 6; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const hh = a.ent(1, 12), mm = i < 2 ? a.azar([0, 30]) : i < 4 ? a.azar([0, 15, 30, 45]) : a.ent(0, 11) * 5;
      let ch = 12, cm = 0, fallado = false;
      const cont = a.h('div', { html: App.relojSVG(ch, cm, 'min(380px,48vh)'), style: { display: 'flex', justifyContent: 'center', touchAction: 'none' } });
      const svg = cont.querySelector('svg'); svg.style.touchAction = 'none';
      const digital = a.h('div', { class: 'pregunta', style: { fontSize: '30px', padding: '10px' } });
      const pintar = () => { svg.querySelector('#mh').setAttribute('transform', `rotate(${((ch % 12) + cm / 60) * 30})`); svg.querySelector('#mm').setAttribute('transform', `rotate(${cm * 6})`); digital.textContent = '🕒 ' + ch + ':' + String(cm).padStart(2, '0'); };
      let arr = null;
      const ang = (e) => { const r = svg.getBoundingClientRect(); const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); return { g: (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360, d: Math.hypot(x, y) / (r.width / 2) }; };
      svg.addEventListener('pointerdown', (e) => { e.preventDefault(); const { d } = ang(e); arr = d < 0.55 ? 'h' : 'm'; svg.setPointerCapture(e.pointerId); mover(e); });
      const mover = (e) => {
        if (!arr) return; const { g } = ang(e);
        if (arr === 'm') { const nm = Math.round(g / 30) * 5 % 60; if (cm >= 45 && nm <= 15 && nm !== cm) ch = ch % 12 + 1; else if (cm <= 15 && nm >= 45 && nm !== cm) ch = (ch + 10) % 12 + 1; cm = nm; }
        else { ch = Math.round(((g / 30) - cm / 60)) % 12; if (ch <= 0) ch += 12; }
        pintar();
      };
      svg.addEventListener('pointermove', mover); svg.addEventListener('pointerup', () => arr = null);
      const comprobar = () => {
        if (ch === hh && cm === mm) { fallado ? a.sfx.bien() : a.acierto(cont); a.habla('¡Muy bien! Son ' + horaTexto(hh, mm)); a.espera(() => { i++; paso(); }, 1500); }
        else { fallado ? a.sfx.mal() : a.fallo(cont); fallado = true; }
      };
      pintar();
      const t = 'Pon las ' + hh + ':' + String(mm).padStart(2, '0') + ' (' + horaTexto(hh, mm) + ')';
      a.cuerpo.replaceChildren(a.instr(t), a.h('p', { class: 'nota', style: { textAlign: 'center', margin: '0 0 6px' } }, 'Aguja roja (corta) = horas · Aguja azul (larga) = minutos. Toca cerca del centro para la corta.'), cont, digital,
        a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: comprobar }, '✅ Comprobar')));
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* ¿Qué hora es? */
  M.quehora = (a) => {
    const RONDAS = 8; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const hh = a.ent(1, 12), mm = i < 3 ? a.azar([0, 30]) : a.azar([0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55]);
      const r = horaTexto(hh, mm);
      const mal = new Set(); while (mal.size < 3) { const x = horaTexto(a.ent(1, 12), a.azar([0, 15, 30, 45, mm])); if (x !== r) mal.add(x); }
      let fallado = false;
      const ops = a.h('div', { class: 'opciones' }, a.mezclar([r, ...mal]).map(o => {
        const b = a.h('button', { class: 'op', style: { fontSize: '24px' }, onclick: () => {
          if (b.dataset.bloq) return;
          if (o === r) { fallado ? a.sfx.bien() : a.acierto(b); a.habla('Son ' + r); ops.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => { i++; paso(); }, 1300); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, o); return b;
      }));
      a.cuerpo.replaceChildren(a.instr('¿QUÉ HORA ES?'), a.h('div', { style: { display: 'flex', justifyContent: 'center', gap: '30px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' } },
        a.h('div', { html: App.relojSVG(hh, mm, 'min(260px,34vh)') }),
        a.h('div', { style: { background: '#2fb4b4', borderRadius: '24px', padding: '16px 26px', fontSize: '56px', fontWeight: 900, color: '#fff', fontFamily: 'monospace', boxShadow: 'var(--sombra)' } }, String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'))), ops);
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* Recta */
  M.recta = (a) => {
    const RONDAS = 8; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const paso10 = i >= 4; const ini = paso10 ? a.ent(0, 5) * 10 : a.ent(0, 80); const salto = paso10 ? 10 : 1; const N = 11;
      const vals = Array.from({ length: N }, (_, k) => ini + k * salto);
      const ocultos = a.mezclar(vals.slice(1, -1)).slice(0, 3);
      const rana = a.h('div', { class: 'recta-rana' }, '🐸');
      const recta = a.h('div', { class: 'recta2' }, a.h('div', { class: 'regla' }), rana);
      const pos = (k) => (4 + (k / (N - 1)) * 92) + '%';
      vals.forEach((v, k) => {
        if (ocultos.includes(v)) recta.append(a.h('div', { class: 'r-hueco zona-recta', 'data-v': v, 'data-k': k, style: { left: pos(k) } }, '?'));
        else recta.append(a.h('div', { class: 'r-num', style: { left: pos(k) } }, a.h('i'), a.h('b', {}, v)));
      });
      rana.style.left = pos(0);
      let hechos = 0, fallado = false, elegida = null;
      const colocar = (z, b, v) => {
        if (!z || !z.classList.contains('zona-recta')) return;
        if (+z.dataset.v === v) {
          z.classList.remove('zona-recta'); z.classList.add('puesto'); z.textContent = v; b.remove(); elegida = null; a.sfx.pop(); hechos++;
          rana.style.left = pos(+z.dataset.k); rana.classList.remove('salta'); void rana.offsetWidth; rana.classList.add('salta'); a.habla(String(v));
          if (hechos === ocultos.length) { fallado ? a.sfx.bien() : a.acierto(); a.confeti && a.confeti(); a.espera(() => { i++; paso(); }, 1300); }
        } else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; a.pista('Mira el número de antes y el de después del hueco.'); }
      };
      const banco = a.h('div', { class: 'banco' }, a.mezclar(ocultos).map(v => {
        const b = a.h('div', { class: 'ficha-palabra r-ficha' }, v);
        a.arrastrable(b, { destinos: '.zona-recta', alSoltar: (z) => colocar(z, b, v), alTocar: () => { document.querySelectorAll('.r-ficha.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); elegida = [b, v]; a.sfx.clic(); } });
        return b;
      }));
      recta.addEventListener('click', (e) => { const z = e.target.closest('.zona-recta'); if (z && elegida) colocar(z, elegida[0], elegida[1]); });
      a.pista(paso10 ? 'Los números van de 10 en 10.' : 'Los números van de 1 en 1.');
      a.cuerpo.replaceChildren(a.instr('Arrastra cada número a su hueco (o tócalo y luego toca el hueco)'), recta, banco);
    };
    paso();
  };

  /* Geoplano: toca los clavos y la goma se cierra sola. Si la figura está bien, sale «¡Listo!» */
  M.geoplano = (a) => {
    const RETOS = [['un triángulo', 3, 'tri'], ['un cuadrado', 4, 'cua'], ['un rectángulo', 4, 'rec'], ['un triángulo grande', 3, 'tri'], ['una figura de 5 lados', 5, 'n'], ['una figura de 6 lados', 6, 'n']];
    let r = 0; const N = 5, S = 100;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${S * (N + 1)} ${S * (N + 1)}`); svg.setAttribute('class', 'geo2');
    const tabla = document.createElementNS(NS, 'rect'); tabla.setAttribute('x', 20); tabla.setAttribute('y', 20); tabla.setAttribute('width', S * (N + 1) - 40); tabla.setAttribute('height', S * (N + 1) - 40); tabla.setAttribute('rx', 30); tabla.setAttribute('class', 'geo-tabla'); svg.append(tabla);
    const forma = document.createElementNS(NS, 'polygon'); forma.setAttribute('class', 'geo-goma'); svg.append(forma);
    const linea = document.createElementNS(NS, 'polyline'); linea.setAttribute('class', 'geo-goma abierta'); svg.append(linea);
    let pts = [], bloq = false;
    const clavos = [];
    for (let y = 1; y <= N; y++) for (let x = 1; x <= N; x++) {
      const g = document.createElementNS(NS, 'circle'); g.setAttribute('cx', x * S); g.setAttribute('cy', y * S); g.setAttribute('r', 34); g.setAttribute('fill', 'transparent');
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x * S); c.setAttribute('cy', y * S); c.setAttribute('r', 15); c.setAttribute('class', 'geo-clavo');
      g.addEventListener('pointerdown', (e) => { e.preventDefault(); tocar(x, y, c); }); svg.append(c, g); clavos.push(c);
    }
    const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    const area = (P) => Math.abs(P.reduce((s, p, k) => { const q = P[(k + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    const rectos = (P) => P.every((p, k) => { const o = P[(k + 3) % 4], q = P[(k + 1) % 4]; return (o[0] - p[0]) * (q[0] - p[0]) + (o[1] - p[1]) * (q[1] - p[1]) === 0; });
    const valida = (tipo, P) => {
      if (area(P) === 0) return false;
      if (tipo === 'cua') return rectos(P) && dist2(P[0], P[1]) === dist2(P[1], P[2]);
      if (tipo === 'rec') return rectos(P);
      return true;
    };
    const dibujar = () => {
      const t = pts.map(p => p.map(v => v * S).join(',')).join(' ');
      linea.setAttribute('points', t); forma.setAttribute('points', '');
      clavos.forEach(c => c.classList.toggle('usado', pts.some(p => p[0] * S === +c.getAttribute('cx') && p[1] * S === +c.getAttribute('cy'))));
    };
    const reto = a.h('div', { class: 'instr' }); const aviso = a.h('div', { class: 'geo-aviso' });
    const ponerReto = () => { if (r >= RETOS.length) return a.fin(); a.progreso(r, RETOS.length); reto.replaceChildren(a.btnHablar('Haz ' + RETOS[r][0]), a.h('span', {}, 'Haz ' + RETOS[r][0] + ' tocando los clavos')); pts = []; bloq = false; aviso.textContent = ''; aviso.className = 'geo-aviso'; dibujar(); a.pista(RETOS[r][2] === 'cua' ? 'Un cuadrado tiene 4 lados iguales.' : RETOS[r][2] === 'rec' ? 'Un rectángulo tiene 4 esquinas rectas.' : 'Cuenta los lados: ' + RETOS[r][1] + '.'); };
    const tocar = (x, y) => {
      if (bloq) return;
      if (pts.some(p => p[0] === x && p[1] === y)) return;
      pts.push([x, y]); a.sfx.pop(); dibujar();
      const [, n, tipo] = RETOS[r];
      if (pts.length === n) {
        bloq = true;
        forma.setAttribute('points', pts.map(p => p.map(v => v * S).join(',')).join(' ')); linea.setAttribute('points', '');
        if (valida(tipo, pts)) { a.acierto(svg); aviso.textContent = '¡Listo! 🎉'; aviso.className = 'geo-aviso bien'; a.habla('¡Listo! Has hecho ' + RETOS[r][0]); r++; a.espera(ponerReto, 1600); }
        else { a.fallo(svg); aviso.textContent = '¡Casi! Prueba otra vez'; aviso.className = 'geo-aviso mal'; a.habla(tipo === 'cua' ? 'Los cuatro lados tienen que ser iguales' : 'Las esquinas tienen que ser rectas'); a.espera(() => { pts = []; bloq = false; aviso.textContent = ''; dibujar(); }, 1600); }
      }
    };
    a.cuerpo.replaceChildren(reto, a.h('div', { class: 'geo-marco' }, svg), aviso, a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#ef4a5c' }, onclick: () => { if (!bloq) { pts = []; dibujar(); } } }, '🧽 Empezar de nuevo')));
    a.cuerpo.style.overflowY = 'auto';
    ponerReto();
  };

  /* Sumas y restas en columna (con llevadas) */
  M.columnas = (a) => {
    const RONDAS = 6; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const suma = i % 2 === 0, tres = i >= 4;
      let x = tres ? a.ent(120, 899) : a.ent(15, 89), y = tres ? a.ent(50, 399) : a.ent(11, 79);
      if (!suma && y > x) [x, y] = [y, x]; if (suma && x + y > 999) y = 999 - x;
      const r = suma ? x + y : x - y;
      const cifras = String(Math.max(x, r)).length;
      const pad = (n) => String(n).padStart(cifras, ' ').split('');
      const filaN = (n, signo) => [a.h('div', { class: 'c' }, signo), ...pad(n).map(c => a.h('div', { class: 'c' }, c.trim()))];
      const res = pad(r).map(c => c.trim());
      const huecos = res.map((c, k) => a.h('div', { class: 'c hueco', 'data-k': k }, ''));
      const grid = a.h('div', { class: 'columna-op', style: { gridTemplateColumns: `repeat(${cifras + 1}, auto)` } },
        a.h('div', { class: 'c', style: { height: 'auto' } }), ...res.map(() => a.h('div', { class: 'c llevo', contenteditable: false }, '')),
        ...filaN(x, ''), ...filaN(y, suma ? '+' : '−'),
        a.h('div', { style: { gridColumn: '1 / -1', height: '6px', background: 'var(--tinta)', borderRadius: '3px' } }),
        a.h('div', { class: 'c' }, ''), ...huecos);
      // se rellena de derecha a izquierda, como en el cole
      let activo = cifras - 1; let fallado = false;
      const marcar = () => huecos.forEach((hu, k) => hu.classList.toggle('activo', k === activo));
      const llevadas = [...grid.querySelectorAll('.llevo')];
      llevadas.forEach(l => l.onclick = () => { l.textContent = l.textContent ? '' : '1'; a.sfx.clic(); });
      const teclear = (n) => {
        if (activo < 0) return;
        if (res[activo] === '' && n === 0) { activo--; marcar(); return; }
        if (String(n) === res[activo]) { huecos[activo].textContent = n; huecos[activo].style.color = '#1e7f3e'; a.sfx.clic(); activo--;
          while (activo >= 0 && res[activo] === '') activo--;
          marcar(); if (activo < 0) { fallado ? a.sfx.bien() : a.acierto(grid); a.habla(x + (suma ? ' más ' : ' menos ') + y + ' es ' + r); a.espera(() => { i++; paso(); }, 1600); } }
        else { fallado ? a.sfx.mal() : a.fallo(huecos[activo]); fallado = true; }
      };
      marcar();
      const tec = a.h('div', { class: 'teclado-num' }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => a.h('button', { onclick: () => teclear(n) }, n)));
      a.cuerpo.replaceChildren(a.instr(suma ? 'Resuelve la suma. ¡Empieza por las unidades!' : 'Resuelve la resta. ¡Empieza por las unidades!'),
        a.h('p', { class: 'nota', style: { textAlign: 'center', margin: '0 0 8px' } }, 'Toca los cuadritos rojos de arriba para apuntar lo que te llevas.'),
        a.h('div', { style: { display: 'flex', justifyContent: 'center' } }, grid), tec);
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* Descomposición: C D U con bloques */
  M.descomponer = (a) => {
    const RONDAS = 8; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const n = i < 3 ? a.ent(11, 99) : a.ent(101, 999); const c = Math.floor(n / 100), d = Math.floor(n / 10) % 10, u = n % 10;
      const verBloques = i % 2 === 0; let fallado = false;
      const vals = { C: 0, D: 0, U: 0 };
      const campos = ['C', 'D', 'U'].filter(k => k !== 'C' || n >= 100).map(k => {
        const num = a.h('div', { style: { fontSize: '54px', fontWeight: 900, minWidth: '70px', textAlign: 'center' } }, '0');
        const box = a.h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: '#fff', borderRadius: '22px', padding: '12px 18px', boxShadow: 'var(--sombra)' } },
          a.h('div', { style: { fontSize: '26px', fontWeight: 900, color: k === 'C' ? '#e9607e' : k === 'D' ? '#3d8bd6' : '#c9a000' } }, k),
          a.h('button', { class: 'tecla', onclick: () => { vals[k] = (vals[k] + 1) % 10; num.textContent = vals[k]; a.sfx.clic(); } }, '▲'), num,
          a.h('button', { class: 'tecla', onclick: () => { vals[k] = (vals[k] + 9) % 10; num.textContent = vals[k]; a.sfx.clic(); } }, '▼'));
        return box;
      });
      const bloques = a.h('div', { class: 'bloques' },
        c ? a.h('div', { class: 'grupo-bloques' }, Array.from({ length: c }, () => a.h('div', { class: 'cent' }))) : null,
        d ? a.h('div', { class: 'grupo-bloques' }, Array.from({ length: d }, () => a.h('div', { class: 'dec' }))) : null,
        u ? a.h('div', { class: 'grupo-bloques', style: { maxWidth: '90px' } }, Array.from({ length: u }, () => a.h('div', { class: 'uni' }))) : null);
      const comprobar = () => {
        if (vals.C === c && vals.D === d && vals.U === u) { fallado ? a.sfx.bien() : a.acierto(); a.habla(n + ' son ' + (c ? c + ' centenas, ' : '') + d + ' decenas y ' + u + ' unidades'); a.espera(() => { i++; paso(); }, 1800); }
        else { fallado ? a.sfx.mal() : a.fallo(); fallado = true; }
      };
      a.cuerpo.replaceChildren(a.instr(verBloques ? '¿Qué número forman los bloques?' : 'Descompón el número ' + n),
        verBloques ? bloques : a.h('div', { class: 'numero-grande' }, n),
        a.h('div', { style: { display: 'flex', gap: '18px', justifyContent: 'center', margin: '14px 0' } }, campos),
        a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: comprobar }, '✅ Comprobar')));
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* Cálculo con globos */
  M.calculo = (a) => {
    const RONDAS = 10; let i = 0;
    const cielo = a.h('div', { class: 'cielo' }); const preg = a.h('div', { class: 'pregunta', style: { margin: '0 auto 10px', padding: '12px' } });
    const col = ['#ef4a5c', '#3d8bfd', '#f39c33', '#2fb45a', '#9b5cff', '#e94fa5'];
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS); cielo.innerHTML = '';
      const suma = Math.random() < .55; let x = a.ent(5, 60), y = a.ent(2, 30); if (!suma && y > x) [x, y] = [y, x];
      const r = suma ? x + y : x - y; preg.textContent = x + (suma ? ' + ' : ' − ') + y + ' = ?'; a.habla(x + (suma ? ' más ' : ' menos ') + y);
      const ops = [...new Set([r, r + 1, Math.abs(r - 1), r + 10, Math.abs(r - 10)])].slice(0, 4);
      let fallado = false;
      a.mezclar(ops).forEach((o, k) => {
        const g = a.h('button', { class: 'globo', style: { left: (8 + k * 23) + '%', top: (20 + (k % 2) * 25) + '%', background: col[(i + k) % col.length], fontSize: '34px' } }, String(o));
        g.onclick = () => {
          if (g.dataset.bloq) return; a.sfx.pop();
          if (o === r) { fallado ? a.sfx.bien() : a.acierto(); g.textContent = '💥'; cielo.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => { i++; paso(); }, 800); }
          else { fallado ? a.sfx.mal() : a.fallo(g); fallado = true; g.dataset.bloq = 1; g.style.opacity = .3; }
        };
        cielo.append(g);
      });
    };
    a.cuerpo.replaceChildren(preg, cielo); paso();
  };

  /* Multiplicar */
  M.tablas = (a) => {
    const RONDAS = 12; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const t = a.azar([2, 5, 10, 2, 5]), n = a.ent(1, 10), r = t * n; let fallado = false;
      const grupos = a.h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', margin: '8px 0' } },
        Array.from({ length: n }, () => a.h('div', { style: { background: '#fff', borderRadius: '14px', padding: '6px 10px', boxShadow: 'var(--sombra)', fontSize: '22px' } }, '🍓'.repeat(t > 5 ? 0 : t) || '🔟')));
      const ops = a.mezclar([...new Set([r, r + t, Math.max(0, r - t), r + 1])]);
      const caja = a.h('div', { class: 'opciones', style: { gridTemplateColumns: 'repeat(4,1fr)' } }, ops.map(o => {
        const b = a.h('button', { class: 'op', onclick: () => {
          if (b.dataset.bloq) return;
          if (o === r) { fallado ? a.sfx.bien() : a.acierto(b); a.habla(n + ' por ' + t + ', ' + r); caja.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => { i++; paso(); }, 1100); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, String(o)); return b;
      }));
      a.cuerpo.replaceChildren(a.h('div', { class: 'pregunta' }, n + ' × ' + t + ' = ?', a.h('div', { class: 'nota' }, n + ' veces ' + t)), grupos, caja);
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* Comparar */
  M.comparar = (a) => {
    const RONDAS = 10; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const x = a.ent(10, 999), y = Math.random() < .15 ? x : a.ent(Math.max(0, x - 60), x + 60);
      const r = x > y ? '>' : x < y ? '<' : '='; let fallado = false;
      const hueco = a.h('span', { style: { display: 'inline-block', width: '1.4em', border: '5px dashed #b9c8ef', borderRadius: '18px', margin: '0 16px' } }, '?');
      const caja = a.h('div', { class: 'opciones', style: { gridTemplateColumns: 'repeat(3,1fr)' } }, ['<', '=', '>'].map(o => {
        const b = a.h('button', { class: 'op', style: { fontSize: '60px' }, onclick: () => {
          if (b.dataset.bloq) return;
          if (o === r) { fallado ? a.sfx.bien() : a.acierto(b); hueco.textContent = o; hueco.style.borderColor = '#2fb45a'; a.habla(x + (r === '>' ? ' es mayor que ' : r === '<' ? ' es menor que ' : ' es igual a ') + y); caja.querySelectorAll('button').forEach(q => q.dataset.bloq = 1); a.espera(() => { i++; paso(); }, 1400); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; }
        } }, o); return b;
      }));
      a.cuerpo.replaceChildren(a.instr('🐊 El cocodrilo siempre se come el número más grande'), a.h('div', { class: 'numero-grande', style: { fontSize: 'clamp(56px,9vw,110px)' } }, String(x), hueco, String(y)), caja);
    };
    paso();
  };
})();
