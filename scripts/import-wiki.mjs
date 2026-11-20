// Cruza las tablas de Wikipedia (data/raw/wiki/*.json, CC BY-SA) con las fichas de cada edición:
// nombre completo, procedencia y profesión; y lista a quienes faltan en nuestras ediciones.
// Uso: node scripts/import-wiki.mjs [--dry] [--add]
import { readFileSync, writeFileSync } from 'node:fs';
const DRY = process.argv.includes('--dry'), ADD = process.argv.includes('--add');
const PF = 'data/people.json';
const PD = JSON.parse(readFileSync(PF, 'utf8')), P = PD.people;
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[·.]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/ /g, '-');
const ALIAS = { gerardo: 'gerard', francisco: 'fran', rodrigo: 'rodri', 'juan pablo': 'juanpi', rober: 'roberto', patricia: 'patri', patry: 'patri', jose: 'jose' };
const clean = (s) => s.replace(/[​‌﻿]/g, '').replace(/\[[^\]]*\]/g, '').replace(/\(†\)|†/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const parseName = (s) => {
  const nick = s.match(/["“«]([^"”»]+)["”»]/)?.[1] ?? '';
  const full = clean(s.replace(/["“«][^"”»]+["”»]/, ''));
  const t = norm(full).split(' '); const set = new Set([...t, ...norm(nick).split(' ').filter(Boolean)]);
  for (const x of [...set]) if (ALIAS[x]) set.add(ALIAS[x]);
  return { full, nick, tokens: set, n: norm(full) };
};
const sameFirst = (a, b) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));
const fits = (id, w) => {
  const o = parseName(P[id].name);
  if (o.n === w.n) return 3;
  const ot = norm(P[id].name).split(' ');
  if (ot.length > 1) {
    const sur = ot.slice(1).filter((x) => x.length > 2);
    if ([...w.tokens].some((x) => sameFirst(x, ot[0])) && sur.some((x) => w.tokens.has(x))) return 2;
    if (o.nick && w.tokens.has(norm(o.nick))) return 2;
    return 0;
  }
  return [...w.tokens].some((x) => sameFirst(x, ot[0])) || [...o.tokens].some((x) => w.tokens.has(x)) ? 1 : 0;
};
// reality ← fichero de Wikipedia, y cómo se elige la edición
const SRC = [
  ['gran-hermano', 'gran-hermano-espana', (t) => ({ n: /Catorce/.test(t.h2) ? 14 : /12\+1/.test(t.h2) ? 13 : /Revolution/.test(t.h2) ? 18 : +(t.h2.match(/Gran Hermano (\d+)/)?.[1] ?? 1) })],
  ['gran-hermano-duo', 'gran-hermano-duo', (t) => ({ n: +(t.h2.match(/Dúo (\d+)/)?.[1] ?? 1) })],
  ['gran-hermano-vip', 'gran-hermano-vip', (t) => ({ n: +(t.h2.match(/VIP (\d+)/)?.[1] ?? 1) })],
  ['supervivientes', 'supervivientes-programa-de-television-espanol', (t) => ({ y: year(t.h2) })],
  ['supervivientes', 'supervivientes-all-stars', (t) => ({ y: year(t.h2), allstars: true })],
  ['operacion-triunfo', 'operacion-triunfo-espana', (t) => ({ n: +(t.h3.match(/^OT (\d+)/)?.[1] ?? 0) })],
  ['masterchef-celebrity', 'masterchef-celebrity-programa-de-television-espanol', (t) => ({ y: year(t.h2) })],
  ['maestros-de-la-costura', 'maestros-de-la-costura', (t) => ({ y: year(t.h2) })],
  ['pesadilla-en-el-paraiso', 'pesadilla-en-el-paraiso', (t) => ({ y: year(t.h2) })],
  ['falso-amor', 'falso-amor-reality', (t) => ({ y: year(t.h2) })],
  ['tu-cara-me-suena', 'tu-cara-me-suena-programa-de-television-espanol', (t) => ({ n: +(t.h3.match(/suena (\d+)/)?.[1] ?? 0) })],
];
function year(s) { return +(s.match(/\((\d{4})/)?.[1] ?? 0); }

// Misma persona con otro nombre (comprobado por edición): nombre en Wikipedia → nombre en nuestra ficha; `=` = no renombrar
const MANUAL = { 'alonso jimenez': 'Alonso', 'karola alonso': 'Karola', 'andres barreiro': 'Andrés', 'sara de lucas': 'Sara', 'saray leal': 'Saray', 'mayte salas': 'Maite', 'jhota garcia': 'José Ramón García', 'anup menda': 'Anup Naraim', 'arturo sancho': 'Arturo García', 'raky martin': 'Raquel Martín «Raki»', 'giuls tortella': 'Giulia Tortella', 'juanma furio': 'Juanma Fario', 'raquel lozano': '=Raquel Martín', 'ivy mauleon': '=Tania Mauleón', 'yolanda saez': 'Yoli Sáez', 'marieta sola': '=Marieta Díaz', 'carlo costanzia': 'Carlo Constanzia', 'tony genil': 'Toni Genil', 'm carmen torrecillas': 'Mari Carmen Torrecillas', 'ignacio de borbon': 'Nacho de Borbón', 'javian': 'Javián Antón', 'guille barea': 'Guille B.', 'guillermo martin': 'Guille M.', 'noelia cano': 'Noelia', 'tania sanchez': 'Tania S.', 'tania gomez': 'Tania G.', 'ruben noel': 'Rubén', 'patricia del olmo': 'Patty', 'gabriela fernandez': 'Gabriela Fdez de Bobadilla', 'isabel bermejo': 'Isa Bermejo', 'agoney': 'Agoney Hernández', 'nia': 'Nia Correia', 'angel corrales': 'Ángel', 'angela yichan molina': 'Yichan', 'maria jesus grados': 'Mª Jesús G.', 'maria jesus ruiz': 'Mª Jesús R.', 'mari angeles delgado': 'Mª Ángeles', 'antonio david flores': 'A. David', 'beatriz retamal': 'Bea', 'daniela requena': 'Daniela', 'dani garcia primo': 'Dani' };
const stats = { names: 0, origin: 0, job: 0, matched: 0, wikiOnly: 0, tables: 0, added: 0 };
const report = {};
const isDup = (a, b) => a === b;
for (const [rid, file, pick] of SRC) {
  const RF = `data/realities/${rid}.json`; const R = JSON.parse(readFileSync(RF, 'utf8'));
  let W; try { W = JSON.parse(readFileSync(`data/raw/wiki/${file}.json`, 'utf8')); } catch { continue; }
  let changed = false;
  for (const t of W.tables) {
    const H = t.rows[0]; if (!H || t.rows.length < 3) continue;
    if (/Estad|Nomina|Resultados|Equipo|Audiencia|Temporadas|Resumen|Referencias|Galas|Debates|Big Bro|Premios|Última|directo|Límite/.test(t.h3 + ' ' + t.h2)) continue;
    const hi = (re) => H.findIndex((h) => re.test(h));
    let ni = -1; H.forEach((h, i) => { if (i < 3 && /Concursante|Participante|Aspirante|Aprendiz|Pareja/.test(h)) ni = i; });
    const oi = (() => { const a = hi(/Procedencia|Residen/); return a >= 0 ? a : hi(/Origen/); })();
    const ji = hi(/Profesi|Ocupaci|Conocido por/);
    if (ni < 0 && oi >= 1) ni = oi - 1; else if (ni < 0 && ji >= 1) ni = ji - 1;
    if (ni >= 1 && /Edad/.test(H[ni])) ni -= 1;
    if (ni < 0 || (oi < 0 && ji < 0)) continue;
    const sel = pick(t);
    const ed = R.editions.find((e) => {
      const isAll = /All Stars/i.test(e.title ?? '');
      if (sel.allstars !== undefined ? sel.allstars !== isAll : (rid === 'supervivientes' && isAll)) return false;
      if (sel.n && e.number !== sel.n) return false;
      if (sel.y && e.year !== sel.y && !(sel.n)) return false;
      return !!(sel.n || sel.y);
    });
    if (!ed) { (report.noEdition ??= []).push(`${rid}: ${t.h2} | ${t.h3}`); continue; }
    stats.tables++;
    const ids = [ed.winner, ...(ed.finalists ?? []), ...(ed.participants ?? []).map((x) => x.id)].filter((x) => x && P[x]);
    const rows = t.rows.slice(1).map((r) => ({ r, w: parseName(r[ni] || r[ni + 1] || '') })).filter((x) => x.w.n && x.w.n.length > 2 && !/^\d+$/.test(x.w.n) && !/^(aspirantes|invitados|participantes|concursantes|\d+ anos?)/.test(x.w.n) && !/ anos$/.test(x.w.n));
    const usedId = new Set(), usedRow = new Set(), pairs = [];
    for (const x of rows) { const m = MANUAL[x.w.n]; if (!m) continue; const want = m.replace(/^=/, ''); const id = ids.find((i) => P[i].name === want && !usedId.has(i)); if (id) { usedId.add(id); usedRow.add(x); pairs.push({ x, id, force: !m.startsWith('=') }); } }
    const cands = [];
    for (const x of rows) for (const id of ids) { if (usedId.has(id) || usedRow.has(x)) continue; const s = fits(id, x.w); if (s) cands.push({ x, id, s }); }
    cands.sort((a, b) => b.s - a.s);
    for (const c of cands) {
      if (usedId.has(c.id) || usedRow.has(c.x)) continue;
      if (c.s === 1) { // ambiguo si hay otro candidato de igual puntuación para la misma ficha o fila
        const amb = cands.some((d) => d !== c && d.s === 1 && !usedId.has(d.id) && !usedRow.has(d.x) && (d.id === c.id || d.x === c.x));
        if (amb) continue;
      }
      usedId.add(c.id); usedRow.add(c.x); pairs.push(c);
    }
    for (const { x, id, force } of pairs) {
      stats.matched++;
      const p = P[id], w = x.w;
      if (force || (norm(p.name).split(' ').length === 1 && w.n.split(' ').length > 1)) { p.name = w.nick && norm(w.nick) !== norm(w.full) && !/^[A-Z]/.test(w.nick) ? `${w.full} «${w.nick}»` : w.full; stats.names++; }
      const o = oi >= 0 ? clean(x.r[oi] ?? '') : '', j = ji >= 0 ? clean(x.r[ji] ?? '') : '';
      if (!p.origin && o && !/^(España|Desconocido)$/i.test(o) && !/^\d/.test(o)) { p.origin = o; stats.origin++; }
      if (!p.job && j && !/^\d/.test(j) && j.length < 90 && !/^(Participante|Concursante|Ganador|Ganadora)/i.test(j) && !/acusad|condenad|amante|c[aá]rcel|prisi[oó]n|delito/i.test(j)) { p.job = j; stats.job++; }
    }
    const miss = rows.filter((x) => !usedRow.has(x));
    if (ADD) {
      const ri = H.findIndex((h, i) => i > ni && /Informaci|Resultado|Clasific|Posici/.test(h));
      for (const x of miss) {
        const o = oi >= 0 ? clean(x.r[oi] ?? '') : '', j = ji >= 0 ? clean(x.r[ji] ?? '') : '';
        const role = (ri >= 0 ? clean(x.r[ri] ?? '') : '') || 'Concursante';
        let id = slug(x.w.full);
        if (P[id] && norm(P[id].name) !== x.w.n) id = `${id}-${rid.split('-').map((w) => w[0]).join('')}-${ed.number}`;
        if (!P[id]) { P[id] = { name: x.w.nick && /^[A-ZÁÉÍÓÚ]/.test(x.w.nick) ? `${x.w.full} «${x.w.nick}»` : x.w.full }; if (o && !/^(España|Desconocido)$/i.test(o) && !/^\d/.test(o)) P[id].origin = o; if (j && !/^\d/.test(j) && j.length < 90) P[id].job = j; }
        if (ids.includes(id) || ed.winner === id || (ed.finalists ?? []).includes(id)) continue;
        (ed.participants ??= []).push({ id, role: role.slice(0, 60) }); stats.added++; changed = true;
      }
    }
    stats.wikiOnly += miss.length;
    (report.wikiOnly ??= []).push(`${rid} ed${ed.number}(${ed.year}): ${miss.map((x) => x.w.full).join(', ')}`);
    const left = ids.filter((id) => !usedId.has(id));
    if (left.length) (report.oursOnly ??= []).push(`${rid} ed${ed.number}(${ed.year}): ${left.map((id) => P[id].name).join(', ')}`);
  }
  if (changed && !DRY) writeFileSync(RF, JSON.stringify(R, null, 2) + '\n');
}
console.log(stats);
if (process.argv.includes('--report')) for (const k of Object.keys(report)) console.log('##', k, '\n' + report[k].join('\n'));
if (!DRY) writeFileSync(PF, JSON.stringify(PD, null, 2) + '\n');
