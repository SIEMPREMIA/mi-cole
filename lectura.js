/* Mundo de la lectura: sílabas, palabras, frases, cuentos con karaoke, lectura en voz alta y velocidad */
'use strict';
(() => {
  const M = App.MOTORES;

  /* 1. Toca la sílaba que oyes */
  M['oye-silaba'] = (a, d) => {
    const RONDAS = 10; let i = 0;
    const paso = () => {
      if (i >= RONDAS) return a.fin();
      a.progreso(i, RONDAS);
      const grupo = a.azar(d.grupos); const ops = a.mezclar(grupo).slice(0, 6); const r = a.azar(ops); let fallado = false;
      a.pista('Escucha otra vez y fíjate en la primera letra: ' + r[0].toUpperCase());
      const rej = a.h('div', { class: 'sil-rejilla' }, ops.map((s, k) => a.h('button', { class: 'sil', style: { '--c': ['#ef4a5c', '#3d8bfd', '#f39c33', '#2fb45a', '#9b5cff', '#e94fa5'][k] }, onclick: (e) => {
        if (s === r) { fallado ? a.sfx.bien() : a.acierto(e.currentTarget); a.espera(() => { i++; paso(); }, 900); }
        else { fallado ? a.sfx.mal() : a.fallo(e.currentTarget); fallado = true; a.habla(r, 0.7); }
      } }, s)));
      a.cuerpo.replaceChildren(a.h('div', { class: 'centro' }, a.h('button', { class: 'btn-oir', onclick: () => a.habla(r, 0.7) }, '🔊', a.h('span', {}, 'Escuchar'))), rej);
      a.espera(() => a.habla(r, 0.7), 400);
    };
    paso();
  };

  /* 2. Lee la palabra y toca su dibujo */
  M['lee-dibujo'] = (a, d) => {
    const lista = a.mezclar(d.items).slice(0, 10); let i = 0;
    const paso = () => {
      if (i >= lista.length) return a.fin();
      a.progreso(i, lista.length);
      const it = lista[i]; let fallado = false;
      const ops = a.mezclar([it, ...a.mezclar(d.items.filter(x => x.e !== it.e)).slice(0, 3)]);
      a.pista('Lee despacito: ' + it.p.split('').join(' - '));
      const rej = a.h('div', { class: 'ld-rejilla' }, ops.map(o => a.h('button', { class: 'ld-foto', onclick: (e) => {
        if (o.e === it.e) { fallado ? a.sfx.bien() : a.acierto(e.currentTarget); a.habla(it.p); a.espera(() => { i++; paso(); }, 1100); }
        else { fallado ? a.sfx.mal() : a.fallo(e.currentTarget); fallado = true; }
      } }, o.e)));
      a.cuerpo.replaceChildren(a.h('div', { class: 'ld-palabra' + (d.mayus ? ' mayus' : '') }, d.mayus ? it.p.toUpperCase() : it.p), a.h('p', { class: 'nota', style: { textAlign: 'center' } }, 'Lee la palabra tú sola. Si necesitas ayuda, toca a tu amigo.'), rej);
    };
    paso();
  };

  /* 3. Lee la frase y elige el dibujo que la explica */
  M['lee-frase'] = (a, d) => {
    const lista = a.mezclar(d.items).slice(0, 8); let i = 0;
    const paso = () => {
      if (i >= lista.length) return a.fin();
      a.progreso(i, lista.length);
      const it = lista[i]; let fallado = false;
      const ops = a.mezclar([{ e: it.e, ok: true }, ...it.mal.map(e => ({ e }))]);
      a.pista('Busca las palabras importantes de la frase.');
      a.cuerpo.replaceChildren(a.h('div', { class: 'lf-frase' }, it.f),
        a.h('div', { class: 'ld-rejilla' }, ops.map(o => a.h('button', { class: 'ld-foto escena', onclick: (e) => {
          if (o.ok) { fallado ? a.sfx.bien() : a.acierto(e.currentTarget); a.habla(it.f); a.espera(() => { i++; paso(); }, 1500); }
          else { fallado ? a.sfx.mal() : a.fallo(e.currentTarget); fallado = true; }
        } }, o.e))));
    };
    paso();
  };

  /* 4. Cuento karaoke: las palabras se iluminan mientras se leen, luego preguntas */
  M['karaoke'] = (a, d) => {
    const textos = d.textos; let ti = 0;
    const leer = () => {
      if (ti >= textos.length) return a.fin();
      const t = textos[ti];
      const palabras = t.texto.split(/\s+/);
      const caja = a.h('div', { class: 'kar-texto' }, palabras.map((p, k) => a.h('span', { class: 'kar-p', 'data-k': k, onclick: () => a.habla(p.replace(/[.,;:!?¡¿«»"]/g, '')) }, p + ' ')));
      let corriendo = null;
      const iluminar = (k) => { caja.querySelectorAll('.kar-p').forEach((s, j) => { s.classList.toggle('ya', j < k); s.classList.toggle('ahora', j === k); }); };
      const inicios = []; { let pos = 0; palabras.forEach(p => { const i0 = t.texto.indexOf(p, pos); inicios.push(i0); pos = i0 + p.length; }); }
      const reproducir = (vel) => {
        speechSynthesis.cancel(); clearTimeout(corriendo);
        let conEventos = false, k = 0;
        const u = App.hablaUtt(t.texto.replace(/[«»"]/g, ' '), vel);
        if (!u) return;
        u.onboundary = (e) => { if (e.name && e.name !== 'word') return; conEventos = true; let j = 0; while (j + 1 < inicios.length && inicios[j + 1] <= e.charIndex) j++; iluminar(j); };
        u.onend = () => { clearTimeout(corriendo); iluminar(palabras.length); };
        // si el dispositivo no avisa de cada palabra, se ilumina a ritmo de lectura
        const ritmo = () => { if (conEventos || k >= palabras.length) return; iluminar(k); corriendo = setTimeout(ritmo, (230 + palabras[k].length * 70) / vel); k++; };
        corriendo = setTimeout(ritmo, 350);
        speechSynthesis.speak(u);
      };
      const parar = () => { clearTimeout(corriendo); speechSynthesis.cancel(); };
      a.cuerpo.replaceChildren(
        a.h('div', { class: 'kar-cab' }, t.pj ? a.pj(t.pj, 'pj kar-pj') : null, a.h('h2', {}, t.titulo)),
        caja,
        a.h('div', { class: 'centro' },
          a.h('button', { class: 'btn', style: { '--c': '#3d8bfd' }, onclick: () => reproducir(0.9) }, '🔊 Léemelo'),
          a.h('button', { class: 'btn', style: { '--c': '#9b5cff' }, onclick: () => reproducir(0.7) }, '🐢 Más despacio'),
          a.h('button', { class: 'btn', style: { '--c': '#f39c33' }, onclick: () => { parar(); grabar(a, t.texto); } }, '🎙️ Lo leo yo'),
          a.h('button', { class: 'btn', style: { '--c': '#2fb45a' }, onclick: () => { parar(); preguntas(t, 0); } }, 'Ya lo he leído ➡️')));
      a.cuerpo.style.overflowY = 'auto';
      a.pista('Toca cualquier palabra que no sepas leer y te la digo.');
    };
    const preguntas = (t, k) => {
      if (k >= t.preguntas.length) { ti++; return leer(); }
      a.progreso(k, t.preguntas.length);
      const p = t.preguntas[k]; let fallado = false;
      const ops = a.h('div', { class: 'opciones' }, a.mezclar([p.r, ...p.mal]).map(o => {
        const b = a.h('button', { class: 'op', onclick: () => {
          if (b.dataset.bloq) return;
          if (o === p.r) { fallado ? a.sfx.bien() : a.acierto(b); b.classList.add('ok'); ops.querySelectorAll('button').forEach(x => x.dataset.bloq = 1); a.espera(() => preguntas(t, k + 1), 900); }
          else { fallado ? a.sfx.mal() : a.fallo(b); fallado = true; b.classList.add('mal'); b.dataset.bloq = 1; a.pista('Vuelve a mirar el cuento, la respuesta está ahí.'); }
        } }, o); return b;
      }));
      a.cuerpo.replaceChildren(a.h('div', { class: 'kar-texto peq' }, t.texto), a.h('div', { class: 'pregunta' }, a.h('div', { class: 'instr', style: { margin: 0 } }, a.btnHablar(p.q), a.h('span', {}, p.q))), ops);
    };
    leer();
  };

  /* 5. Grabarse leyendo y escucharse */
  async function grabar(a, texto) {
    const caja = a.h('div', { class: 'grab' });
    a.modal('🎙️ Léelo tú en voz alta', a.h('div', {}, a.h('div', { class: 'kar-texto peq' }, texto), caja));
    if (!navigator.mediaDevices || !window.MediaRecorder) { caja.replaceChildren(a.h('p', {}, 'Este dispositivo no deja grabar. ¡Léelo en voz alta a papá o mamá!')); return; }
    let rec, trozos = [], t0;
    const empezar = async () => {
      try {
        const st = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(st); trozos = []; rec.ondataavailable = e => trozos.push(e.data);
        rec.onstop = () => { st.getTracks().forEach(t => t.stop()); const seg = (Date.now() - t0) / 1000; const url = URL.createObjectURL(new Blob(trozos, { type: rec.mimeType }));
          const ppm = Math.round(texto.split(/\s+/).length / (seg / 60));
          guardarLectura(a, ppm);
          caja.replaceChildren(a.h('p', { class: 'subsaludo' }, '¡Muy bien! Has leído a ' + ppm + ' palabras por minuto.'), a.h('audio', { controls: true, src: url, style: { width: '100%' } }), a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', onclick: empezar }, '🔁 Otra vez')));
          a.confeti(20); a.sfx.fiesta(); };
        rec.start(); t0 = Date.now();
        caja.replaceChildren(a.h('div', { class: 'grab-on' }, '● Grabando…'), a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#ef4a5c' }, onclick: () => rec.stop() }, '⏹ He terminado')));
      } catch (e) { caja.replaceChildren(a.h('p', {}, 'Para grabar hay que dejar usar el micrófono.')); }
    };
    caja.replaceChildren(a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#ef4a5c', fontSize: '28px' }, onclick: empezar }, '● Empezar a leer')));
  }
  async function guardarLectura(a, ppm) { const h = (await a.leer('lecturas')) || []; h.push({ f: Date.now(), ppm }); await a.guardar('lecturas', h.slice(-100)); }

  /* 6. Leer deprisa: palabras una a una con cronómetro */
  M['lee-rapido'] = (a, d) => {
    const lista = a.mezclar(d.palabras).slice(0, 20); let i = 0, t0 = 0;
    const tarjeta = a.h('div', { class: 'lr-palabra' });
    const cont = a.h('div', { class: 'nota', style: { textAlign: 'center' } });
    const sig = () => {
      if (!t0) t0 = Date.now();
      if (i >= lista.length) { const seg = (Date.now() - t0) / 1000; const ppm = Math.round(lista.length / (seg / 60)); guardarLectura(a, ppm); return a.fin(ppm + ' palabras por minuto', ppm); }
      tarjeta.textContent = lista[i]; cont.textContent = (i + 1) + ' de ' + lista.length; a.progreso(i, lista.length); i++; a.sfx.clic();
    };
    a.cuerpo.replaceChildren(a.instr('Lee en voz alta cada palabra y toca «Siguiente»'), tarjeta, cont,
      a.h('div', { class: 'centro' }, a.h('button', { class: 'btn', style: { '--c': '#9b5cff' }, onclick: () => a.habla(tarjeta.textContent, 0.8) }, '🔊 Ayuda'), a.h('button', { class: 'btn btn-seguir', style: { '--c': '#2fb45a' }, onclick: sig }, 'Siguiente ➡️')));
    tarjeta.textContent = '¿Preparada?'; a.pista('Lee sin prisa. Lo importante es leer bien.');
  };

  /* 7. Lee y haz: instrucciones escritas */
  M['lee-haz'] = (a, d) => {
    const lista = a.mezclar(d.items).slice(0, 8); let i = 0;
    const paso = () => {
      if (i >= lista.length) return a.fin();
      a.progreso(i, lista.length);
      const it = lista[i]; let fallado = false;
      const ops = a.mezclar(it.ops.map((e, k) => ({ e, ok: k === 0 })));
      a.cuerpo.replaceChildren(a.h('div', { class: 'lf-frase' }, it.orden),
        a.h('div', { class: 'ld-rejilla' }, ops.map(o => a.h('button', { class: 'ld-foto', onclick: (e) => {
          if (o.ok) { fallado ? a.sfx.bien() : a.acierto(e.currentTarget); a.espera(() => { i++; paso(); }, 1000); }
          else { fallado ? a.sfx.mal() : a.fallo(e.currentTarget); fallado = true; a.pista('Vuelve a leer la orden con calma.'); }
        } }, o.e))));
    };
    paso();
  };
})();
