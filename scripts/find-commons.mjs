// Busca en Wikimedia Commons fotos de personas que aún no tienen foto libre. No publica nada: deja
// candidatas en data/raw/commons-candidates.json para revisarlas a mano (homónimos) y aprobarlas
// con el campo "commons" de people.json. Corre en GitHub Actions (workflow manual).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const rd = (f, d) => { try { return JSON.parse(readFileSync(`data/${f}`, 'utf8')); } catch { return d; } };
const P = rd('people.json').people, ph = rd('photos.json', {}).people ?? {}, g = rd('getty.json', {}).people ?? {};
const prev = rd('raw/commons-candidates.json', { checked: {}, people: {} });
const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const strip = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inShow = new Set();
for (const f of readdirSync('data/realities')) for (const e of rd(`realities/${f}`).editions ?? [])
  for (const id of [e.winner, ...(e.finalists ?? []), ...(e.participants ?? []).map((x) => x.id), ...(e.singles ?? []).map((x) => x.id), ...(e.couples ?? []).flatMap((c) => [c.a, c.b]), ...(e.masks ?? []).map((m) => m.id ?? m.person)]) if (id) inShow.add(id);
const todo = [...inShow].filter((id) => P[id] && !P[id].photo && !ph[id] && !g[id] && !P[id].igPost && !P[id].commons && P[id].photoAuto !== false && !prev.checked[id])
  .map((id) => [id, P[id].name.replace(/«[^»]*»|\([^)]*\)/g, '').replace(/,/g, '').replace(/\s+/g, ' ').trim()]).filter((x) => x[1].split(' ').length > 1).slice(0, Number(process.env.MAX ?? 1500));
const api = async (q) => { for (let i = 0; i < 5; i++) { const r = await fetch('https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: { 'User-Agent': 'wiki-reality-bot/1.0 (https://github.com/GuillermoBlancoVera/wiki-reality)' } }); if (r.ok) return r.json(); await sleep(3000 * (i + 1)); } return {}; };
let found = 0;
for (const [id, name] of todo) {
  const j = await api('action=query&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=' + encodeURIComponent(`"${name}"`) + '&prop=imageinfo&iiprop=extmetadata|size');
  const n = norm(name);
  const hits = (j.query?.pages ?? []).filter((p) => /\.(jpe?g|png)$/i.test(p.title) && p.imageinfo?.[0]).sort((a, b) => a.index - b.index).map((p) => { const m = p.imageinfo[0].extmetadata ?? {}; return { t: p.title, d: strip(m.ImageDescription?.value).slice(0, 140), c: strip(m.Categories?.value).slice(0, 140), l: strip(m.LicenseShortName?.value), w: p.imageinfo[0].width, h: p.imageinfo[0].height }; })
    .filter((h) => (' ' + norm(h.t + ' ' + h.d) + ' ').includes(' ' + n + ' ') && !/deaths|PD-old|PD-scan|births 1[0-8]/i.test(h.c)).slice(0, 4);
  prev.checked[id] = new Date().toISOString().slice(0, 10);
  if (hits.length) { prev.people[id] = { name, job: P[id].job ?? '', hits }; found++; } else delete prev.people[id];
  await sleep(250);
}
for (const id of Object.keys(prev.people)) if (!P[id] || ph[id] || P[id].commons) delete prev.people[id];
writeFileSync('data/raw/commons-candidates.json', JSON.stringify(prev, null, 1) + '\n');
console.log(`Commons: ${todo.length} consultas, ${found} con candidatas`);
