// Carátulas e identidad visual de cada reality.
// Son ilustraciones propias (SVG) con fondos y tipografías libres (Google Fonts, licencia OFL)
// que evocan el ambiente de cada programa. No se usan logotipos, marcas ni imágenes oficiales.
const svg = (inner) => `<svg viewBox="0 0 200 267" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`;
const stars = (pts, fill = '#fff', r = 1.2) => pts.map(([x, y, s = 1]) => `<circle cx="${x}" cy="${y}" r="${r * s}" fill="${fill}"/>`).join('');
const star5 = (cx, cy, R, fill) => {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? R * 0.42 : R; p.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(' ')}" fill="${fill}"/>`;
};
const heart = (x, y, s, fill, extra = '') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 8 C-14 -4 -26 -14 -26 -26 C-26 -36 -18 -42 -11 -42 C-6 -42 -2 -39 0 -35 C2 -39 6 -42 11 -42 C18 -42 26 -36 26 -26 C26 -14 14 -4 0 8Z" fill="${fill}" ${extra}/>`;
const palm = (x, y, s, c = '#141018') => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${c}" stroke-linecap="round"><path d="M0 0 C3 -30 6 -55 14 -80" stroke-width="6"/><path d="M14 -80 c-22 -8 -38 0 -46 14 M14 -80 c-10 -22 -28 -28 -42 -24 M14 -80 c4 -24 20 -32 34 -30 M14 -80 c20 -14 38 -10 48 2 M14 -80 c22 2 34 14 38 28" stroke-width="5"/></g>`;
const eye = (cx, cy, s, ring, iris, pupil = '#05070f') => `<g transform="translate(${cx} ${cy}) scale(${s})"><path d="M-70 0 C-40 -38 40 -38 70 0 C40 38 -40 38 -70 0Z" fill="none" stroke="${ring}" stroke-width="5"/><circle r="26" fill="${iris}"/><circle r="12" fill="${pupil}"/><circle cx="8" cy="-8" r="5" fill="#fff"/></g>`;
const rays = (cx, cy, n, len, color, op = 0.18) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; const b = a + Math.PI / n / 1.6; return `<polygon points="${cx},${cy} ${(cx + len * Math.cos(a)).toFixed(0)},${(cy + len * Math.sin(a)).toFixed(0)} ${(cx + len * Math.cos(b)).toFixed(0)},${(cy + len * Math.sin(b)).toFixed(0)}" fill="${color}" opacity="${op}"/>`; }).join('');

export const designs = {
  isla: {
    font: 'Pacifico', title: 'font-size:1.55rem;font-weight:400;line-height:1.15',
    bg: 'linear-gradient(180deg,#3b1d5e 0%,#c2327a 32%,#ff7a3d 58%,#ffc15e 70%,#0d7c8c 71%,#06414f 100%)', fg: '#fff',
    art: svg(`<circle cx="100" cy="176" r="46" fill="#ffe08a" opacity=".95"/><rect y="188" width="200" height="80" fill="#0b6877"/><path d="M60 196h80M74 206h52M86 216h28" stroke="#ffd27a" stroke-width="3" stroke-linecap="round" opacity=".7"/>${palm(18, 250, 1.25)}${palm(182, 262, -1.05).replace('scale(-1.05)', 'scale(-1.05 1.05)')}${stars([[30, 24], [70, 14, 0.8], [120, 30], [165, 18, 0.9], [150, 52, 0.7], [44, 58, 0.7]], '#fff', 1.3)}`),
  },
  gh: {
    font: 'Bebas Neue', title: 'font-size:2rem;letter-spacing:.04em;line-height:1',
    bg: 'radial-gradient(120% 80% at 50% 38%,#2f6bff 0%,#12339c 45%,#050b2e 100%)', fg: '#fff',
    art: svg(`${rays(100, 104, 14, 260, '#7fb0ff', 0.13)}${eye(100, 104, 1.05, '#fff', '#39a0ff')}`),
  },
  'gh-vip': {
    font: 'Bebas Neue', title: 'font-size:2rem;letter-spacing:.04em;line-height:1;color:#ffd978',
    bg: 'radial-gradient(120% 80% at 50% 36%,#4a3a12 0%,#17130a 55%,#000 100%)', fg: '#fff',
    art: svg(`${rays(100, 104, 16, 260, '#ffd978', 0.1)}${eye(100, 104, 1.05, '#ffd978', '#c8962a')}${star5(100, 34, 12, '#ffd978')}${star5(66, 46, 7, '#ffd978')}${star5(134, 46, 7, '#ffd978')}`),
  },
  'gh-duo': {
    font: 'Bebas Neue', title: 'font-size:2rem;letter-spacing:.04em;line-height:1',
    bg: 'linear-gradient(115deg,#e0218a 0%,#e0218a 49.6%,#1b45d6 50.4%,#1b45d6 100%)', fg: '#fff',
    art: svg(`${eye(64, 96, 0.62, '#fff', '#ffd0ea')}${eye(136, 122, 0.62, '#fff', '#bcd3ff')}`),
  },
  superv: {
    font: 'Staatliches', title: 'font-size:1.75rem;letter-spacing:.03em;line-height:1',
    bg: 'linear-gradient(180deg,#f7a531 0%,#e2531f 40%,#7a2a12 62%,#12281a 63%,#07140d 100%)', fg: '#fff',
    art: svg(`<circle cx="100" cy="150" r="52" fill="#ffd36b" opacity=".85"/><path d="M0 172 L34 142 L58 160 L96 124 L132 158 L160 138 L200 170 V267 H0Z" fill="#0c2015"/>${palm(26, 205, 0.9, '#07140d')}<rect x="150" y="150" width="7" height="80" rx="2" fill="#3a2412"/><path d="M153 96 C170 120 176 134 164 152 C172 146 174 136 173 130 C186 148 180 170 153 174 C128 170 124 148 136 132 C136 142 140 148 146 152 C138 132 146 114 153 96Z" fill="#ff8a1f"/><path d="M153 130 C160 142 162 152 153 166 C145 152 148 142 153 130Z" fill="#ffe08a"/>`),
  },
  tcms: {
    font: 'Lilita One', title: 'font-size:1.6rem;line-height:1.05',
    bg: 'radial-gradient(90% 60% at 50% 30%,#ff5fd2 0%,#8a1fd1 45%,#22084a 100%)', fg: '#fff',
    art: svg(`<polygon points="40,0 70,0 130,267 20,267" fill="#fff" opacity=".1"/><polygon points="160,0 130,0 70,267 180,267" fill="#fff" opacity=".1"/><g transform="translate(100 100) rotate(-28)"><rect x="-13" y="-48" width="26" height="52" rx="13" fill="#ffe14d"/><path d="M-13 -22h26M-13 -34h26M-13 -10h26" stroke="#c99a00" stroke-width="2"/><path d="M-20 -6 C-20 14 20 14 20 -6" fill="none" stroke="#fff" stroke-width="4"/><rect x="-4" y="12" width="8" height="52" rx="3" fill="#fff"/></g>${stars([[34, 40, 1.5], [168, 54, 1.8], [150, 150, 1.2], [44, 160, 1.4], [176, 110, 1]], '#ffe14d', 2)}`),
  },
  ot: {
    font: 'Montserrat', title: 'font-size:1.5rem;font-weight:800;text-transform:uppercase;line-height:1.02;letter-spacing:-.01em',
    bg: 'radial-gradient(100% 70% at 50% 35%,#35c6ff 0%,#1458d6 45%,#07123f 100%)', fg: '#fff',
    art: svg(`<polygon points="0,0 30,0 110,267 60,267" fill="#fff" opacity=".1"/><polygon points="200,0 170,0 90,267 140,267" fill="#fff" opacity=".1"/>${star5(100, 98, 54, '#fff')}${star5(100, 98, 30, '#1458d6')}${stars([[30, 60], [170, 44], [156, 168], [40, 178]], '#fff', 2)}`),
  },
  masterchef: {
    font: 'Oswald', title: 'font-size:1.6rem;font-weight:700;text-transform:uppercase;line-height:1.02',
    bg: 'radial-gradient(100% 70% at 50% 36%,#ff9a1f 0%,#d92a12 50%,#3a0906 100%)', fg: '#fff',
    art: svg(`<g transform="translate(100 104)"><path d="M-36 0 C-58 -6 -54 -40 -30 -38 C-28 -62 28 -62 30 -38 C54 -40 58 -6 36 0 V32 H-36Z" fill="#fff"/><rect x="-36" y="38" width="72" height="12" rx="3" fill="#fff"/><path d="M-14 6v22M0 6v22M14 6v22" stroke="#e6d9d0" stroke-width="3"/></g>`),
  },
  bailando: {
    font: 'Playfair Display', title: 'font-size:1.55rem;font-weight:800;font-style:italic;line-height:1.05',
    bg: 'radial-gradient(100% 70% at 50% 34%,#3a3fb8 0%,#161a5c 50%,#05061f 100%)', fg: '#ffe9a8',
    art: svg(`<line x1="100" y1="0" x2="100" y2="52" stroke="#ffe9a8" stroke-width="2"/><circle cx="100" cy="94" r="42" fill="#d8dcf5"/><g stroke="#8087c9" stroke-width="1.5" fill="none"><ellipse cx="100" cy="94" rx="42" ry="14"/><ellipse cx="100" cy="94" rx="42" ry="30"/><ellipse cx="100" cy="94" rx="14" ry="42"/><ellipse cx="100" cy="94" rx="30" ry="42"/></g>${star5(36, 46, 9, '#ffd978')}${star5(168, 60, 11, '#ffd978')}${star5(160, 160, 7, '#ffd978')}${star5(40, 150, 8, '#ffd978')}${stars([[64, 26], [140, 22], [24, 104], [182, 116]], '#fff', 1.6)}`),
  },
  costura: {
    font: 'Playfair Display', title: 'font-size:1.5rem;font-weight:800;line-height:1.05;color:#3a1f2b',
    bg: 'linear-gradient(180deg,#fbe3e6 0%,#f6c9d2 55%,#e9a9b8 100%)', fg: '#3a1f2b',
    art: svg(`<path d="M-10 60 C40 20 70 110 110 70 S170 40 210 90" fill="none" stroke="#c2185b" stroke-width="2.5" stroke-dasharray="7 6"/><g transform="translate(100 104) rotate(35)"><rect x="-2.500" y="-62" width="5" height="120" rx="2.500" fill="#6b6f7a"/><ellipse cx="0" cy="-50" rx="1.600" ry="6" fill="#fbe3e6"/></g><g transform="translate(64 128)"><rect x="-20" y="-16" width="40" height="32" rx="4" fill="#c2185b"/><rect x="-24" y="-22" width="48" height="8" rx="3" fill="#8a5a3c"/><rect x="-24" y="14" width="48" height="8" rx="3" fill="#8a5a3c"/><path d="M-20 -8h40M-20 0h40M-20 8h40" stroke="#e86a9a" stroke-width="2"/></g><g transform="translate(142 140) rotate(-20)" fill="none" stroke="#3a1f2b" stroke-width="4"><circle cx="-10" cy="22" r="9"/><circle cx="10" cy="22" r="9"/><path d="M-6 14 L10 -36M6 14 L-10 -36" stroke-linecap="round"/></g>`),
  },
  pesadilla: {
    font: 'Lilita One', title: 'font-size:1.55rem;line-height:1.05',
    bg: 'linear-gradient(180deg,#6fd0ff 0%,#bdeaff 44%,#7cc043 45%,#3f8a22 100%)', fg: '#fff',
    art: svg(`<circle cx="160" cy="44" r="20" fill="#ffe14d"/><g fill="#fff" opacity=".9"><ellipse cx="46" cy="40" rx="24" ry="9"/><ellipse cx="64" cy="34" rx="16" ry="8"/></g><g transform="translate(100 118)"><path d="M-44 0 L-44 -34 L-26 -58 L26 -58 L44 -34 L44 0Z" fill="#c62828"/><path d="M-50 -32 L-28 -62 L28 -62 L50 -32" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><rect x="-14" y="-28" width="28" height="28" fill="#7f1414" stroke="#fff" stroke-width="3"/><path d="M-14 -28 L14 0M14 -28 L-14 0" stroke="#fff" stroke-width="3"/><rect x="-9" y="-50" width="18" height="12" fill="#fff"/></g><path d="M0 150 h200" stroke="#2f6b18" stroke-width="3"/><g stroke="#f4e9c8" stroke-width="3"><path d="M10 134v22M34 134v22M58 134v22M142 134v22M166 134v22M190 134v22M0 140h66M134 140h66M0 150h66M134 150h66"/></g>`),
  },
  conquistador: {
    font: 'Bebas Neue', title: 'font-size:1.9rem;letter-spacing:.04em;line-height:1',
    bg: 'linear-gradient(180deg,#1c3a5c 0%,#4f89a8 45%,#c5dde6 62%,#1b3d3a 63%,#0c1f1e 100%)', fg: '#fff',
    art: svg(`<path d="M0 168 L40 96 L62 128 L100 60 L138 126 L160 100 L200 168Z" fill="#274a5e"/><path d="M100 60 L84 90 L96 84 L104 96 L116 88Z M40 96 L30 114 L42 110 L50 118Z M160 100 L150 118 L162 114 L170 124Z" fill="#fff"/><rect y="166" width="200" height="101" fill="#12302e"/><g transform="translate(100 40)"><circle r="17" fill="none" stroke="#fff" stroke-width="2.5"/><polygon points="0,-13 4,0 0,13 -4,0" fill="#ff5a36"/><circle r="2" fill="#fff"/></g>`),
  },
  myhyv: {
    font: 'Lobster', title: 'font-size:1.6rem;line-height:1.05',
    bg: 'radial-gradient(100% 70% at 50% 35%,#ff7ab8 0%,#e0125f 50%,#5c0626 100%)', fg: '#fff',
    art: svg(`<g transform="translate(100 112)"><path d="M-30 30 V-34 C-30 -62 30 -62 30 -34 V30Z" fill="#ffd978"/><path d="M-22 26 V-32 C-22 -52 22 -52 22 -32 V26Z" fill="#b3123f"/><rect x="-40" y="4" width="14" height="34" rx="5" fill="#ffd978"/><rect x="26" y="4" width="14" height="34" rx="5" fill="#ffd978"/><rect x="-34" y="26" width="68" height="14" rx="4" fill="#ffd978"/><path d="M-28 40v14M28 40v14" stroke="#ffd978" stroke-width="6" stroke-linecap="round"/></g>${heart(100, 44, 0.42, '#fff')}${heart(40, 78, 0.26, '#fff', 'opacity=".7"')}${heart(164, 92, 0.3, '#fff', 'opacity=".7"')}${heart(150, 34, 0.18, '#fff', 'opacity=".6"')}`),
  },
  firstdates: {
    font: 'Lobster', title: 'font-size:1.7rem;line-height:1.05',
    bg: 'radial-gradient(100% 70% at 50% 34%,#ff4b4b 0%,#c40d2c 55%,#4d0412 100%)', fg: '#fff',
    art: svg(`${heart(100, 132, 1.5, '#fff')}<g stroke="#c40d2c" stroke-width="4" stroke-linecap="round" fill="none"><path d="M82 78v20M76 78v10c0 5 12 5 12 0V78M82 98v26"/><path d="M118 78c8 6 8 22 0 26v20"/></g>${stars([[34, 40], [168, 46], [26, 150], [176, 160]], '#ffd0d0', 2)}`),
  },
  loveisland: {
    font: 'Pacifico', title: 'font-size:1.6rem;font-weight:400;line-height:1.15',
    bg: 'linear-gradient(180deg,#ff3fa4 0%,#ff8a5c 45%,#ffd34d 68%,#19b6c9 69%,#0a6f86 100%)', fg: '#fff',
    art: svg(`${heart(100, 138, 1.45, 'none', 'stroke="#fff" stroke-width="5"')}${heart(100, 132, 1.1, 'none', 'stroke="#fff36b" stroke-width="2.500" opacity=".9"')}${palm(22, 246, 0.9, '#5c0d3c')}<path d="M0 196h200" stroke="#fff" stroke-width="2" opacity=".5"/>`),
  },
  falsoamor: {
    font: 'Bebas Neue', title: 'font-size:2rem;letter-spacing:.05em;line-height:1',
    bg: 'radial-gradient(100% 70% at 50% 35%,#6a2bd9 0%,#2a0f66 50%,#07031a 100%)', fg: '#fff',
    art: svg(`${heart(96, 132, 1.4, '#00e5ff', 'opacity=".75"')}${heart(104, 132, 1.4, '#ff2e88', 'opacity=".75"')}${heart(100, 132, 1.4, '#fff')}<path d="M100 78 L90 98 L106 108 L94 124 L104 140" fill="none" stroke="#2a0f66" stroke-width="4" stroke-linejoin="round"/><g fill="#07031a" opacity=".55"><rect x="40" y="96" width="120" height="4"/><rect x="52" y="116" width="100" height="3"/></g>`),
  },
  amorfianza: {
    font: 'Bebas Neue', title: 'font-size:2rem;letter-spacing:.05em;line-height:1',
    bg: 'radial-gradient(100% 70% at 50% 35%,#b3122f 0%,#4d0716 55%,#0c0205 100%)', fg: '#fff',
    art: svg(`${eye(100, 96, 0.9, '#ffd978', '#fff', '#4d0716')}<path d="M10 160 H56 L66 140 L78 182 L90 128 L102 176 L112 152 L120 160 H190" fill="none" stroke="#ffd978" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`),
  },
  home: { font: 'Fraunces', bg: 'linear-gradient(180deg,#f6ece0,#efe2d1)', fg: '#1f2328', art: '' },
};

// Tipografías de Google Fonts que hay que cargar (además de las de la interfaz)
export const designFonts = [...new Set(Object.values(designs).map((d) => d.font))].filter((f) => !['Fraunces', 'Pacifico'].includes(f));

// CSS de carátulas (y título de la portada de cada reality) generado a partir de los diseños
const pagePalettes = {"gh-vip": ["#a16207", "#1f2937", "#fdf0c4", "#e7e5e4"], "gh-duo": ["#be185d", "#1d4ed8", "#fbd5e8", "#dbe7ff"], "tcms": ["#9333ea", "#db2777", "#f0dcff", "#ffd9ef"], "ot": ["#1458d6", "#0891b2", "#d6e6ff", "#d2f1fb"], "masterchef": ["#d92a12", "#b45309", "#ffe0d2", "#ffedc9"], "bailando": ["#3a3fb8", "#a16207", "#dfe1ff", "#fdf0c4"], "costura": ["#c2185b", "#8a5a3c", "#fbe3e6", "#f6e6da"], "pesadilla": ["#3f8a22", "#c62828", "#dff3d0", "#d9f0ff"], "conquistador": ["#1f6f8b", "#c2410c", "#d5ebf2", "#dfeee9"], "myhyv": ["#e0125f", "#a16207", "#ffdbe9", "#fdf0c4"], "firstdates": ["#c40d2c", "#be185d", "#ffdada", "#ffe3ee"], "loveisland": ["#e11d8f", "#0e8ea3", "#ffd9ee", "#fff0bf"], "falsoamor": ["#6a2bd9", "#db2777", "#e6dcff", "#ffd9ee"], "amorfianza": ["#b3122f", "#a16207", "#ffd9df", "#fdf0c4"]};
export const designCss = Object.entries(pagePalettes).map(([k, [a, a2, ha, hb]]) => `.theme-${k} { --accent: ${a}; --accent-2: ${a2}; --hero-a: ${ha}; --hero-b: ${hb}; }`).join('\n') + Object.entries(designs).filter(([k]) => k !== 'home').map(([k, d]) => `
.poster-${k} { background: ${d.bg}; color: ${d.fg}; }
.poster-${k} .poster-title { font-family: '${d.font}', var(--font-display); ${d.title ?? ''} }
.theme-${k} .reality-hero-art { background: ${d.bg}; }
.theme-${k} .reality-title { font-family: '${d.font}', var(--font-display); }`).join('\n');
