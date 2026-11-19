// Resuelve el visor oficial de Getty Images para las personas con "getty": "<id de la foto>"
// en people.json y lo guarda en data/getty.json. Usa el oEmbed público de Getty: si la foto
// no admite incrustación, simplemente no se muestra. Nunca se descarga ni se copia la imagen.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const { people } = JSON.parse(readFileSync(join(DATA, 'people.json'), 'utf8'));
const path = join(DATA, 'getty.json');
let old = {};
try { old = JSON.parse(readFileSync(path, 'utf8')).people ?? {}; } catch {}

const out = {};
for (const [id, p] of Object.entries(people)) {
  if (!p.getty) continue;
  const gid = String(p.getty).match(/\d{6,}/)?.[0];
  if (!gid) continue;
  try {
    const res = await fetch(`https://embed.gettyimages.com/oembed?url=${encodeURIComponent(`http://gty.im/${gid}`)}&caller=wiki-reality`, { headers: { 'User-Agent': 'wiki-reality-bot/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const o = await res.json();
    const html = o.html ?? '';
    // Formato clásico (iframe) o actual (widget con id + sig)
    let src = html.match(/<iframe[^>]+src=["']([^"']+)["']/)?.[1];
    const f = (k) => html.match(new RegExp(`${k}\\s*:\\s*'([^']*)'`))?.[1];
    if (!src && f('sig') && f('id')) src = `https://embed.gettyimages.com/embed/${gid}?et=${encodeURIComponent(f('id'))}&tld=${f('tld') ?? 'com'}&sig=${encodeURIComponent(f('sig'))}&caption=true&ver=2`;
    if (!src || !/^(https?:)?\/\/embed\.gettyimages\.com\//.test(src)) { console.warn(`Respuesta: ${JSON.stringify(o).slice(0, 700)}`); throw new Error('sin visor'); }
    const px = (v, d) => parseInt(v ?? '', 10) || d;
    out[id] = { id: gid, src: src.replace(/^\/\//, 'https://').replace(/&amp;/g, '&'), width: px(f('w'), o.width ?? 594), height: px(f('h'), o.height ?? 400), title: o.title ?? '' };
    console.log(`OK ${id}: ${o.title ?? gid}`);
  } catch (e) {
    console.warn(`Aviso ${id} (${gid}): ${e.message}`);
    if (old[id]?.id === gid) out[id] = old[id]; // fallo puntual: se conserva lo anterior
  }
}
writeFileSync(path, JSON.stringify({ _doc: 'Generado por scripts/update-getty.mjs (oEmbed de Getty Images). Para añadir una foto: "getty": "<id>" en people.json.', people: out }, null, 2) + '\n');
console.log(`Visores de Getty: ${Object.keys(out).length}`);
