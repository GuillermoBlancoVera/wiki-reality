#!/usr/bin/env python3
"""Importa realities nuevos desde data/raw/shows-*.json (datos extraídos de Wikipedia) y separa GH VIP y GH Dúo."""
import json, re, unicodedata, os
ROOT = os.path.join(os.path.dirname(__file__), '..', 'data')
def slug(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def load(p): return json.load(open(os.path.join(ROOT, p)))
def save(p, d): open(os.path.join(ROOT, p), 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
pd = load('people.json'); P = pd['people']
A = {x['show']: x for x in load('raw/shows-a.json')}
B = {x['show']: x for x in load('raw/shows-b.json')}

ALIAS = {'agoney': 'agoney-hernandez', 'nia': 'nia-correia', 'raoul-ot-9': 'raoul-vazquez', 'mimi-ot-9': 'mimi-doblas', 'nerea-ot-9': 'nerea-rodriguez',
         'javian-ot-1': 'javian-anton', 'terelu': 'terelu-campos', 'raquel-sanchez-silva': 'raquel-sanchez-silva', 'florentino-fernandez-flo': 'florentino-fernandez',
         'nandez-ot-2': 'miguel-nandez', 'jefferson-ot-8': 'mario-jefferson', 'silvia-ot-7': 'sylvia-parejo', 'cepeda-ot-9': 'luis-cepeda', 'quique-jimenez-torito': 'torito',
         'manuel-diaz-el-cordobes': 'manuel-diaz-el-cordobes', 'pedro-perico-delgado': 'perico-delgado'}
NAMEFIX = {'luis-cepeda': 'Luis Cepeda', 'torito': 'Quique Jiménez «Torito»', 'florentino-fernandez': 'Florentino Fernández', 'perico-delgado': 'Pedro «Perico» Delgado', 'manuel-diaz-el-cordobes': 'Manuel Díaz «El Cordobés»'}
STAGE_OK = {'tcms', 'mcc'}  # en estos programas un nombre de una palabra es nombre artístico
merged = []
def pid(name, tag, stage):
    name = name.strip().replace('"', '')
    base = slug(name)
    i = base if (' ' in name or stage) else f'{base}-{tag}'
    i = ALIAS.get(i, ALIAS.get(f'{base}-{tag}', i))
    if i not in P: P[i] = {'name': NAMEFIX.get(i, name)}
    elif ' ' in name or stage: merged.append(f'{name} -> {i}')
    return i

def build(show, rid, tag, stage=False, years=None, presenters=None, top=None, drop_first_finalist=False):
    eds = []
    for s in show['seasons']:
        if not s.get('contestants') and not s.get('winner'): continue
        n = s['number']; t = f'{tag}-{n}'
        e = {'number': n, 'title': re.sub(r' \(table \d+\)', '', s['title']) if s['title'] else f'Temporada {n}', 'year': s.get('year') or (years or {}).get(n)}
        pres = (presenters or {}).get(n, s.get('presenter'))
        if pres: e['presenter'] = pres
        used = []
        w = s.get('winner')
        if w and '/' in w and 'both' in w:  # dos ganadores
            names = [x.strip() for x in w.split('(')[0].split('/')]
            e['winner'] = pid(names[0], t, stage); used.append(e['winner'])
            e['notes'] = f'Edición con dos ganadores: {names[0]} y {names[1]}.'
            e['coWinner'] = pid(names[1], t, stage); used.append(e['coWinner'])
        elif w and 'tie' not in w:
            e['winner'] = pid(w, t, stage); used.append(e['winner'])
        elif w:
            e['notes'] = 'Final con triple empate entre tres parejas: Ángel Santiago y Gabriela Fdez. de Bobadilla, Javi Ramón y Paula Di Martino, y Rubén Correia e Isa Bermejo.'
        fin = list(s.get('finalists') or [])
        if drop_first_finalist and fin: fin = fin[1:]
        if top: fin = fin[:top]
        e['finalists'] = [pid(x, t, stage) for x in fin]; used += e['finalists']
        if not e.get('winner'): e.pop('finalists')
        rest = []
        for c in s.get('contestants') or []:
            i = pid(c, t, stage)
            if i not in used and i not in rest: rest.append(i)
        if 'coWinner' in e: rest.insert(0, e.pop('coWinner'))
        if not e.get('winner') and s.get('finalists'): pass
        e['participants'] = [{'id': i, 'role': 'Ganador (ex aequo)' if (k == 0 and 'dos ganadores' in e.get('notes', '')) else 'Concursante'} for k, i in enumerate(rest)]
        eds.append(e)
    return eds

def reality(rid, name, short, tagline, desc, channel, since, theme, query, sources, editions, notes=None, extra=None):
    r = {'id': rid, 'name': name, 'short': short, 'tagline': tagline, 'description': desc, 'channel': channel, 'since': since, 'theme': theme,
         'newsQuery': query, 'sources': sources, 'editions': editions}
    if notes: r['notes'] = notes
    if extra: r.update(extra)
    save(f'realities/{rid}.json', r)

tc = A['Tu cara me suena']
reality('tu-cara-me-suena', 'Tu cara me suena', 'Tu cara me suena', 'Famosos que imitan a sus ídolos musicales', 'Concurso de imitaciones en el que un grupo de famosos se transforma cada semana en un artista distinto y un jurado puntúa sus actuaciones. Gana quien acumula más puntos y vence en la final.', 'Antena 3', 2011, 'tcms', '"Tu cara me suena" Antena 3', [tc['source_url']], build(tc, 'tu-cara-me-suena', 'tcms', stage=True))
ot = A['Operación Triunfo']
reality('operacion-triunfo', 'Operación Triunfo', 'OT', 'La academia musical más famosa de la televisión', 'Concurso de talentos en el que un grupo de jóvenes cantantes convive en una academia, recibe formación musical y actúa cada semana en una gala. El público elige a los favoritos y al ganador.', 'La 1 (2001-2004, 2017-2020), Telecinco (2005-2011) y Prime Video (desde 2023)', 2001, 'ot', '"Operación Triunfo" OT', [ot['source_url']], build(ot, 'operacion-triunfo', 'ot'), 'Muchos concursantes figuran solo con su nombre de pila, como en la fuente.')
mc = A['MasterChef Celebrity']
reality('masterchef-celebrity', 'MasterChef Celebrity', 'MasterChef Celebrity', 'Famosos entre fogones', 'Versión con famosos del concurso de cocina MasterChef. Los concursantes se enfrentan a pruebas de cocina individuales y por equipos, y un jurado de chefs decide quién abandona cada semana.', 'La 1', 2016, 'masterchef', '"MasterChef Celebrity"', [mc['source_url']],
        build(mc, 'masterchef-celebrity', 'mcc', stage=True, years={n: 2015 + n for n in range(1, 11)}, presenters={n: 'Eva González' for n in range(1, 5)}), 'La fuente no indica el año de las temporadas 2 a 10; se han numerado por orden, una por año desde 2016.')
ms = A['Maestros de la costura']
reality('maestros-de-la-costura', 'Maestros de la costura', 'Maestros de la costura', 'El concurso de costura de TVE', 'Concurso de talentos de costura en el que aprendices de modista superan pruebas de confección valoradas por un jurado de diseñadores.', 'La 1', 2018, 'costura', '"Maestros de la costura"', [ms['source_url']], build(ms, 'maestros-de-la-costura', 'costura'), 'Muchos concursantes figuran solo con su nombre de pila, como en la fuente.')
pp = B['Pesadilla en El Paraíso']
pes = build(pp, 'pesadilla-en-el-paraiso', 'pesadilla', drop_first_finalist=True)
for e in pes:
    if e['number'] <= 3: e['group'] = 'Formatos anteriores (La Granja y Acorralados)'
    e['presenter'] = re.sub(r'\s*\(un debate[^)]*\)', '', e.get('presenter', ''))
reality('pesadilla-en-el-paraiso', 'Pesadilla en El Paraíso', 'Pesadilla', 'Famosos trabajando en una granja', 'Reality de convivencia en el que un grupo de famosos vive en una granja, sin comodidades, y se ocupa de los animales y las tareas del campo. Adaptación del formato The Farm, emitido antes en España como La Granja y Acorralados.', 'Telecinco (antes Antena 3 como La Granja)', 2004, 'pesadilla', '"Pesadilla en El Paraíso"', [pp['source_url']], pes, 'La mayoría de concursantes figura solo con su nombre de pila, como en la fuente.')
fa = B['Falso amor (Deep Fake Love)']
reality('falso-amor', 'Falso amor', 'Falso amor', 'Parejas a prueba con vídeos manipulados', 'Reality de Netflix en el que cinco parejas se separan en dos casas con solteros y ven vídeos de sus parejas sin saber si son reales o falsificados con inteligencia artificial.', 'Netflix', 2023, 'falsoamor', '"Falso amor" Netflix reality', [fa['source_url']], build(fa, 'falso-amor', 'falso-amor'))
my = B['Mujeres y hombres y viceversa']
reality('mujeres-y-hombres-y-viceversa', 'Mujeres y hombres y viceversa', 'MyHyV', 'Tronistas y pretendientes en busca de pareja', 'Programa de citas, adaptación del italiano Uomini e donne, en el que una persona (tronista) ocupa un trono y es cortejada por sus pretendientes. Tras varias citas, elige a uno de los finalistas como pareja.', 'Telecinco (2008-2018) y Cuatro (2018-2021)', 2008, 'myhyv', '"Mujeres y hombres y viceversa"', [my['source_url']], [],
        'Programa diario sin ediciones cerradas. Tronistas y pretendientes pendientes de completar.', {'until': 2021, 'presentersText': 'Emma García (2008-2018), Toñi Moreno (desde 2018), Nagore Robles (sustituciones) y Jesús Vázquez (2020-2021)', 'presenters': ['Emma García', 'Toñi Moreno', 'Nagore Robles', 'Jesús Vázquez']})
reality('first-dates', 'First Dates', 'First Dates', 'Citas a ciegas en un restaurante', 'Programa de citas en el que dos personas que no se conocen cenan juntas en un restaurante y al final deciden si quieren una segunda cita.', 'Cuatro', 2016, 'firstdates', '"First Dates" Cuatro', [], [], 'Programa diario sin ediciones cerradas. Datos básicos sin fuente enlazada todavía; equipo y especiales pendientes de completar.', {'presentersText': 'Carlos Sobera', 'presenters': ['Carlos Sobera']})
reality('love-island-espana', 'Love Island España', 'Love Island', 'Solteros en una villa en busca del amor', 'Adaptación española del formato británico Love Island, en la que un grupo de solteros convive en una villa, forma parejas y la audiencia vota a su favorita.', 'Neox y Atresplayer', 2021, 'loveisland', '"Love Island España"', [], [], 'Ediciones, parejas ganadoras y participantes pendientes de completar.', {'presentersText': 'Cristina Pedroche', 'presenters': ['Cristina Pedroche']})
reality('amor-con-fianza', 'Amor con fianza', 'Amor con fianza', 'Parejas ante el detector de mentiras', 'Reality de Netflix en el que varias parejas se someten a un detector de mentiras que analiza sus respuestas. Cada mentira resta dinero del premio final.', 'Netflix', 2021, 'amorfianza', '"Amor con fianza" Netflix', [], [], 'Ediciones y parejas pendientes de completar.', {'presentersText': 'Mónica Naranjo', 'presenters': ['Mónica Naranjo']})
cq = B['El conquistador del fin del mundo']
reality('el-conquistador', 'El conquistador', 'El conquistador', 'Aventura extrema en parajes remotos', 'Concurso de aventura y supervivencia de la televisión vasca en el que varios equipos compiten en pruebas físicas en entornos naturales extremos. Conocido como El conquistador del fin del mundo; en 2023 TVE emitió su propia edición.', 'ETB2 (y La 1 en 2023)', 2005, 'conquistador', '"El conquistador" ETB reality', [cq['source_url']], [], 'Ediciones y ganadores pendientes de completar.', {'presentersText': 'Julian Iantzi (hasta 2023)', 'presenters': ['Julian Iantzi']})
reality('bailando-con-las-estrellas', 'Bailando con las estrellas', 'Bailando', 'Famosos y bailarines profesionales en la pista', 'Concurso de baile en el que cada famoso forma pareja con un bailarín profesional y compite cada semana ante un jurado y el público. Adaptación del formato Strictly Come Dancing.', 'La 1 (2018) y Telecinco (2024)', 2018, 'bailando', '"Bailando con las estrellas"', [], [], 'Ediciones, parejas y ganadores pendientes de completar: aún no he encontrado una fuente que pueda leer.')

# GH VIP y GH Dúo como realities propios
gh = load('realities/gran-hermano.json')
def split(group, rid, name, short, tagline, desc, since, theme, query):
    eds = [e for e in gh['editions'] if e.get('group') == group]
    if not eds: return
    gh['editions'] = [e for e in gh['editions'] if e.get('group') != group]
    for e in eds: e.pop('group', None); e.pop('slug', None); e.pop('badge', None)
    reality(rid, name, short, tagline, desc, 'Telecinco', since, theme, query, gh.get('sources', []), eds)
split('Gran Hermano VIP', 'gran-hermano-vip', 'Gran Hermano VIP', 'GH VIP', 'La casa de Gran Hermano, con famosos', 'Versión de Gran Hermano en la que los concursantes son personas conocidas. Conviven aislados en una casa vigilada por cámaras, se nominan cada semana y la audiencia decide las expulsiones.', 2004, 'gh-vip', '"GH VIP" OR "Gran Hermano VIP"')
split('Gran Hermano Dúo', 'gran-hermano-duo', 'Gran Hermano Dúo', 'GH Dúo', 'Famosos que entran por parejas', 'Versión de Gran Hermano en la que famosos entran en la casa por parejas con algún vínculo entre sí: parejas, exparejas, familiares o amigos.', 2019, 'gh-duo', '"GH Dúo" OR "Gran Hermano Dúo"')
save('realities/gran-hermano.json', gh)

# Presentadores con ficha
names = set()
for f in os.listdir(os.path.join(ROOT, 'realities')):
    r = load(f'realities/{f}')
    for n in r.get('presenters', []): names.add(n)
    for e in r['editions']:
        for n in re.split(r'\s+y\s+|[,;]\s*', re.sub(r'\([^)]*\)', '', e.get('presenter') or '')):
            if n.strip(): names.add(n.strip())
for n in names:
    P.setdefault(slug(n), {'name': n})
save('people.json', pd)
print(len(P), 'personas'); print('Unificadas con fichas existentes:', len(merged)); print(sorted(set(merged)))
