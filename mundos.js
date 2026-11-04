/* Juegos propios de cada mundo mágico */
'use strict';
(() => {
  const M = App.MOTORES;
  const opMates = (a, nivel) => {
    const t = a.azar(nivel === 'facil' ? ['suma', 'resta'] : ['suma', 'resta', 'suma10', 'doble']);
    let x, y, r, txt;
    if (t === 'suma') { x = a.ent(5, 45); y = a.ent(2, 30); r = x + y; txt = x + ' + ' + y; }
    else if (t === 'resta') { x = a.ent(20, 70); y = a.ent(2, 19); r = x - y; txt = x + ' − ' + y; }
    else if (t === 'suma10') { x = a.ent(10, 80); r = x + 10; txt = x + ' + 10'; }
    else { x = a.ent(5, 25); r = x * 2; txt = 'el doble de ' + x; }
    const ops = new Set([r]); for (const v of a.mezclar([r + 1, r - 1, r + 10, r - 10, r + 2])) if (ops.size < 3 && v >= 0) ops.add(v);
    return { txt, r, ops: a.mezclar([...ops]) };
  };

  /* Saltar al bloque correcto (Mario) / coger la ola (Stitch) */
  M.salto = (a, d) => {
    const RONDAS = 10; let i = 0, monedas = 0;
    const heroe = a.h('div', { class: 'sal-heroe' }, d.pj ? a.pj(d.pj, 'pj', 0) : '🏃');
    const marc = a.h('div', { class: 'sal-marcador' });
    const escena = a.h('div', { class: 'sal-escena ' + (d.estilo || 'bloques') });
    const preg = a.h('div', { class: 'sal-pregunta' });
    const zonaB = a.h('div', { class: 'sal-bloques' });
    escena.append(preg, zonaB, heroe, a.h('div', { class: 'sal-suelo' }));
    const paso = () => {
      if (i >= RONDAS) return a.fin(monedas + ' monedas');
      a.progreso(i, RONDAS); marc.textContent = (d.estilo === 'olas' ? '🌊 ' : '🪙 ') + monedas;
      let q;
      if (d.modo === 'serie') { const salto = a.azar([2, 5, 10]), ini = a.ent(0, 40); const s = [ini, ini + salto, ini + 2 * salto]; const r = ini + 3 * salto; const ops = a.mezclar([...new Set([r, r + 1, r - 1, r + salto])]).slice(0, 3); if (!ops.includes(r)) ops[0] = r; q = { txt: s.join(', ') + ', ¿…?', r, ops }; a.pista('Cuenta de ' + salto + ' en ' + salto + '.'); }
      else { q = opMates(a); a.pista(q.txt.includes('−') ? 'Restar es quitar. Empieza por las unidades.' : 'Sumar es juntar. Empieza por las unidades.'); }
      preg.textContent = q.txt + (d.modo === 'serie' ? '' : ' = ?');
      heroe.className = 'sal-heroe'; heroe.style.left = '8%';
      zonaB.replaceChildren(...q.ops.map((v, k) => {
        const b = a.h('button', { class: 'sal-bloque', style: { left: (28 + k * 24) + '%' } }, a.h('span', {}, v));
        b.onclick = () => {
          if (zonaB.dataset.bloq) return; zonaB.dataset.bloq = 1;
          heroe.style.left = (28 + k * 24 + 2) + '%'; heroe.classList.add('salta');
          setTimeout(() => {
            heroe.classList.remove('salta');
            if (v === q.r) { a.acierto(); monedas++; b.classList.add('golpeado'); const m = a.h('div', { class: 'sal-moneda' }, d.estilo === 'olas' ? '🐚' : '🪙'); b.append(m); a.sfx.moneda(); a.habla(String(v)); i++; setTimeout(() => { delete zonaB.dataset.bloq; paso(); }, 1100); }
            else { a.fallo(b); heroe.classList.add('cae'); setTimeout(() => { heroe.classList.remove('cae'); heroe.style.left = '8%'; delete zonaB.dataset.bloq; }, 800); }
          }, 600);
        };
        return b;
      }));
    };
    a.cuerpo.replaceChildren(marc, escena); paso();
  };

  /* Buscar y contar en una escena (Toy Story y otros) */
  M.buscar = (a, d) => {
    const RONDAS = 6; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const tipos = a.mezclar(d.objetos).slice(0, 4); const objetivo = tipos[0]; const cuantos = a.ent(3, 9);
      const items = []; tipos.forEach((t, k) => { const n = k === 0 ? cuantos : a.ent(2, 6); for (let j = 0; j < n; j++) items.push(t); });
      let tocados = 0; const modo = i % 2 ? 'contar' : 'tocar';
      const escena = a.h('div', { class: 'bus-escena' });
      const usadas = [];
      a.mezclar(items).forEach(t => {
        let x, y, n = 0; do { x = a.ent(4, 88); y = a.ent(6, 82); n++; } while (n < 40 && usadas.some(([u, v]) => Math.abs(u - x) < 9 && Math.abs(v - y) < 12)); usadas.push([x, y]);
        const b = a.h('button', { class: 'bus-obj', style: { left: x + '%', top: y + '%', transform: `rotate(${a.ent(-20, 20)}deg) scale(${(0.8 + Math.random() * 0.5).toFixed(2)})` } }, t[0]);
        b.onclick = () => {
          if (modo !== 'tocar' || b.classList.contains('hecho')) return;
          if (t === objetivo) { b.classList.add('hecho'); tocados++; a.sfx.pop(); b.append(a.h('i', { class: 'bus-num' }, tocados)); if (tocados === cuantos) { a.acierto(); a.habla(cuantos + ' ' + t[1]); setTimeout(() => { i++; paso(); }, 1200); } }
          else { a.fallo(b); a.pista('Eso no. Busca ' + objetivo[1] + '.'); }
        };
        escena.append(b);
      });
      const fem = objetivo[2] === 'f'; const enunciado = modo === 'tocar' ? 'Toca ' + (fem ? 'todas las ' : 'todos los ') + objetivo[1] : (fem ? '¿Cuántas ' : '¿Cuántos ') + objetivo[1] + ' hay?';
      const abajo = modo === 'contar' ? a.h('div', { class: 'opciones', style: { gridTemplateColumns: 'repeat(4,1fr)' } }, a.mezclar([...new Set([cuantos, cuantos + 1, cuantos - 1, cuantos + 2])]).map(v => a.h('button', { class: 'op', onclick: (e) => { if (v === cuantos) { a.acierto(e.currentTarget); setTimeout(() => { i++; paso(); }, 900); } else a.fallo(e.currentTarget); } }, String(v)))) : null;
      a.pista('Cuenta con el dedo de uno en uno.');
      a.cuerpo.replaceChildren(...[a.instr(enunciado), a.h('div', { class: 'bus-fondo' }, escena), abajo].filter(Boolean));
      if (a.mundo && a.D.fondos && a.D.fondos[a.mundo.id]) escena.style.background = `url(${a.D.fondos[a.mundo.id][0]}) center/cover`;
    };
    paso();
  };

  /* Secuencia musical (K-pop): repite el orden; cada botón es una sílaba y al final se lee la palabra */
  M.secuencia = (a, d) => {
    const palabras = a.mezclar(d.palabras); let i = 0;
    const col = ['#ff4fa3', '#9b5cff', '#3d8bfd', '#2fd0c0', '#ffd54a'];
    const notas = [523, 587, 659, 784, 880];
    const paso = () => {
      if (i >= Math.min(6, palabras.length)) return a.fin();
      a.progreso(i, 6);
      const silabas = palabras[i].split('-'); const botones = a.mezclar(silabas.map((s, k) => ({ s, k })));
      const marco = a.h('div', { class: 'sec-escenario' });
      const tablero = a.h('div', { class: 'sec-pads' });
      const pal = a.h('div', { class: 'sec-palabra' }, silabas.map(() => '_ ').join(''));
      let pos = 0, mostrando = true;
      const pad = botones.map(({ s, k }, j) => {
        const b = a.h('button', { class: 'sec-pad', style: { '--c': col[j % 5] } }, s);
        b.onclick = () => {
          if (mostrando) return;
          b.classList.add('luz'); setTimeout(() => b.classList.remove('luz'), 250);
          App.Musica && a.sfx.clic();
          if (k === pos) { pos++; pal.textContent = silabas.slice(0, pos).join('') + ' ' + silabas.slice(pos).map(() => '_').join(' ');
            if (pos === silabas.length) { a.acierto(); a.habla(silabas.join('')); setTimeout(() => { i++; paso(); }, 1400); } }
          else { a.fallo(b); pos = 0; pal.textContent = silabas.map(() => '_ ').join(''); setTimeout(mostrar, 900); }
        };
        return b;
      });
      tablero.append(...pad);
      const mostrar = () => {
        mostrando = true; let k = 0;
        const t = setInterval(() => {
          if (k > 0) pad[botones.findIndex(b => b.k === k - 1)].classList.remove('luz');
          if (k >= silabas.length) { clearInterval(t); mostrando = false; return; }
          const j = botones.findIndex(b => b.k === k); pad[j].classList.add('luz'); a.habla(silabas[k], 0.8); k++;
        }, 800);
      };
      a.pista('Mira qué luces se encienden y repítelas en el mismo orden.');
      marco.append(pal, tablero, a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', onclick: mostrar }, '🔁 Ver otra vez')));
      a.cuerpo.replaceChildren(a.instr('Repite la canción tocando las sílabas en orden'), marco);
      setTimeout(mostrar, 700);
    };
    paso();
  };

  /* Moverse por la ciudad leyendo instrucciones (Zootrópolis) */
  M.ciudad = (a, d) => {
    const N = 6, RONDAS = 6; let i = 0;
    const FLECHAS = { arriba: [0, -1, '⬆️'], abajo: [0, 1, '⬇️'], izquierda: [-1, 0, '⬅️'], derecha: [1, 0, '➡️'] };
    const sitios = [['🏠', 'casa'], ['🏫', 'colegio'], ['🏥', 'hospital'], ['🍦', 'heladería'], ['🚓', 'comisaría'], ['🌳', 'parque'], ['🏪', 'tienda']];
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      let p = [a.ent(0, N - 1), a.ent(0, N - 1)];
      // genera una ruta de 2 o 3 órdenes
      const pasos = []; let q = p.slice();
      for (let k = 0; k < (i < 2 ? 2 : 3); k++) {
        const opciones = Object.entries(FLECHAS).filter(([, [dx, dy]]) => { const x = q[0] + dx, y = q[1] + dy; return x >= 0 && y >= 0 && x < N && y < N; });
        const [nombre, [dx, dy]] = a.azar(opciones); let n = 1; while (n < 3 && q[0] + dx * (n + 1) >= 0 && q[0] + dx * (n + 1) < N && q[1] + dy * (n + 1) >= 0 && q[1] + dy * (n + 1) < N && Math.random() < .5) n++;
        q = [q[0] + dx * n, q[1] + dy * n]; pasos.push([n, nombre]);
      }
      const destino = a.azar(sitios);
      const texto = pasos.map(([n, nom], k) => (k ? 'luego ' : '') + n + ' paso' + (n > 1 ? 's' : '') + ' hacia ' + (nom === 'arriba' || nom === 'abajo' ? '' : 'la ') + nom).join(', ') + '. ¿Dónde llega ' + (a.nombreQuien || 'Judy') + '?';
      const meta = q; const otros = a.mezclar(sitios.filter(s => s !== destino)).slice(0, 3);
      const celdas = [];
      const tablero = a.h('div', { class: 'ci-tablero', style: { gridTemplateColumns: `repeat(${N},1fr)` } });
      const ocupadas = new Set([p.join(), meta.join()]);
      const pon = (pos, s) => { celdas[pos[1] * N + pos[0]].replaceChildren(a.h('span', { class: 'ci-sitio' }, s[0])); celdas[pos[1] * N + pos[0]].dataset.s = s[1]; };
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = a.h('button', { class: 'ci-celda' }); celdas.push(c); tablero.append(c); }
      pon(meta, destino);
      otros.forEach(s => { let pos; do { pos = [a.ent(0, N - 1), a.ent(0, N - 1)]; } while (ocupadas.has(pos.join())); ocupadas.add(pos.join()); pon(pos, s); });
      const yo = a.h('div', { class: 'ci-yo' }, a.pj(a.quien, 'pj', 0));
      celdas[p[1] * N + p[0]].append(yo);
      tablero.addEventListener('click', (e) => {
        const c = e.target.closest('.ci-celda'); if (!c || !c.dataset.s) return;
        if (c.dataset.s === destino[1]) {
          // anima el recorrido
          let k = 0; const ruta = []; let r = p.slice(); pasos.forEach(([n, nom]) => { for (let j = 0; j < n; j++) { r = [r[0] + FLECHAS[nom][0], r[1] + FLECHAS[nom][1]]; ruta.push(r.slice()); } });
          const t = setInterval(() => { if (k >= ruta.length) { clearInterval(t); a.acierto(); a.habla('¡Al ' + destino[1] + '!'); setTimeout(() => { i++; paso(); }, 1000); return; } celdas[ruta[k][1] * N + ruta[k][0]].append(yo); a.sfx.clic(); k++; }, 350);
        } else { a.fallo(c); a.pista('Sigue con el dedo los pasos, uno a uno.'); }
      });
      a.cuerpo.replaceChildren(a.h('div', { class: 'ci-orden' }, a.btnHablar(texto), a.h('span', {}, pasos.map(([n, nom]) => FLECHAS[nom][2].repeat(n)).join('  ')), a.h('p', {}, texto)), tablero);
      a.cuerpo.style.overflowY = 'auto';
    };
    paso();
  };

  /* Mezclar colores (Trolls) */
  M.colores = (a) => {
    const MEZCLAS = [['rojo', 'amarillo', 'naranja'], ['azul', 'amarillo', 'verde'], ['rojo', 'azul', 'morado'], ['rojo', 'blanco', 'rosa'], ['negro', 'blanco', 'gris'], ['azul', 'blanco', 'celeste']];
    const HEX = { rojo: '#e5394c', amarillo: '#ffd21f', azul: '#2c6ff0', blanco: '#ffffff', negro: '#222', naranja: '#ff8a1e', verde: '#2fb45a', morado: '#8b3fd9', rosa: '#ff9ccd', gris: '#9aa0a6', celeste: '#9fd6ff' };
    const lista = a.mezclar(MEZCLAS); let i = 0;
    const paso = () => {
      if (i >= lista.length) return a.fin();
      a.progreso(i, lista.length);
      const [c1, c2, r] = lista[i]; const elegidos = [];
      const bote = a.h('div', { class: 'co-bote' });
      const base = ['rojo', 'amarillo', 'azul', 'blanco', 'negro'];
      const pinturas = a.h('div', { class: 'co-pinturas' }, base.map(c => a.h('button', { class: 'co-pintura', style: { '--c': HEX[c] }, onclick: (e) => {
        if (elegidos.length >= 2 || elegidos.includes(c)) return; elegidos.push(c); a.sfx.pop(); e.currentTarget.classList.add('usada');
        bote.style.background = elegidos.length === 1 ? HEX[c] : bote.style.background;
        if (elegidos.length === 2) {
          const ok = elegidos.includes(c1) && elegidos.includes(c2);
          const mezclado = MEZCLAS.find(m => elegidos.includes(m[0]) && elegidos.includes(m[1]));
          bote.style.background = mezclado ? HEX[mezclado[2]] : '#6b5a44';
          if (ok) { a.acierto(bote); a.habla(c1 + ' y ' + c2 + ' hacen ' + r); setTimeout(() => { i++; paso(); }, 1500); }
          else { a.fallo(bote); a.pista('Para el ' + r + ' necesitas ' + c1 + '.'); setTimeout(paso, 1400); }
        }
      } }, a.h('span', {}, c))));
      a.cuerpo.replaceChildren(a.h('div', { class: 'co-objetivo' }, 'Haz el color ', a.h('b', { style: { color: HEX[r], WebkitTextStroke: r === 'blanco' ? '1px #333' : '' } }, r.toUpperCase()), a.h('span', { class: 'co-muestra', style: { background: HEX[r] } })), bote, pinturas);
      a.pista('Mezcla dos pinturas. Lee el nombre de cada bote.');
    };
    paso();
  };
})();
