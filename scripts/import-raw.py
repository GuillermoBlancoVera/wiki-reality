# Importa data/raw/*.json (concursantes y orden de salida sacados de Wikipedia) a data/realities/*.json
import json, re, unicodedata, glob, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
P = 'data/people.json'; pj = json.load(open(P)); people = pj['people']
def slug(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
STAGE = {'Rappel','Fortu','Yurena','Ferre','Steisy','Keroseno','Finito','Joselito','Montalvo','Parri','Arkano','Luitingo','Verdeliss','El Koala','El Cejas','Maestro Joao','El Dioni','La Pelopony'}
ALIAS = {'marieta-sola': 'marieta-diaz', 'alex-guita': 'alex-ghita'}
def pid(name, tag):
    name = name.strip()
    if ' ' in name or name in STAGE:
        i = slug(name)
    else:
        i = f'{slug(name)}-{tag}'
    i = ALIAS.get(i, i)
    people.setdefault(i, {'name': name})
    return i
def role(st):
    m = re.match(r'(Evicted|Eliminated|Walked|Left|Ejected|Re-evicted|Evacuated)(?: Day (\d+))?(.*)', st)
    if not m:
        return {'Runner-up': '2º puesto', 'Third place': '3er puesto', 'Fourth place': '4º puesto', '+1 Winner': 'Ganador/a de la fase «+1»', '+1 Runner-up': '2º puesto de la fase «+1»', '+1 Third place': '3er puesto de la fase «+1»', '+1 Fourth place': '4º puesto de la fase «+1»'}.get(st, st)
    kind, day, rest = m.groups()
    base = {'Evicted': 'Expulsado/a', 'Eliminated': 'Expulsado/a', 'Walked': 'Abandonó', 'Left': 'Abandonó', 'Ejected': 'Expulsado/a por la organización', 'Re-evicted': 'Expulsado/a por segunda vez', 'Evacuated': 'Evacuado/a'}[kind]
    return base + (f' (día {day})' if day else '') + rest
files = {'gh': 'data/realities/gran-hermano.json', 'sv': 'data/realities/supervivientes.json'}
docs = {k: json.load(open(v)) for k, v in files.items()}
def find(key):
    kind, n = key.rsplit('-', 1)
    if kind in ('gh', 'vip', 'duo'):
        r = docs['gh']
        for e in r['editions']:
            if kind == 'gh' and 'slug' not in e and e['number'] == int(n): return r, e
            if kind != 'gh' and e.get('slug') == key: return r, e
    if kind == 'sv':
        r = docs['sv']
        for e in r['editions']:
            if 'slug' not in e and e['number'] == int(n): return r, e
    raise KeyError(key)
for f in sorted(glob.glob('data/raw/*.json')):
    for key, d in json.load(open(f)).items():
        r, e = find(key)
        tag = key
        h = d['h']
        if d['source'] not in r['sources']: r['sources'].append(d['source'])
        e.setdefault('dates', d['dates'])
        ranks = [x for x in h if x[1] in ('Winner', 'Runner-up', 'Third place')]
        if not e.get('winner'): e['winner'] = pid(ranks[0][0], tag)
        top = [pid(x[0], tag) if i >= 1 + len(e.get('finalists', [])) else None for i, x in enumerate(ranks)]
        fins = e.get('finalists', [])
        for i, x in enumerate(ranks[1:], start=1):
            if i > len(fins): fins.append(pid(x[0], tag))
        if fins: e['finalists'] = fins
        e['participants'] = [{'id': pid(n, tag), 'role': role(st), 'eliminatedOrder': i + 1}
                             for i, (n, st) in enumerate(h) if st not in ('Winner', 'Runner-up', 'Third place')]
# Supervivientes 2026: finalistas y concursantes (sin orden completo)
r = docs['sv']
e26 = next(e for e in r['editions'] if e['title'] == 'Supervivientes 2026')
e26['finalists'] = [pid('Alba Paul', 'sv-21'), pid('Alvar Seguí', 'sv-21')]
rest = ['Teresa Seco','Álex Ghita','Jaime Astrain','Toni Elías','Aratz Lakuntza','Ingrid Betancor','Ivonne Reyes','Marisa Jara','Gerard Arias','Paola Olmedo','Gabriela Guillén','Alberto Ávila','Claudia Chacón','Álex de la Croix']
e26['participants'] = [{'id': pid('José Manuel Soto', 'sv-21'), 'role': '4º puesto', 'eliminatedOrder': 4}] + [{'id': pid(n, 'sv-21'), 'role': 'Concursante'} for n in rest]
e26['notes'] = 'Orden de expulsión del resto de concursantes pendiente de completar.'
for s in ['https://www.sensacine.com/television/noticias/noticia-1000208418.html', 'https://www.hola.com/actualidad/20260217884275/supervivientes-concursantes-confirmados/']:
    if s not in r['sources']: r['sources'].append(s)
for k, v in files.items(): json.dump(docs[k], open(v, 'w'), ensure_ascii=False, indent=2)
json.dump(pj, open(P, 'w'), ensure_ascii=False, indent=2)
