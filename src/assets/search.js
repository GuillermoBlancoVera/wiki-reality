// Buscador de personas: sugerencias a partir de 3 letras, sin tildes ni mayúsculas.
(() => {
  const input = document.getElementById('search-input');
  const list = document.getElementById('search-results');
  if (!input || !list) return;
  const base = document.body.dataset.base || '';
  const MIN = 3, MAX = 8;
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let index = null, active = -1;

  const load = async () => {
    if (index) return index;
    const data = await fetch(`${base}/search-index.json`).then((r) => r.json());
    index = data.map((p) => ({ ...p, k: norm(p.n) }));
    return index;
  };
  // Resalta la coincidencia respetando las tildes del nombre original
  const highlight = (name, q) => {
    const i = norm(name).indexOf(q);
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
  };
  const close = () => { list.hidden = true; active = -1; input.setAttribute('aria-expanded', 'false'); };
  const setActive = (i) => {
    const items = [...list.querySelectorAll('li[role="option"]')];
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((li, j) => li.setAttribute('aria-selected', String(j === active)));
    items[active].scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', async () => {
    const q = norm(input.value.trim());
    if (q.length < MIN) return close();
    const idx = await load();
    const words = q.split(/\s+/);
    const results = idx
      .filter((p) => words.every((w) => p.k.includes(w)))
      .sort((a, b) => (a.k.startsWith(q) ? 0 : 1) - (b.k.startsWith(q) ? 0 : 1) || a.k.localeCompare(b.k))
      .slice(0, MAX);
    list.innerHTML = results.length
      ? results.map((p) => `<li role="option" aria-selected="false"><a href="${p.u}">${p.h || ''}<span class="sr-text">${highlight(p.n, words[0])}${p.s ? `<small>${esc(p.s)}</small>` : ''}</span></a></li>`).join('')
      : '<li class="empty">Sin resultados</li>';
    list.hidden = false; active = -1;
    input.setAttribute('aria-expanded', 'true');
  });
  input.addEventListener('keydown', (e) => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') {
      const target = list.querySelectorAll('li[role="option"] a')[active < 0 ? 0 : active];
      if (target) { e.preventDefault(); location.href = target.href; }
    } else if (e.key === 'Escape') close();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) close(); });
  input.addEventListener('focus', () => { if (input.value.trim().length >= MIN) input.dispatchEvent(new Event('input')); });
})();

// Listado de personas: filtros por nombre, reality y edición (se guardan en la URL)
(() => {
  const form = document.getElementById('people-filters');
  if (!form) return;
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const data = JSON.parse(document.getElementById('f-data').textContent);
  const name = document.getElementById('f-name'), rSel = document.getElementById('f-reality'), eSel = document.getElementById('f-edition');
  const count = document.getElementById('f-count'), empty = document.getElementById('f-empty');
  const cards = [...document.querySelectorAll('.letter-group .person-card')].map((el) => ({ el, n: norm(el.dataset.name || ''), eds: (el.dataset.eds || '').split(' ') }));
  const groups = [...document.querySelectorAll('.letter-group')];
  const fillEditions = () => {
    const eds = data[rSel.value] || [];
    eSel.innerHTML = '<option value="">Todas las ediciones</option>' + eds.map(([v, t]) => `<option value="${v}">${t.replace(/</g, '&lt;')}</option>`).join('');
    eSel.disabled = !eds.length;
  };
  const apply = () => {
    const q = norm(name.value.trim()), r = rSel.value, e = eSel.value;
    let shown = 0;
    for (const c of cards) {
      const ok = (!q || c.n.includes(q)) && (!r || c.eds.some((x) => (e ? x === `${r}/${e}` : x.startsWith(r + '/'))));
      c.el.hidden = !ok; if (ok) shown++;
    }
    for (const g of groups) g.hidden = !g.querySelector('.person-card:not([hidden])');
    count.textContent = `${shown} personas`;
    empty.hidden = shown > 0;
    const p = new URLSearchParams(); if (q) p.set('q', name.value.trim()); if (r) p.set('reality', r); if (e) p.set('edicion', e);
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
  };
  const p = new URLSearchParams(location.search);
  name.value = p.get('q') || ''; rSel.value = p.get('reality') || ''; fillEditions(); eSel.value = p.get('edicion') || '';
  name.addEventListener('input', apply);
  rSel.addEventListener('change', () => { fillEditions(); apply(); });
  eSel.addEventListener('change', apply);
  apply();
})();

// Botón de compartir: menú nativo del móvil o, si no existe, copia el enlace
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-share]');
  if (!btn) return;
  const data = { title: `${btn.dataset.share} · ${document.title.split(' · ').pop()}`, url: location.href.split('#')[0] };
  const label = btn.querySelector('.share-label');
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(data.url);
    if (label) { label.textContent = 'Enlace copiado'; setTimeout(() => { label.textContent = 'Compartir'; }, 2000); }
  } catch {}
});

// Fotos de Instagram en avatares: se cargan solo al acercarse a la pantalla y de pocas en pocas,
// para que la página no espere a decenas de visores a la vez. Mientras tanto se ven las iniciales.
(() => {
  const waiting = [...document.querySelectorAll('.av-wait iframe[data-src]')];
  if (!waiting.length) return;
  const MAX = 6; let running = 0; const queue = [];
  const next = () => {
    while (running < MAX && queue.length) {
      const f = queue.shift(); running++;
      let done = false;
      const end = () => { if (done) return; done = true; running--; f.parentElement.classList.add('av-ready'); next(); };
      f.addEventListener('load', end, { once: true });
      setTimeout(end, 6000);
      f.src = f.dataset.src; f.removeAttribute('data-src');
    }
  };
  if (!('IntersectionObserver' in window)) { queue.push(...waiting); next(); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); queue.push(e.target); }
    next();
  }, { rootMargin: '300px' });
  waiting.forEach((f) => io.observe(f));
})();

// Flechas para las filas con scroll horizontal (portada tipo catálogo)
(() => {
  document.querySelectorAll('.row > .row-scroller').forEach((sc) => {
    const mk = (cls, label, txt, dir) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'row-arrow ' + cls; b.setAttribute('aria-label', label); b.textContent = txt;
      b.addEventListener('click', () => sc.scrollBy({ left: dir * sc.clientWidth * 0.85, behavior: 'smooth' }));
      sc.parentElement.appendChild(b); return b;
    };
    const prev = mk('prev', 'Anterior', '‹', -1), next = mk('next', 'Siguiente', '›', 1);
    const upd = () => { prev.hidden = sc.scrollLeft < 8; next.hidden = sc.scrollLeft + sc.clientWidth > sc.scrollWidth - 8; };
    sc.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  });
})();
