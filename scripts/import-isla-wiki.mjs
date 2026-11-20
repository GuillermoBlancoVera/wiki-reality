// Cruza data/raw/isla-wiki.json (tablas de Wikipedia, CC BY-SA) con las fichas de La isla de las tentaciones:
// nombres completos, procedencia y profesión, solteros que faltan, tiempo juntos y situación posterior de cada
// pareja, y relaciones pareja-soltero (número de citas y decisión final) como `links` con auto: 'wiki'.
// Uso: node scripts/import-isla-wiki.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
const DRY = process.argv.includes('--dry');
const raw = JSON.parse(readFileSync('data/raw/isla-wiki.json', 'utf8'));
const PF = 'data/people.json', RF = 'data/realities/la-isla-de-las-tentaciones.json';
const PD = JSON.parse(readFileSync(PF, 'utf8')), P = PD.people, R = JSON.parse(readFileSync(RF, 'utf8'));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[·.]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/ /g, '-');
const ALIAS = { gerardo: 'gerard', francisco: 'fran', rodrigo: 'rodri', jose: 'jose', 'juan pablo': 'juanpi', zaneti: 'zanetti', rober: 'roberto', melody: 'melodie', patricia: 'patri', patry: 'patri' };
// nombre → {full, nick, tokens}
const parseName = (s) => {
  const nick = s.match(/["“«]([^"”»]+)["”»]/)?.[1] ?? '';
  const full = s.replace(/[\u200b\u200c\ufeff]/g, '').replace(/\*/g, '').replace(/["“«][^"”»]+["”»]/, '').replace(/\s+/g, ' ').trim();
  const t = norm(full).split(' '); const set = new Set([...t, ...norm(nick).split(' ').filter(Boolean)]);
  for (const x of [...set]) if (ALIAS[x]) set.add(ALIAS[x]);
  if (t[0] === 'maria' && t[1] === 'del' && t[2] === 'mar') set.add('mar');
  if (t.length > 2 && ALIAS[t.slice(0, 2).join(' ')]) set.add(ALIAS[t.slice(0, 2).join(' ')]);
  return { full, nick, first: t[0], tokens: set, n: norm(full) };
};
const sameFirst = (a, b) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
// ¿la ficha `id` puede ser la persona wiki `w`?
const fits = (id, w) => {
  const o = parseName(P[id].name);
  if (o.n === w.n) return 3;
  const ot = norm(P[id].name).split(' ');
  if (ot.length > 1) { // nuestro nombre tiene apellido: debe coincidir alguno
    const sur = ot.slice(1).filter((x) => x.length > 2);
    if ([...w.tokens].some((x) => sameFirst(x, ot[0])) && sur.some((x) => w.tokens.has(x))) return 2;
    if (o.nick && w.tokens.has(norm(o.nick))) return 2;
    return 0;
  }
  return [...w.tokens].some((x) => sameFirst(x, ot[0])) || [...o.tokens].some((x) => w.tokens.has(x)) ? 1 : 0;
};
// Personas que Wikipedia nombra distinto que nuestras fichas (misma persona, comprobado a mano)
const MERGE = { 'jenny gallego': 'jennifer-soltera-isla-6', 'gabriella barbu': 'gabriela-soltera-isla-7', 'andrea palacio': 'andrea-palas', 'gerardo arias': 'gerard-arias', 'albert barranco': 'albert-barranco', 'katerina safarova': 'katerina-safarova', 'isaac torres': 'isaac-torres', 'hugo paz': 'hugo-paz' };
const islaIds = new Set(); for (const e of R.editions) { for (const c of e.couples ?? []) { islaIds.add(c.a); islaIds.add(c.b); } for (const s of e.singles ?? []) islaIds.add(s.id); }
const SRC = raw.source; const log = []; const stats = { names: 0, origin: 0, newSingles: 0, links: 0, couples: 0 };
const notJob = /^(Participante|Tentador|Tentadora|Ganador|Ganadores|Granjeras)\b/i;
const setFacts = (id, w, row) => {
  const p = P[id];
  if (norm(p.name).split(' ').length === 1 && w.n.split(' ').length > 1) { p.name = w.nick && norm(w.nick) !== norm(w.full) ? `${w.full} «${w.nick}»` : w.full; stats.names++; }
  if (!p.origin && row[1]) { p.origin = row[1]; stats.origin++; }
  if (!p.job && row[3] && !notJob.test(row[3]) && !/^\d/.test(row[3])) p.job = row[3];
};

for (const e of R.editions) {
  const T = raw.tables.filter((t) => new RegExp(`^Temporada ${e.number} `).test(t.h2));
  if (!T.length) continue;
  const tab = (re) => T.find((t) => re.test(t.h3));
  // ---- Parejas
  const cp = tab(/^Parejas/); const members = []; // {w,row,id}
  if (cp) {
    const H = cp.rows[0]; const iTog = H.findIndex((h) => /Tiempo/.test(h)), iDec = H.findIndex((h) => /Decisi/.test(h)), iAft = H.findIndex((h) => /después/.test(h));
    const rows = cp.rows.slice(1).map((row) => ({ row, w: parseName(row[0]) }));
    for (let i = 0; i + 1 < rows.length; i += 2) {
      const [m1, m2] = [rows[i], rows[i + 1]];
      let best = null, bs = 0;
      const loose = (id, w) => fits(id, w) || (sameFirst(norm(P[id].name).split(' ')[0], w.first) ? 1 : 0);
      for (const c of e.couples ?? []) {
        const s = Math.max(Math.min(loose(c.a, m1.w), 1) + Math.min(loose(c.b, m2.w), 1), Math.min(loose(c.a, m2.w), 1) + Math.min(loose(c.b, m1.w), 1)) * 10 + fits(c.a, m1.w) + fits(c.b, m2.w) + fits(c.a, m2.w) + fits(c.b, m1.w);
        if (s > bs) { bs = s; best = c; }
      }
      if (!best || bs < 20) { log.push(`ed ${e.number}: pareja sin cruzar: ${m1.w.full} / ${m2.w.full} (mejor ${best ? best.a + '+' + best.b : '-'} ${bs})`); continue; }
      const straight = loose(best.a, m1.w) + loose(best.b, m2.w) >= loose(best.a, m2.w) + loose(best.b, m1.w);
      m1.id = straight ? best.a : best.b; m2.id = straight ? best.b : best.a;
      for (const m of [m1, m2]) { setFacts(m.id, m.w, m.row); m.decision = iDec >= 0 ? m.row[iDec] : ''; members.push(m); }
      if (iTog >= 0 && m1.row[iTog]) best.together = m1.row[iTog];
      if (iAft >= 0 && m1.row[iAft]) { best.after = m1.row[iAft].replace(/\s*\/\s*$/, '').replace(/ \/ /g, '. '); best.afterLabel = H[iAft].replace(/^meses/, 'Meses'); }
      stats.couples++;
    }
  }
  // ---- Solteros y solteras
  const singles = []; // {w,row,id,role}
  for (const [re, role] of [[/^Solteros/, 'Soltero'], [/^Solteras/, 'Soltera']]) {
    const st = tab(re); if (!st) continue;
    for (const row of st.rows.slice(1)) {
      const w = parseName(row[0]); if (!w.n) continue;
      const ours = (e.singles ??= []).filter((s) => s.role.startsWith(role) && !singles.some((x) => x.id === s.id));
      let cand = ours.map((s) => [s.id, fits(s.id, w)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
      let id = cand.length === 1 || (cand.length > 1 && cand[0][1] > cand[1][1]) ? cand[0][0] : null;
      if (MERGE[w.n] && P[MERGE[w.n]]) { id = MERGE[w.n]; cand = [[id, 3]]; islaIds.add(id); if (!e.singles.some((x) => x.id === id)) e.singles.push({ id, role }); }
      if (!id && cand.length > 1) log.push(`ed ${e.number}: ${role} ambiguo ${w.full}: ${cand.map((c) => c[0]).join(', ')}`);
      if (!id && !cand.length) {
        // ¿ya existe en La Isla con el mismo nombre completo (repite edición)?
        id = [...islaIds].find((x) => parseName(P[x].name).n === w.n) ?? null;
        if (!id) { const s = slug(w.full); id = P[s] && !islaIds.has(s) ? `${s}-isla` : s; if (!P[id]) { P[id] = { name: w.nick ? `${w.full} «${w.nick}»` : w.full }; stats.newSingles++; } }
        islaIds.add(id);
        if (!e.singles.some((s) => s.id === id)) e.singles.push({ id, role });
        e.singlesSource ??= SRC;
      }
      if (id) { setFacts(id, w, row); singles.push({ w, row, id, role, info: row[4] ?? '' }); }
    }
  }
  // ---- Citas y decisión final → links
  const resolve = (label, pool, hint = '') => {
    const t = norm(label).split(' '); if (!t[0]) return null;
    const ini = t.length > 1 && t[t.length - 1].length === 1 ? t.pop() : null;
    const key = ALIAS[t.join(' ')] ?? t.join(' ');
    let c = pool.filter((x) => x.w.n === key || [...x.w.tokens].some((k) => k === key || (t.length === 1 && sameFirst(k, key) && k === x.w.first)) || (t.length > 1 && t.every((k) => x.w.tokens.has(k))));
    if (ini) { const c2 = c.filter((x) => x.w.n.split(' ').slice(1).some((k) => k.startsWith(ini))); if (c2.length) c = c2; }
    if (c.length > 1) { const exact = c.filter((x) => x.w.first === key); if (exact.length === 1) c = exact; }
    if (c.length > 1 && hint) { const h = c.filter((x) => norm(hint).includes(x.w.n)); if (h.length === 1) c = h; }
    return c.length === 1 ? c[0] : null;
  };
  const pair = new Map(); // "who|with" → {n, texts[]}
  const add = (who, wth) => { const k = `${who}|${wth}`; if (!pair.has(k)) pair.set(k, { who, with: wth, n: 0, texts: [] }); return pair.get(k); };
  const ct = tab(/^Citas/);
  if (ct) {
    const h1 = ct.rows[0], h2 = ct.rows[1];
    for (const row of ct.rows.slice(2)) {
      const m = resolve(row[0], members); if (!m) { log.push(`ed ${e.number}: fila de citas sin cruzar: ${row[0]}`); continue; }
      for (let j = 1; j < row.length; j++) {
        if (/después/.test(h1[j] ?? '') || /Elecci|Estado|finales|Cara a cara/i.test(h2[j] ?? '')) continue;
        if (j > 1 && h1[j] === h1[j - 1] && row[j] === row[j - 1]) continue; // celda combinada
        const v = row[j]; if (!v || /^(Entran|No hubo|Sin cita|Rechazad|Sol[oa]$|Abandon|Expulsad|Destierro)/i.test(v)) continue;
        const s = resolve(v, singles, m.decision); if (!s) { if (!resolve(v, members)) log.push(`ed ${e.number}: cita sin cruzar: ${row[0]} → ${v}`); continue; }
        if (s.id !== m.id) add(m.id, s.id).n++;
      }
    }
  }
  const first = (id) => P[id].name.split(' ')[0];
  for (const m of members) {
    const parts = (m.decision ?? '').split(' / ').map((x) => x.trim()).filter(Boolean);
    for (const part of parts) {
      const s = singles.find((x) => x.w.n === norm(part)) ?? null; if (!s || s.id === m.id) continue;
      const alone = /^Sol[oa]$/.test(parts[parts.length - 1]); const left = parts.some((x) => /^Abandono/.test(x));
      add(m.id, s.id).texts.push(alone ? `${first(m.id)} eligió a ${first(s.id)} en su decisión final, pero salió del programa sin pareja` : left ? `Abandonaron juntos el programa` : `Salieron juntos del programa`);
    }
  }
  const auto = [];
  for (const x of pair.values()) {
    const top = Math.max(...[...pair.values()].filter((y) => y.who === x.who).map((y) => y.n));
    if (!(x.n >= 2 || x.texts.length || (x.n === top && x.n > 0))) continue;
    const t = [x.n ? `Tuvieron ${x.n} cita${x.n > 1 ? 's' : ''} en el programa` : '', ...x.texts].filter(Boolean).join('. ');
    auto.push({ who: x.who, with: x.with, text: t, source: SRC, auto: 'wiki' });
  }
  e.links = [...(e.links ?? []).filter((l) => l.auto !== 'wiki'), ...auto]; if (!e.links.length) delete e.links;
  stats.links += auto.length;
}
console.log(stats); console.log(log.join('\n'));
if (!DRY) { writeFileSync(PF, JSON.stringify(PD, null, 2) + '\n'); writeFileSync(RF, JSON.stringify(R, null, 2) + '\n'); }
