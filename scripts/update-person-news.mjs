// Titulares recientes que mencionan a cada persona (Bing Noticias RSS) -> data/person-news.json.
// Solo se guarda titular, medio, fecha y enlace. Para evitar homónimos solo se buscan personas con
// nombre y apellido, la consulta incluye el nombre de sus realities y el titular debe contener el
// nombre completo. "newsAuto": false en people.json desactiva la búsqueda para una persona.
// Cada ejecución revisa un lote (las ediciones más recientes primero y luego las que llevan más
// tiempo sin revisarse), para no saturar el servicio.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = (f, d) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')); } catch { return d; } };
const { people } = read('people.json');
const store = read('person-news.json', { checked: {}, people: {} });
const MAX = Number(process.env.MAX_PEOPLE ?? 100);
const PER_PERSON = 6;
const MAX_AGE_DAYS = 180;
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const slugify = (t) => norm(t).replace(/ /g, '-');

// Año más reciente y realities de cada persona
const info = new Map();
const add = (id, r, year) => { if (!id || !people[id]) return; const i = info.get(id) ?? { year: 0, shows: new Set() }; i.year = Math.max(i.year, year ?? 0); i.shows.add(r.short ?? r.name); info.set(id, i); };
for (const f of readdirSync(join(DATA, 'realities'))) {
  const r = read(`realities/${f}`);
  for (const n of r.presenters ?? []) add(slugify(n), r, r.until ?? new Date().getFullYear());
  for (const e of r.editions ?? []) {
    for (const n of (e.presenter ?? '').replace(/\([^)]*\)/g, '').split(/\s+y\s+|[,;]\s*/)) if (n.trim()) add(slugify(n.trim()), r, e.year);
    const ids = [e.winner, ...(e.finalists ?? []), ...(e.participants ?? []).map((p) => p.id), ...(e.couples ?? []).flatMap((c) => [c.a, c.b]), ...(e.singles ?? []).map((s) => s.id), ...(e.masks ?? []).map((m) => m.id)];
    for (const id of ids) add(id, r, e.year);
  }
}
const cleanName = (id) => people[id].name.replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
const todo = [...info].filter(([id]) => people[id].newsAuto !== false && cleanName(id).split(' ').length >= 2)
  .sort((a, b) => (store.checked[a[0]] ?? '').localeCompare(store.checked[b[0]] ?? '') || b[1].year - a[1].year)
  .slice(0, MAX);

const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]) : ''; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
let asked = 0, withNews = 0;

for (const [id, i] of todo) {
  const name = cleanName(id);
  const shows = [...i.shows].slice(0, 4).map((s) => `"${s}"`).join(' OR ');
  const q = encodeURIComponent(`"${name}" (${shows})`);
  try {
    // Bing Noticias (RSS): admite más consultas seguidas que Google News desde los servidores de GitHub
    const res = await fetch(`https://www.bing.com/news/search?q=${q}&format=rss&setlang=es&cc=ES&mkt=es-ES`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; wiki-reality-news-bot)' } });
    asked++;
    if (res.status === 429 || res.status === 403 || res.status === 503) { console.warn(`Límite del buscador de noticias (HTTP ${res.status}) tras ${asked} consultas`); break; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml.includes('<rss')) { console.warn(`Respuesta inesperada del buscador tras ${asked} consultas`); break; }
    const key = norm(name);
    const fresh = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
      const raw = tag(it, 'link');
      let link = raw;
      try { link = new URL(raw).searchParams.get('url') ?? raw; } catch {}
      const d = new Date(tag(it, 'pubDate'));
      return { title: tag(it, 'title'), source: tag(it, 'News:Source'), link, date: isNaN(d) ? '' : d.toISOString() };
    }).filter((n) => n.title && /^https?:\/\//.test(n.link) && n.date && norm(n.title).includes(key));
    const merged = new Map();
    for (const n of [...fresh, ...(store.people[id] ?? [])]) {
      const k = norm(n.title);
      if (!merged.has(k) && Date.parse(n.date) > cutoff) merged.set(k, n);
    }
    const list = [...merged.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, PER_PERSON);
    if (list.length) { store.people[id] = list; withNews++; } else delete store.people[id];
    store.checked[id] = new Date().toISOString();
  } catch (e) { console.warn(`Aviso (${id}): ${e.message}`); }
  await sleep(900);
}
for (const id of Object.keys(store.people)) if (!people[id] || people[id].newsAuto === false) delete store.people[id];
for (const id of Object.keys(store.checked)) if (!people[id]) delete store.checked[id];
writeFileSync(join(DATA, 'person-news.json'), JSON.stringify({ _doc: 'Generado por scripts/update-person-news.mjs. Titulares que mencionan a cada persona.', ...store }, null, 2) + '\n');
console.log(`Noticias por persona: ${asked} consultas, ${withNews} con titulares, ${Object.keys(store.people).length} personas con noticias en total`);
