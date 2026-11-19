// Actualiza data/news.json con titulares recientes de cada reality (Google News RSS).
// Solo guarda titular, medio, fecha y enlace: no se copia texto de las noticias
// y no se asocian automáticamente a las fichas de persona (criterio legal).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const MAX_PER_REALITY = 30;
const MAX_AGE_DAYS = 60;

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]) : ''; };

async function fetchReality(r) {
  const q = encodeURIComponent(`${r.newsQuery ?? `"${r.name}"`} when:7d`);
  const res = await fetch(`https://news.google.com/rss/search?q=${q}&hl=es&gl=ES&ceid=ES:es`, { headers: { 'User-Agent': 'wiki-reality-news-bot' } });
  if (!res.ok) throw new Error(`${r.id}: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const source = tag(it, 'source');
    let title = tag(it, 'title');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    return { reality: r.id, title, source, link: tag(it, 'link'), date: new Date(tag(it, 'pubDate')).toISOString() };
  }).filter((n) => n.title && n.link);
}

const newsPath = join(DATA, 'news.json');
const old = JSON.parse(readFileSync(newsPath, 'utf8'));
const realities = readdirSync(join(DATA, 'realities')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(DATA, 'realities', f), 'utf8')));

const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
let items = [];
for (const r of realities) {
  let fresh = [];
  try { fresh = await fetchReality(r); console.log(`${r.id}: ${fresh.length} titulares`); }
  catch (e) { console.warn(`Aviso: ${e.message}. Se mantienen los anteriores.`); }
  const merged = new Map();
  for (const n of [...fresh, ...old.items.filter((o) => o.reality === r.id)]) {
    const key = n.title.toLowerCase();
    if (!merged.has(key) && Date.parse(n.date) > cutoff) merged.set(key, n);
  }
  items.push(...[...merged.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_PER_REALITY));
}
items.sort((a, b) => b.date.localeCompare(a.date));

const changed = JSON.stringify(items) !== JSON.stringify(old.items);
if (changed) writeFileSync(newsPath, JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + '\n');
console.log(changed ? `news.json actualizado (${items.length} titulares)` : 'Sin novedades');
