# Wiki Reality

La enciclopedia de los realities de España: ediciones, ganadores, parejas y el recorrido de cada persona por los programas.

Web 100 % estática, sin base de datos. Todo el contenido vive en ficheros JSON dentro de `data/` y un script genera las páginas.

## Cómo está organizado

```
data/
  site.json                 Nombre, lema, email de contacto y orden de los realities
  realities/<id>.json       Un fichero por reality: ediciones, ganadores, finalistas, parejas…
  people.json               Fichas de persona (nombre, origen, redes, apariciones extra)
  news.json                 Titulares (lo actualiza la automatización diaria)
scripts/
  build.mjs                 Genera la web en dist/
  update-news.mjs           Descarga titulares nuevos de Google News
src/assets/                 CSS (diseño común + diseño propio de cada reality) y buscador
.github/workflows/deploy.yml  Publica en GitHub Pages en cada push y cada día a las 06:00 UTC
```

## Añadir contenido

- **Nueva edición**: añádela al array `editions` del reality. Campos: `number`, `title`, `year`, `dates`, `presenter`, `days`, `winner`, `finalists`, `couples` (`a`, `b`, `tempters`, `outcome`), `participants` (`id`, `role`, `eliminatedOrder`), `notes`.
- **Nueva persona**: añádela a `data/people.json` con su id (`nombre-apellido`). La ficha muestra automáticamente su paso por todos los realities en los que aparezca su id.
- **Nuevo reality**: crea `data/realities/<id>.json`, añade su id a `realitiesOrder` en `site.json` y, si quieres diseño propio, un tema `.theme-<theme>` en `src/assets/styles.css` y su carátula en `posterArt` de `scripts/build.mjs`.

## Reglas de contenido (legal)

- Solo hechos públicos sobre el paso por los programas, sin opinión.
- Sin fotos de las cadenas ni copiadas de redes.
- Noticias: solo titular enlazado; nunca se asocian automáticamente a una ficha personal.
- «En la actualidad» (`now`): solo lo que la persona cuenta en sus redes públicas.
- Atender rápido las solicitudes de retirada (configura `contactEmail` en `site.json`).

## En local

```
BASE_PATH= node scripts/build.mjs
cd dist && python3 -m http.server 8000
```

Con dominio propio: crea las variables del repositorio `BASE_PATH` (vacía) y `SITE_URL` (`https://tudominio.es`) en Settings → Secrets and variables → Actions → Variables.
