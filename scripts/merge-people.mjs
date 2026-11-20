// Une dos fichas que son la misma persona: node scripts/merge-people.mjs desde=hacia [desde=hacia ...]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const pairs = process.argv.slice(2).map((x) => x.split('='));
const files = ['data/people.json', ...readdirSync('data/realities').map((f) => `data/realities/${f}`), ...['socials', 'photos', 'bios', 'getty', 'person-news', 'photo-candidates'].map((f) => `data/${f}.json`)];
const walk = (v, from, to) => {
  if (typeof v === 'string') return v === from ? to : v;
  if (Array.isArray(v)) return v.map((x) => walk(x, from, to));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) { const nk = k === from ? to : k; const nv = walk(x, from, to); o[nk] = nk in o && o[nk] && typeof o[nk] === 'object' && !Array.isArray(o[nk]) ? { ...nv, ...o[nk] } : (nk in o ? o[nk] : nv); } return o; }
  return v;
};
for (const f of files) {
  let d; try { d = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  for (const [from, to] of pairs) {
    if (f === 'data/people.json') {
      const P = d.people; if (!P[from] || !P[to]) { console.log('falta', from, to); continue; }
      const a = P[to], b = P[from]; delete P[from];
      P[to] = { ...b, ...a, socials: { ...(b.socials ?? {}), ...(a.socials ?? {}) }, name: a.name.split(' ').length >= b.name.split(' ').length ? a.name : b.name };
      if (!Object.keys(P[to].socials).length) delete P[to].socials;
    }
    d = walk(d, from, to);
  }
  writeFileSync(f, JSON.stringify(d, null, f.includes('raw') ? 1 : 2) + '\n');
}
