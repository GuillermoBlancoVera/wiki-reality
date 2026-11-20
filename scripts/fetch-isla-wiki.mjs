// Descarga las tablas del artículo de Wikipedia (CC BY-SA) de La isla de las tentaciones y las guarda
// como filas y celdas en data/raw/isla-wiki.json. Se ejecuta en GitHub Actions (Wikipedia no es accesible
// desde todas las redes). El cruce con las fichas se hace después con scripts/import-isla-wiki.mjs.
import { writeFileSync, readFileSync } from 'node:fs';

const PAGE = 'La_isla_de_las_tentaciones';
const clean = (h) => h.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<br\s*\/?>/g, ' / ')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

export function parse(html) {
  const out = []; let h2 = '', h3 = '';
  const re = /<h([234])[^>]*>([\s\S]*?)<\/h\1>|<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
  for (let m; (m = re.exec(html));) {
    if (m[1]) { const t = clean(m[2]); if (m[1] === '2') { h2 = t; h3 = ''; } else h3 = t; continue; }
    const grid = []; const pend = []; // pend[col] = {left, text}
    const rows = m[3].split(/<tr[^>]*>/).slice(1);
    rows.forEach((row, r) => {
      const cells = [...row.matchAll(/<t([hd])([^>]*)>([\s\S]*?)(?=<t[hd][\s>]|<\/tr>|$)/g)];
      const line = []; let c = 0;
      const fill = () => { while (pend[c]?.left > 0) { line[c] = pend[c].text; pend[c].left--; c++; } };
      for (const cell of cells) {
        fill();
        const text = clean(cell[3].replace(/<\/t[hd]>\s*$/, ''));
        const cs = +(cell[2].match(/colspan="?(\d+)/)?.[1] ?? 1), rs = +(cell[2].match(/rowspan="?(\d+)/)?.[1] ?? 1);
        for (let i = 0; i < cs; i++) { line[c] = text; if (rs > 1) pend[c] = { left: rs - 1, text }; c++; }
      }
      fill();
      grid.push(line.map((x) => x ?? ''));
    });
    out.push({ h2, h3, rows: grid });
  }
  return out;
}

if (process.argv[1].endsWith('fetch-isla-wiki.mjs')) {
  const src = process.argv[2];
  let html;
  if (src) html = readFileSync(src, 'utf8');
  else {
    const res = await fetch(`https://es.wikipedia.org/w/api.php?action=parse&page=${PAGE}&prop=text|revid&format=json&formatversion=2`, { headers: { 'User-Agent': 'wiki-reality-bot/1.0 (static site generator)' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json(); html = j.parse.text;
    var revid = j.parse.revid;
  }
  const tables = parse(html);
  writeFileSync('data/raw/isla-wiki.json', JSON.stringify({ source: `https://es.wikipedia.org/wiki/${PAGE}`, license: 'CC BY-SA 4.0', revid: revid ?? null, fetched: new Date().toISOString().slice(0, 10), tables }, null, 1) + '\n');
  console.log('tablas:', tables.length);
}
