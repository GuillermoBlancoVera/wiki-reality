// Generador estático de Wiki Reality.
// Lee data/*.json y escribe la web completa en dist/. Sin dependencias.
// Uso: BASE_PATH=/wiki-reality node scripts/build.mjs   (BASE_PATH vacío para dominio propio)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'dist');
const BASE = (process.env.BASE_PATH ?? '/wiki-reality').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL ?? 'https://guillermoblancovera.github.io').replace(/\/$/, '');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const site = readJson(join(DATA, 'site.json'));
const { people } = readJson(join(DATA, 'people.json'));
const news = readJson(join(DATA, 'news.json'));
let autoSocials = {};
try { autoSocials = readJson(join(DATA, 'socials.json')).people ?? {}; } catch {}
const realityFiles = readdirSync(join(DATA, 'realities')).filter((f) => f.endsWith('.json'));
const realitiesById = Object.fromEntries(
  realityFiles.map((f) => { const r = readJson(join(DATA, 'realities', f)); return [r.id, r]; })
);
const realities = [
  ...site.realitiesOrder.filter((id) => realitiesById[id]).map((id) => realitiesById[id]),
  ...Object.values(realitiesById).filter((r) => !site.realitiesOrder.includes(r.id)),
];

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (p = '') => `${BASE}/${p}`.replace(/\/+/g, '/');
const editionSlug = (e) => e.slug ?? `edicion-${e.number}`;
const initials = (name) => name.replace(/[«»"]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const person = (id) => {
  if (!people[id]) throw new Error(`Persona desconocida en los datos: "${id}". Añádela a data/people.json`);
  return people[id];
};
const personLink = (id) => `<a class="person-link" href="${url(`personas/${id}/`)}">${esc(person(id).name)}</a>`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

// ---------- recorrido de cada persona (cruce entre realities) ----------
const appearances = {}; // id -> [{reality, edition, label, role, href}]
const addApp = (id, r, e, role) => {
  person(id);
  (appearances[id] ??= []).push({
    reality: r.id, realityName: r.name, label: e.title, year: e.year, role,
    href: url(`${r.id}/${editionSlug(e)}/`),
  });
};
for (const r of realities) {
  for (const e of r.editions) {
    if (e.winner) addApp(e.winner, r, e, 'Ganador/a');
    (e.finalists ?? []).forEach((id, i) => addApp(id, r, e, `${i + 2}.º puesto`));
    for (const c of e.couples ?? []) {
      addApp(c.a, r, e, `Pareja de ${person(c.b).name}`);
      addApp(c.b, r, e, `Pareja de ${person(c.a).name}`);
      for (const t of c.tempters ?? []) addApp(t, r, e, `Tentador/a de ${person(c.a).name} y ${person(c.b).name}`);
    }
    for (const p of e.participants ?? []) addApp(p.id, r, e, p.role ?? 'Concursante');
  }
}
for (const [id, p] of Object.entries(people)) {
  for (const x of p.extraAppearances ?? []) {
    const r = realitiesById[x.reality];
    (appearances[id] ??= []).push({ reality: x.reality, realityName: r?.name ?? x.reality, label: x.label, role: x.role, href: r ? url(`${r.id}/`) : null });
  }
}

// ---------- personas relacionadas ----------
const related = {}; // id -> Map(otherId -> [textos])
const relate = (a, b, text) => {
  if (!people[a] || !people[b] || a === b) return;
  const m = (related[a] ??= new Map());
  if (!m.has(b)) m.set(b, []);
  if (!m.get(b).includes(text)) m.get(b).push(text);
};
for (const r of realities) {
  for (const e of r.editions) {
    const ed = `${e.title}${r.id === 'la-isla-de-las-tentaciones' ? '' : ''}`;
    for (const c of e.couples ?? []) {
      relate(c.a, c.b, `Pareja con la que entró en ${r.short} · ${ed}`);
      relate(c.b, c.a, `Pareja con la que entró en ${r.short} · ${ed}`);
      for (const t of c.tempters ?? []) {
        for (const x of [c.a, c.b]) { relate(x, t, `Tentador/a en ${r.short} · ${ed}`); relate(t, x, `Participó como tentador/a en su edición (${ed})`); }
      }
    }
    const top = [e.winner, ...(e.finalists ?? [])].filter(Boolean);
    for (const a of top) for (const b of top) if (a !== b) relate(a, b, `Finalistas de ${e.title}`);
  }
}
for (const [id, p] of Object.entries(people)) {
  for (const x of p.related ?? []) { person(x.id); relate(id, x.id, x.relation); relate(x.id, id, x.reverse ?? x.relation); }
}

// ---------- descripción automática (solo hechos de los programas) ----------
const listJoin = (arr) => arr.length <= 1 ? (arr[0] ?? '') : `${arr.slice(0, -1).join(', ')} y ${arr.at(-1)}`;
function autoDescription(id) {
  const p = people[id];
  const apps = appearances[id] ?? [];
  if (!apps.length) return '';
  const realityNames = [...new Set(apps.map((a) => a.realityName))];
  const wins = apps.filter((a) => a.role === 'Ganador/a').map((a) => `${a.label}${a.year ? ` (${a.year})` : ''}`);
  const podium = apps.filter((a) => /puesto$/.test(a.role)).map((a) => `${a.role.replace(' puesto', '')} en ${a.label}`);
  const couples = apps.filter((a) => a.role.startsWith('Pareja de ')).map((a) => `con ${a.role.slice(10)} en la ${a.label}`);
  const tempter = apps.filter((a) => /^Tentador/.test(a.role)).map((a) => a.label);
  const parts = [`${p.name} ha participado en ${listJoin(realityNames)}${apps.length > 1 ? ` (${apps.length} apariciones)` : ''}.`];
  if (wins.length) parts.push(`Ganó ${listJoin(wins)}.`);
  if (podium.length) parts.push(`Quedó ${listJoin(podium)}.`);
  if (couples.length) parts.push(`${realityNames.length > 1 ? 'En La isla de las tentaciones entró' : 'Entró'} ${listJoin(couples)}.`);
  if (tempter.length) parts.push(`Fue tentador/a en ${listJoin(tempter)}.`);
  return parts.join(' ');
}

// ---------- redes sociales ----------
const SOCIAL_LABELS = { instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', x: 'X (Twitter)', facebook: 'Facebook', twitch: 'Twitch', web: 'Web' };
const socialsOf = (id) => { const { source, ...rest } = { ...(autoSocials[id] ?? {}), ...(people[id].socials ?? {}) }; return rest; };

// ---------- parejas ----------
const outcomeClass = (o = '') => /juntos|juntas/i.test(o) && !/separado/i.test(o) ? 'juntos' : /separad|rompi|abandon/i.test(o) ? 'separados' : '';
const srcLink = (u) => u ? `<p class="story-source">Fuente: <a href="${esc(u)}" rel="noopener nofollow" target="_blank">${esc(new URL(u).hostname.replace(/^www\./, ''))}</a></p>` : '';
const coupleBackground = (c) => c.background ? `<p class="story"><strong>Por qué fueron a la isla:</strong> ${esc(c.background)}</p>${srcLink(c.backgroundSource)}` : '';
const coupleStory = (c) => coupleBackground(c) + (c.story ? `<p class="story">${esc(c.story)}</p>${srcLink(c.storySource)}` : '');
const coupleBlock = (c, extra = '') => `
    <div class="couple">
      <div class="couple-head">
        <div class="avatars"><span class="avatar">${esc(initials(person(c.a).name))}</span><span class="avatar">${esc(initials(person(c.b).name))}</span></div>
        <div>${personLink(c.a)} y ${personLink(c.b)}${extra}
          ${c.tempters?.length ? `<div class="person-sub">Tentadores: ${c.tempters.map(personLink).join(', ')}</div>` : ''}
          <span class="outcome ${outcomeClass(c.outcome)}">${esc(c.outcome ?? 'Hoguera final: pendiente de completar')}</span></div>
      </div>
      ${coupleStory(c)}
    </div>`;
// historias por persona
const coupleOf = {};
for (const r of realities) for (const e of r.editions) for (const c of e.couples ?? []) {
  for (const id of [c.a, c.b]) (coupleOf[id] ??= []).push({ r, e, c });
}

// ---------- plantillas ----------
const logo = `<a class="logo" href="${url()}">WIKI<span>REALITY</span></a>`;
const searchBox = `
<div class="search" role="search">
  <input id="search-input" type="search" placeholder="Busca una persona…" autocomplete="off" aria-label="Buscar personas" aria-autocomplete="list" aria-controls="search-results">
  <ul id="search-results" role="listbox" hidden></ul>
</div>`;

function layout({ title, description, body, theme = 'home', path = '' }) {
  const fullTitle = title ? `${title} · ${site.name}` : `${site.name} · ${site.tagline}`;
  return `<!DOCTYPE html>
<html lang="es" data-palette="${esc(site.palette ?? 'arena')}">
<head>
<script>try{localStorage.removeItem("paleta")}catch(e){}</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description ?? site.description)}">
<link rel="canonical" href="${SITE_URL}${url(path)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description ?? site.description)}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;600;700&family=Pacifico&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${url('assets/styles.css')}">
</head>
<body class="theme-${theme}" data-base="${BASE}">
<header class="topbar">
  ${logo}
  <nav class="mainnav">${realities.map((r) => `<a href="${url(`${r.id}/`)}">${esc(r.short)}</a>`).join('')}<a href="${url('personas/')}">Personas</a></nav>
  ${searchBox}
</header>
<main>
${body}
</main>
<footer class="footer">
  <p><strong>${esc(site.name)}</strong> recopila solo información pública sobre el paso de cada persona por los programas, sin opiniones.
  Las noticias enlazan a sus medios de origen. Datos de referencia: Wikipedia (CC BY-SA).</p>
  <p><a href="${url('aviso-legal/')}">Aviso legal y solicitudes de retirada</a></p>
</footer>
<script src="${url('assets/search.js')}" defer></script>
</body>
</html>`;
}

// Carátula generada con CSS + SVG (sin fotos de cadenas ni de redes)
const posterArt = {
  isla: `<svg viewBox="0 0 200 300" aria-hidden="true"><circle cx="100" cy="150" r="55" fill="#ffd27a" opacity=".9"/><rect y="190" width="200" height="110" fill="#0b6e7a" opacity=".85"/><path d="M40 300 C45 230 50 200 60 170" stroke="#1d1b26" stroke-width="7" fill="none"/><path d="M60 170 c-30 -5 -45 5 -55 20 M60 170 c-10 -25 -30 -30 -45 -28 M60 170 c20 -20 40 -20 55 -10 M60 170 c25 0 40 10 45 25" stroke="#1d1b26" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
  gh: `<svg viewBox="0 0 200 300" aria-hidden="true"><ellipse cx="100" cy="140" rx="75" ry="42" fill="none" stroke="#1d4ed8" stroke-width="5"/><circle cx="100" cy="140" r="28" fill="#3b82f6"/><circle cx="100" cy="140" r="12" fill="#10264f"/><circle cx="108" cy="132" r="5" fill="#fff"/></svg>`,
  superv: `<svg viewBox="0 0 200 300" aria-hidden="true"><path d="M100 70 C125 110 140 130 120 165 C135 150 140 135 138 120 C160 150 150 200 100 210 C50 200 45 150 70 120 C70 140 78 152 88 160 C75 125 90 100 100 70Z" fill="#ff8a1f"/><path d="M100 130 C110 150 115 165 100 190 C85 165 92 150 100 130Z" fill="#ffe08a"/><rect x="94" y="208" width="12" height="70" fill="#5b3b1d"/></svg>`,
};
const poster = (r) => `
<a class="poster poster-${r.theme}" href="${url(`${r.id}/`)}">
  <div class="poster-art">${posterArt[r.theme] ?? ''}</div>
  <div class="poster-title">${esc(r.name)}</div>
  <div class="poster-meta">${r.editions.length} ediciones · desde ${r.since}</div>
</a>`;

const personCard = (id, sub) => `
<a class="person-card" href="${url(`personas/${id}/`)}">
  <div class="avatar" aria-hidden="true">${esc(initials(person(id).name))}</div>
  <div class="person-name">${esc(person(id).name)}</div>
  ${sub ? `<div class="person-sub">${esc(sub)}</div>` : ''}
</a>`;

const row = (title, items, cls = '') => items.length ? `
<section class="row ${cls}">
  <h2 class="row-title">${title}</h2>
  <div class="row-scroller">${items.join('')}</div>
</section>` : '';

const newsList = (items) => items.length
  ? `<ul class="news">${items.map((n) => `<li><a href="${esc(n.link)}" target="_blank" rel="noopener nofollow">${esc(n.title)}</a><span class="news-meta">${esc(n.source ?? '')}${n.date ? ` · ${fmtDate(n.date)}` : ''}</span></li>`).join('')}</ul>`
  : `<p class="muted">Aún no hay titulares. Se actualizan automáticamente cada día.</p>`;

// ---------- páginas ----------
const pages = {};
const page = (path, html) => { pages[path] = html; };

// Landing tipo catálogo
{
  const winnersRow = realities.flatMap((r) => r.editions.filter((e) => e.winner).slice(-6).reverse()
    .map((e) => personCard(e.winner, `Ganador/a ${r.short} · ${e.year}`)));
  const crossOver = Object.entries(appearances)
    .filter(([, a]) => new Set(a.map((x) => x.reality + x.label)).size > 1)
    .map(([id, a]) => personCard(id, `${new Set(a.map((x) => x.label)).size} participaciones`));
  const isla = realitiesById['la-isla-de-las-tentaciones'];
  const coupleCards = (isla?.editions ?? []).flatMap((e) => (e.couples ?? []).map((c) => `
    <a class="couple-card" href="${url(`${isla.id}/${editionSlug(e)}/`)}">
      <div class="avatars"><span class="avatar">${esc(initials(person(c.a).name))}</span><span class="avatar">${esc(initials(person(c.b).name))}</span></div>
      <div class="person-name">${esc(person(c.a).name)} y ${esc(person(c.b).name)}</div>
      <div class="person-sub">${esc(e.title)} · ${e.year}</div>
      ${(c.background || c.story) ? `<div class="story-snippet">${esc(c.background || c.story)}</div>` : ''}
    </a>`));
  const featured = realities[0];
  const body = `
<section class="hero">
  <div class="hero-inner">
    <p class="eyebrow">${esc(site.tagline)}</p>
    <h1>Todos los realities.<br>Todas sus historias.</h1>
    <p class="hero-text">${esc(site.description)}</p>
    <a class="btn" href="${url(`${featured.id}/`)}">Explorar ${esc(featured.name)}</a>
  </div>
</section>
${row('Realities', realities.map(poster), 'row-posters')}
${row('Parejas de La isla de las tentaciones', coupleCards)}
${row('Personas en varios programas', crossOver)}
${row('Últimos ganadores', winnersRow)}
<section class="row"><h2 class="row-title">Últimas noticias</h2>${newsList(news.items.slice(0, 8))}</section>`;
  page('', layout({ body }));
}

// Páginas por reality y edición
for (const r of realities) {
  const rNews = news.items.filter((n) => n.reality === r.id);
  const editionCard = (e) => `
    <a class="edition-card" href="${url(`${r.id}/${editionSlug(e)}/`)}">
      <div class="edition-num${String(e.badge ?? e.number).length > 2 ? ' long' : ''}">${esc(e.badge ?? e.number)}</div>
      <div><div class="edition-title">${esc(e.title)}</div>
      <div class="person-sub">${e.year}${e.winner ? ` · Ganador/a: ${esc(person(e.winner).name)}` : ''}${e.couples?.length ? ` · ${e.couples.length} pareja${e.couples.length > 1 ? 's' : ''}` : ''}</div></div>
    </a>`;
  const groups = new Map();
  for (const e of r.editions) { const g = e.group ?? 'Ediciones'; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(e); }
  const editionCards = [...groups].map(([g, eds]) => `<h2>${esc(g)}</h2><div class="edition-grid">${eds.slice().reverse().map(editionCard).join('')}</div>`).join('');
  const spinoffs = (r.spinoffs ?? []).map((s) => `<li><strong>${esc(s.title)}</strong> (${s.year}) · ${esc(s.dates ?? '')} · ${esc(s.presenter ?? '')}</li>`).join('');
  page(`${r.id}/`, layout({
    title: r.name, theme: r.theme, path: `${r.id}/`,
    description: `${r.name}: todas las ediciones, concursantes, ganadores y parejas. ${r.tagline}.`,
    body: `
<section class="reality-hero">
  <div class="reality-hero-art">${posterArt[r.theme] ?? ''}</div>
  <div>
    <p class="eyebrow">${esc(r.channel)} · desde ${r.since}</p>
    <h1 class="reality-title">${esc(r.name)}</h1>
    <p class="hero-text">${esc(r.description)}</p>
  </div>
</section>
<section class="block">${editionCards}
${r.notes ? `<p class="muted">${esc(r.notes)}</p>` : ''}</section>
${spinoffs ? `<section class="block"><h2>Spin-offs</h2><ul>${spinoffs}</ul></section>` : ''}
<section class="block"><h2>Noticias</h2>${newsList(rNews.slice(0, 12))}</section>
<section class="block sources"><h2>Fuentes</h2><ul>${r.sources.map((s) => `<li><a href="${esc(s)}" rel="noopener">${esc(s)}</a></li>`).join('')}</ul></section>`,
  }));

  for (const e of r.editions) {
    const facts = [
      ['Año', e.year], ['Fechas', e.dates], ['Canal', e.channel ?? r.channel], ['Presentación', e.presenter], ['Días', e.days],
    ].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    const podium = e.winner ? `
<section class="block"><h2>Ganador/a y finalistas</h2>
  <div class="podium">${personCard(e.winner, 'Ganador/a')}${(e.finalists ?? []).map((f, i) => personCard(f, `${i + 2}.º puesto`)).join('')}</div>
</section>` : '';
    const couples = e.couples?.length ? `
<section class="block"><h2>Parejas</h2>
  <div class="couples">${e.couples.map((c) => coupleBlock(c)).join('')}</div>
</section>` : '';
    const participants = e.participants?.length ? `
<section class="block"><h2>${e.participants.some((p) => p.eliminatedOrder) ? 'Resto de concursantes, del último en salir al primero' : 'Concursantes'}</h2>
  <ol class="participants">${e.participants.slice().sort((a, b) => (a.eliminatedOrder ?? 999) - (b.eliminatedOrder ?? 999))
    .map((p) => `<li>${personLink(p.id)}${p.role ? ` <span class="person-sub">${esc(p.role)}</span>` : ''}</li>`).join('')}</ol>
</section>` : '';
    page(`${r.id}/${editionSlug(e)}/`, layout({
      title: `${e.title} · ${r.name}`, theme: r.theme, path: `${r.id}/${editionSlug(e)}/`,
      description: `${r.name} ${e.title} (${e.year}): ${e.winner ? `ganador/a ${person(e.winner).name}, ` : ''}${e.couples?.length ? 'parejas, ' : ''}concursantes y datos de la edición.`,
      body: `
<nav class="crumbs"><a href="${url(`${r.id}/`)}">${esc(r.name)}</a> › ${esc(e.title)}</nav>
<section class="reality-hero small"><div><p class="eyebrow">${esc(r.name)}</p><h1 class="reality-title">${esc(e.title)}</h1></div></section>
<section class="block"><dl class="facts">${facts}</dl>${e.notes ? `<p class="muted">${esc(e.notes)}</p>` : ''}</section>
${podium}${couples}${participants}`,
    }));
  }
}

// Fichas de persona
const allIds = Object.keys(people).sort((a, b) => people[a].name.localeCompare(people[b].name, 'es'));
for (const id of allIds) {
  const p = people[id];
  const apps = appearances[id] ?? [];
  const firstTheme = realitiesById[apps[0]?.reality]?.theme ?? 'home';
  const socials = Object.entries(socialsOf(id)).filter(([, v]) => v).map(([k, v]) => `<li><a class="social social-${esc(k)}" href="${esc(v)}" rel="noopener nofollow" target="_blank">${esc(SOCIAL_LABELS[k] ?? k)}</a></li>`).join('');
  const rel = [...(related[id] ?? new Map())];
  const desc = p.bio ?? autoDescription(id);
  page(`personas/${id}/`, layout({
    title: p.name, theme: firstTheme, path: `personas/${id}/`,
    description: desc || `${p.name}: su paso por los realities.`,
    body: `
<nav class="crumbs"><a href="${url('personas/')}">Personas</a> › ${esc(p.name)}</nav>
<section class="profile">
  <div class="avatar big" aria-hidden="true">${esc(initials(p.name))}</div>
  <div><h1>${esc(p.name)}</h1>${p.origin ? `<p class="muted">${esc(p.origin)}</p>` : ''}${desc ? `<p class="bio">${esc(desc)}</p>` : ''}
  ${socials ? `<ul class="socials">${socials}</ul>` : ''}</div>
</section>
<section class="block"><h2>Paso por los realities</h2>
  <ul class="timeline">${apps.map((a) => `<li><span class="tl-reality">${esc(a.realityName)}</span> ${a.href ? `<a href="${a.href}">${esc(a.label)}</a>` : esc(a.label)}${a.year ? ` (${a.year})` : ''} · <span class="muted">${esc(a.role)}</span></li>`).join('')}</ul>
</section>
${(coupleOf[id] ?? []).length ? `<section class="block"><h2>Su historia en pareja</h2><div class="couples">${coupleOf[id].map(({ r, e, c }) => coupleBlock(c, `<div class="person-sub"><a href="${url(`${r.id}/${editionSlug(e)}/`)}">${esc(r.name)} · ${esc(e.title)}</a></div>`)).join('')}</div></section>` : ''}
${socialsOf(id).instagram ? `<section class="block"><h2>Instagram</h2><div class="ig-embed" data-ig="${esc(socialsOf(id).instagram)}">
  <div class="ig-consent">Para ver aquí su perfil oficial de Instagram se cargará contenido de Instagram (Meta), que puede usar cookies.
  <br><button class="btn" type="button" data-ig-load>Ver perfil de Instagram</button> <a class="btn ghost" href="${esc(socialsOf(id).instagram)}" rel="noopener nofollow" target="_blank">Abrir en Instagram</a></div>
</div></section>` : ''}
${p.now ? `<section class="block"><h2>En la actualidad</h2><p>${esc(p.now)}</p><p class="muted">Según sus redes públicas.</p></section>` : ''}
${rel.length ? `<section class="block"><h2>Personas relacionadas</h2><div class="related">${rel.map(([oid, texts]) => `
  <a class="related-card" href="${url(`personas/${oid}/`)}"><span class="avatar">${esc(initials(people[oid].name))}</span>
  <span><strong>${esc(people[oid].name)}</strong>${texts.map((t) => `<small>${esc(t)}</small>`).join('')}</span></a>`).join('')}</div></section>` : ''}
<p class="block muted small">¿Eres esta persona y quieres corregir o retirar datos? <a href="${url('aviso-legal/')}">Escríbenos</a>.</p>`,
  }));
}

// Índice de personas
{
  const byLetter = {};
  for (const id of allIds) {
    const l = people[id].name.normalize('NFD').replace(/[^A-Za-z]/g, '')[0]?.toUpperCase() ?? '#';
    (byLetter[l] ??= []).push(id);
  }
  page('personas/', layout({
    title: 'Personas', path: 'personas/',
    description: 'Todas las personas que han pasado por los realities de España.',
    body: `<section class="block"><h1>Personas</h1><p class="muted">${allIds.length} fichas. Usa el buscador para encontrar a alguien al instante.</p>
${Object.entries(byLetter).map(([l, ids]) => `<h2 class="letter">${l}</h2><div class="grid-people">${ids.map((id) => personCard(id, [...new Set((appearances[id] ?? []).map((a) => a.realityName))].join(' · '))).join('')}</div>`).join('')}</section>`,
  }));
}

// Aviso legal
page('aviso-legal/', layout({
  title: 'Aviso legal', path: 'aviso-legal/',
  body: `<section class="block prose"><h1>Aviso legal y retirada de contenidos</h1>
<p>${esc(site.name)} es una web informativa. Solo publicamos hechos públicos sobre la participación de cada persona en programas de televisión, sin opiniones ni valoraciones.</p>
<ul>
<li>No usamos fotografías de las cadenas ni copiadas de redes sociales.</li>
<li>Las noticias se muestran como titulares enlazados a su medio de origen, sin reproducir su texto, y no se asocian automáticamente a las fichas personales.</li>
<li>El apartado «En la actualidad» solo recoge lo que la propia persona comparte en sus redes públicas.</li>
</ul>
<h2>Solicitudes de corrección o retirada</h2>
<p>Si apareces en esta web y quieres corregir o retirar información, escríbenos${site.contactEmail ? ` a <a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>` : ' (dirección de contacto pendiente de configurar)'}. Atendemos las solicitudes lo antes posible.</p>
<p>Marcas como Gran Hermano, Supervivientes o La isla de las tentaciones pertenecen a sus titulares. Esta web no está afiliada a ninguna cadena ni productora.</p></section>`,
}));

page('404.html', layout({ title: 'Página no encontrada', body: `<section class="block"><h1>Página no encontrada</h1><p><a href="${url()}">Volver al inicio</a></p></section>` }));

// ---------- escribir ----------
rmSync(OUT, { recursive: true, force: true });
for (const [path, html] of Object.entries(pages)) {
  const file = path.endsWith('.html') ? join(OUT, path) : join(OUT, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
cpSync(join(ROOT, 'src', 'assets'), join(OUT, 'assets'), { recursive: true });

// Índice para el buscador
const searchIndex = allIds.map((id) => ({
  id, n: people[id].name, u: url(`personas/${id}/`),
  s: [...new Set((appearances[id] ?? []).map((a) => a.realityName))].join(' · '),
}));
writeFileSync(join(OUT, 'search-index.json'), JSON.stringify(searchIndex));

// Sitemap y robots
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(pages).filter((p) => !p.endsWith('.html')).map((p) => `<url><loc>${SITE_URL}${url(p)}</loc></url>`).join('\n')}
</urlset>`;
writeFileSync(join(OUT, 'sitemap.xml'), sitemap);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}${url('sitemap.xml')}\n`);
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`OK: ${Object.keys(pages).length} páginas, ${allIds.length} personas, ${realities.length} realities → dist/`);
