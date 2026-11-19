// Busca en Openverse (agregador de imágenes Creative Commons: Flickr, Wikimedia, etc.) fotos con
// licencia de uso comercial para personas famosas que aún no tienen foto. NO se publican solas:
// quedan como candidatas en data/photo-candidates.json y se revisan en /revisar-fotos/ antes de
// aprobarlas (campo "photo" en people.json), para no poner la foto de otra persona.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = (f, d) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')); } catch { return d; } };
const { people } = read('people.json');
const photos = read('photos.json', {}).people ?? {};
const getty = read('getty.json', {}).people ?? {};
const store = read('photo-candidates.json', { checked: {}, people: {} });
const MAX = Number(process.env.MAX_QUERIES ?? 60);
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const slugify = (t) => norm(t).replace(/ /g, '-');

// Solo personas de programas de famosos (los anónimos casi nunca tienen fotos libres y hay más riesgo de homónimos)
const ANON = new Set(['gran-hermano', 'la-isla-de-las-tentaciones', 'maestros-de-la-costura', 'falso-amor', 'operacion-triunfo']);
const famous = new Map(); // id -> nº de apariciones
const add = (id) => { if (id && people[id]) famous.set(id, (famous.get(id) ?? 0) + 1); };
for (const f of readdirSync(join(DATA, 'realities'))) {
  const r = read(`realities/${f}`);
  for (const n of r.presenters ?? []) add(slugify(n));
  for (const e of r.editions ?? []) {
    for (const n of (e.presenter ?? '').replace(/\([^)]*\)/g, '').split(/\s+y\s+|[,;]\s*/)) if (n.trim()) add(slugify(n.trim()));
    if (ANON.has(r.id)) continue;
    for (const id of [e.winner, ...(e.finalists ?? []), ...(e.participants ?? []).map((p) => p.id)]) add(id);
  }
}
const todo = [...famous].filter(([id]) => !photos[id] && !getty[id] && !people[id].photo && !people[id].igPost && people[id].photoAuto !== false
  && /\s/.test(people[id].name.trim()) && !store.checked[id]).sort((a, b) => b[1] - a[1]).slice(0, MAX).map(([id]) => id);

let found = 0, asked = 0;
for (const id of todo) {
  const name = people[id].name.replace(/[«»"]/g, '').trim();
  try {
    const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(`"${name}"`)}&license_type=commercial&page_size=8&mature=false`, { headers: { 'User-Agent': 'wiki-reality-bot/1.0', Accept: 'application/json' } });
    asked++;
    if (res.status === 429 || res.status === 403) { console.warn(`Límite de Openverse (HTTP ${res.status}) tras ${asked} consultas`); break; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const tokens = norm(name).split(' ');
    const hits = (data.results ?? []).filter((x) => {
      const hay = norm(`${x.title ?? ''} ${(x.tags ?? []).map((t) => t.name).join(' ')}`);
      return tokens.every((t) => hay.split(' ').includes(t)) && !/nc|nd/.test(x.license ?? '');
    }).slice(0, 3).map((x) => ({
      src: x.url, thumb: x.thumbnail ?? x.url, page: x.foreign_landing_url, title: x.title ?? '', author: x.creator ?? 'Autor desconocido',
      license: x.license === 'cc0' ? 'CC0' : x.license === 'pdm' ? 'Public domain' : `CC ${String(x.license).toUpperCase()} ${x.license_version ?? ''}`.trim(),
      licenseUrl: x.license_url ?? '', source: x.source ?? '',
    }));
    store.checked[id] = new Date().toISOString().slice(0, 10);
    if (hits.length) { store.people[id] = hits; found++; console.log(`Candidatas ${id}: ${hits.length}`); }
    await new Promise((r) => setTimeout(r, 1200));
  } catch (e) { console.warn(`Aviso ${id}: ${e.message}`); }
}
// Limpieza: fuera quien ya tiene foto o ya no existe
for (const id of Object.keys(store.people)) if (!people[id] || photos[id] || people[id].photo || people[id].photoAuto === false) delete store.people[id];
writeFileSync(join(DATA, 'photo-candidates.json'), JSON.stringify({ _doc: 'Fotos candidatas de Openverse pendientes de revisar. Generado por scripts/update-photo-candidates.mjs.', checked: store.checked, people: store.people }, null, 2) + '\n');
console.log(`Openverse: ${asked} consultas, ${found} personas con candidatas, ${Object.keys(store.people).length} pendientes de revisar`);
