// Descarga de Wikipedia en español (CC BY-SA) las tablas de las páginas listadas en data/raw/wiki-pages.json
// y, si hay `prefixes`, la lista de títulos que empiezan por cada prefijo. Corre en GitHub Actions.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from './fetch-isla-wiki.mjs';
const cfg = JSON.parse(readFileSync('data/raw/wiki-pages.json', 'utf8'));
const UA = { 'User-Agent': 'wiki-reality-bot/1.0 (static site generator)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = async (q) => { for (let i = 0; i < 6; i++) { await sleep(1500 + i * 4000); const r = await fetch('https://es.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA }); if (r.ok) return r.json(); if (r.status !== 429 && r.status < 500) throw new Error('HTTP ' + r.status); } throw new Error('HTTP 429 persistente'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
mkdirSync('data/raw/wiki', { recursive: true });
if (cfg.prefixes?.length) {
  const titles = {};
  for (const p of cfg.prefixes) {
    const out = []; let cont = '';
    do { const j = await api(`action=query&list=allpages&apnamespace=0&apfilterredir=nonredirects&aplimit=500&apprefix=${encodeURIComponent(p)}${cont}`); out.push(...j.query.allpages.map((x) => x.title)); cont = j.continue ? `&apcontinue=${encodeURIComponent(j.continue.apcontinue)}` : ''; await sleep(300); } while (cont);
    titles[p] = out;
  }
  writeFileSync('data/raw/wiki-titles.json', JSON.stringify(titles, null, 1) + '\n');
}
const missing = [];
for (const title of cfg.pages ?? []) {
  try {
    const j = await api(`action=parse&redirects=1&prop=text|revid&page=${encodeURIComponent(title)}`);
    if (!j.parse) { missing.push(title); continue; }
    writeFileSync(`data/raw/wiki/${slug(title)}.json`, JSON.stringify({ title: j.parse.title, source: `https://es.wikipedia.org/wiki/${encodeURIComponent(j.parse.title.replace(/ /g, '_'))}`, license: 'CC BY-SA 4.0', revid: j.parse.revid, tables: parse(j.parse.text) }) + '\n');
  } catch (e) { missing.push(`${title} (${e.message})`); }
  await sleep(400);
}
console.log('páginas:', (cfg.pages ?? []).length, 'sin encontrar:', missing.join(' | ') || 'ninguna');
