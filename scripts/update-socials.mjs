// Busca en Wikidata las redes sociales oficiales de cada persona y las guarda en data/socials.json.
// Wikidata es una fuente curada: solo se aceptan coincidencias exactas de nombre con una única
// persona cuya descripción encaje con televisión/realities. Lo que pongas a mano en
// people.json (socials) siempre tiene prioridad, y "socialsAuto": false desactiva la búsqueda.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const { people } = JSON.parse(readFileSync(join(DATA, 'people.json'), 'utf8'));
const MATCH = /(reality|televisi|concursante|gran hermano|supervivientes|tentaciones|colaborador|influencer|presentador|cantante|modelo|personalidad|youtuber|tiktoker|actor|actriz|empresari)/i;

// En los programas de famosos casi todos tienen ficha en Wikidata con otra profesión (cantante, deportista…):
// para ellos se acepta una descripción más amplia. Para concursantes anónimos se mantiene el filtro estricto.
const MATCH_FAMOUS = /(cantante|músic|actor|actriz|humorista|cómic|periodista|deportista|futbolista|torer|bailar|diseñador|polític|nadador|piragüista|jinete|escritor|chef|cociner|drag|raper|mago|atleta|gimnasta|baloncest|tenista|piloto|compositor|artista|locutor|empresari|aristócrata|socialité|modelo|presentador|colaborador|televisi|influencer|youtuber)/i;
const ANON = new Set(['gran-hermano', 'la-isla-de-las-tentaciones', 'maestros-de-la-costura', 'falso-amor', 'operacion-triunfo']);
const slugify = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const famous = new Set();
for (const f of readdirSync(join(DATA, 'realities'))) {
  const r = JSON.parse(readFileSync(join(DATA, 'realities', f), 'utf8'));
  for (const n of r.presenters ?? []) famous.add(slugify(n));
  for (const e of r.editions ?? []) {
    for (const n of (e.presenter ?? '').replace(/\([^)]*\)/g, '').split(/\s+y\s+|[,;]\s*/)) if (n.trim()) famous.add(slugify(n.trim()));
    if (ANON.has(r.id)) continue;
    for (const id of [e.winner, ...(e.finalists ?? []), ...(e.participants ?? []).map((p) => p.id)]) if (id) famous.add(id);
  }
}

const candidates = Object.entries(people)
  .filter(([, p]) => p.socialsAuto !== false && /\s/.test(p.name.trim()))
  .map(([id, p]) => ({ id, name: p.name.replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim() }));

const lit = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"@es`;
async function query(batch) {
  const sparql = `SELECT ?name ?item ?desc ?ig ?yt ?tt ?x ?img ?born ?place ?wiki WHERE {
    VALUES ?name { ${batch.map((c) => lit(c.name)).join(' ')} }
    ?item rdfs:label ?name; wdt:P31 wd:Q5.
    OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "es") }
    OPTIONAL { ?item wdt:P2003 ?ig } OPTIONAL { ?item wdt:P2397 ?yt }
    OPTIONAL { ?item wdt:P7085 ?tt } OPTIONAL { ?item wdt:P2002 ?x } OPTIONAL { ?item wdt:P18 ?img }
    OPTIONAL { ?item wdt:P569 ?born } OPTIONAL { ?item wdt:P19 ?pl. ?pl rdfs:label ?place FILTER(LANG(?place) = "es") }
    OPTIONAL { ?wiki schema:about ?item; schema:isPartOf <https://es.wikipedia.org/> }
  }`;
  const res = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), {
    headers: { 'User-Agent': 'wiki-reality-bot/1.0', Accept: 'application/sparql-results+json' },
  });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  return (await res.json()).results.bindings;
}

const out = {};
const bios = {}; // id -> descripción, nacimiento y artículo de Wikipedia de la misma ficha
const images = {}; // id -> nombre de archivo en Commons (P18 de la misma ficha de Wikidata)
for (let i = 0; i < candidates.length; i += 60) {
  const batch = candidates.slice(i, i + 60);
  let rows = [];
  try { rows = await query(batch); } catch (e) { console.warn(`Aviso: ${e.message}`); continue; }
  for (const c of batch) {
    const mine = rows.filter((r) => r.name.value === c.name);
    const items = new Map();
    for (const r of mine) {
      const it = items.get(r.item.value) ?? { desc: r.desc?.value ?? '', s: {} };
      if (r.born && !it.born) it.born = r.born.value.slice(0, 10);
      if (r.place && !it.place) it.place = r.place.value;
      if (r.wiki && !it.wiki) it.wiki = r.wiki.value;
      if (r.ig) it.s.instagram = `https://www.instagram.com/${r.ig.value}/`;
      if (r.yt) it.s.youtube = `https://www.youtube.com/channel/${r.yt.value}`;
      if (r.tt) it.s.tiktok = `https://www.tiktok.com/@${r.tt.value}`;
      if (r.x) it.s.x = `https://x.com/${r.x.value}`;
      if (r.img && !it.img) it.img = decodeURIComponent(r.img.value.split('/Special:FilePath/')[1] ?? '').replace(/_/g, ' ');
      items.set(r.item.value, it);
    }
    const ok = [...items.values()].filter((it) => (famous.has(c.id) ? MATCH_FAMOUS : MATCH).test(it.desc));
    if (ok.length === 1 && (ok[0].desc || ok[0].born)) bios[c.id] = { desc: ok[0].desc, born: ok[0].born, place: ok[0].place, wiki: ok[0].wiki, wikidata: [...items.keys()].find((k) => items.get(k) === ok[0]) };
    if (ok.length === 1 && ok[0].img) images[c.id] = { file: ok[0].img, wikidata: [...items.keys()].find((k) => items.get(k) === ok[0]) };
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

// ---------- Datos biográficos básicos (Wikidata, licencia CC0) ----------
const biosPath = join(DATA, 'bios.json');
let oldBios = {};
try { oldBios = JSON.parse(readFileSync(biosPath, 'utf8')).people ?? {}; } catch {}
const mergedBios = Object.fromEntries(Object.entries({ ...oldBios, ...bios }).filter(([id]) => people[id] && people[id].socialsAuto !== false));
writeFileSync(biosPath, JSON.stringify({ _doc: 'Generado por scripts/update-socials.mjs desde Wikidata (CC0). Para escribir una biografía a mano usa "bio" en people.json.', people: mergedBios }, null, 2) + '\n');
console.log(`Datos biográficos para ${Object.keys(bios).length} personas`);

// ---------- Fotos con licencia libre (Wikimedia Commons) ----------
// Solo se aceptan licencias que permiten uso comercial (la web lleva publicidad): CC0, dominio
// público, CC BY y CC BY-SA. Se guardan autor, licencia y enlace para la atribución obligatoria.
const FREE = /^(cc0|public domain|pd\b|cc[ -]by(-sa)?[ -]\d)/i;
const strip = (h = '') => h.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const photos = {};
const ids = Object.keys(images);
for (let i = 0; i < ids.length; i += 40) {
  const batch = ids.slice(i, i + 40);
  const titles = batch.map((id) => `File:${images[id].file}`).join('|');
  try {
    const res = await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320&titles=' + encodeURIComponent(titles), { headers: { 'User-Agent': 'wiki-reality-bot/1.0' } });
    if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
    const data = await res.json();
    const norm = Object.fromEntries((data.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const pg of data.query.pages ?? []) {
      const info = pg.imageinfo?.[0];
      if (!info) continue;
      const m = info.extmetadata ?? {};
      const license = strip(m.LicenseShortName?.value);
      if (!FREE.test(license) || /\b(nc|nd)\b/i.test(license) || m.NonFree?.value === 'true') continue;
      const title = norm[pg.title] ?? pg.title;
      for (const id of batch.filter((id) => `File:${images[id].file}` === title || `File:${images[id].file}` === pg.title)) {
        photos[id] = {
          src: info.thumburl, page: info.descriptionurl, license,
          licenseUrl: m.LicenseUrl?.value ?? '', author: strip(m.Artist?.value) || 'Autor desconocido',
          wikidata: images[id].wikidata,
        };
      }
    }
  } catch (e) { console.warn(`Aviso: ${e.message}`); }
}
const photosPath = join(DATA, 'photos.json');
let oldPhotos = {};
try { oldPhotos = JSON.parse(readFileSync(photosPath, 'utf8')).people ?? {}; } catch {}
const mergedPhotos = Object.fromEntries(Object.entries({ ...oldPhotos, ...photos }).filter(([id]) => people[id] && people[id].socialsAuto !== false && people[id].photoAuto !== false));
writeFileSync(photosPath, JSON.stringify({ _doc: 'Generado por scripts/update-socials.mjs: imagen (P18) de Wikidata con licencia libre de Wikimedia Commons. "photoAuto": false en people.json la desactiva.', people: mergedPhotos }, null, 2) + '\n');
console.log(`Fotos con licencia libre para ${Object.keys(photos).length} personas`);
