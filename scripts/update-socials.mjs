// Busca en Wikidata las redes sociales oficiales de cada persona y las guarda en data/socials.json.
// Wikidata es una fuente curada: solo se aceptan coincidencias exactas de nombre con una única
// persona cuya descripción encaje con televisión/realities. Lo que pongas a mano en
// people.json (socials) siempre tiene prioridad, y "socialsAuto": false desactiva la búsqueda.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const { people } = JSON.parse(readFileSync(join(DATA, 'people.json'), 'utf8'));
const MATCH = /(reality|televisi|concursante|gran hermano|supervivientes|tentaciones|colaborador|influencer|presentador|cantante|modelo|personalidad|youtuber|tiktoker|actor|actriz|empresari)/i;

const candidates = Object.entries(people)
  .filter(([, p]) => p.socialsAuto !== false && /\s/.test(p.name.trim()))
  .map(([id, p]) => ({ id, name: p.name.replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim() }));

const lit = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"@es`;
async function query(batch) {
  const sparql = `SELECT ?name ?item ?desc ?ig ?yt ?tt ?x WHERE {
    VALUES ?name { ${batch.map((c) => lit(c.name)).join(' ')} }
    ?item rdfs:label ?name; wdt:P31 wd:Q5.
    OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "es") }
    OPTIONAL { ?item wdt:P2003 ?ig } OPTIONAL { ?item wdt:P2397 ?yt }
    OPTIONAL { ?item wdt:P7085 ?tt } OPTIONAL { ?item wdt:P2002 ?x }
  }`;
  const res = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), {
    headers: { 'User-Agent': 'wiki-reality-bot/1.0', Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  return (await res.json()).results.bindings;
}

const out = {};
for (let i = 0; i < candidates.length; i += 60) {
  const batch = candidates.slice(i, i + 60);
  let rows = [];
  try { rows = await query(batch); } catch (e) { console.warn(`Aviso: ${e.message}`); continue; }
  for (const c of batch) {
    const mine = rows.filter((r) => r.name.value === c.name);
    const items = new Map();
    for (const r of mine) {
      const it = items.get(r.item.value) ?? { desc: r.desc?.value ?? '', s: {} };
      if (r.ig) it.s.instagram = `https://www.instagram.com/${r.ig.value}/`;
      if (r.yt) it.s.youtube = `https://www.youtube.com/channel/${r.yt.value}`;
      if (r.tt) it.s.tiktok = `https://www.tiktok.com/@${r.tt.value}`;
      if (r.x) it.s.x = `https://x.com/${r.x.value}`;
      items.set(r.item.value, it);
    }
    const ok = [...items.values()].filter((it) => MATCH.test(it.desc));
    if (ok.length === 1 && Object.keys(ok[0].s).length) out[c.id] = { ...ok[0].s, source: [...items.keys()].find((k) => items.get(k) === ok[0]) };
  }
}

const path = join(DATA, 'socials.json');
let old = {};
try { old = JSON.parse(readFileSync(path, 'utf8')).people ?? {}; } catch {}
// Si una consulta falla no se pierde lo que ya teníamos
const merged = Object.fromEntries(Object.entries({ ...old, ...out }).filter(([id]) => people[id] && people[id].socialsAuto !== false));
writeFileSync(path, JSON.stringify({ _doc: 'Generado por scripts/update-socials.mjs desde Wikidata. No editar a mano: usa socials en people.json.', people: merged }, null, 2) + '\n');
console.log(`Redes encontradas para ${Object.keys(out).length} de ${candidates.length} personas`);
