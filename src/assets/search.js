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
      ? results.map((p) => `<li role="option" aria-selected="false"><a href="${p.u}">${highlight(p.n, words[0])}${p.s ? `<small>${esc(p.s)}</small>` : ''}</a></li>`).join('')
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

// Perfil de Instagram: embed oficial, solo si la persona usuaria lo pide (sin cookies de terceros por defecto)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ig-load]');
  if (!btn) return;
  const box = btn.closest('.ig-embed');
  const link = box.dataset.ig;
  box.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${link}?utm_source=ig_embed" data-instgrm-version="14" style="max-width:420px;width:100%;margin:0"><a href="${link}" target="_blank" rel="noopener nofollow">Ver en Instagram</a></blockquote>`;
  if (window.instgrm) window.instgrm.Embeds.process();
  else { const s = document.createElement('script'); s.async = true; s.src = 'https://www.instagram.com/embed.js'; document.body.append(s); }
});
