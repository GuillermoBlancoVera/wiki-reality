# Pasar la web a Cloudflare Pages con el repositorio privado

La web se genera en GitHub Actions (`.github/workflows/deploy.yml`) y hoy se publica en GitHub Pages.
El mismo workflow ya sabe publicar en Cloudflare Pages: basta con definir una variable y dos secretos.
Hazlo en este orden para que la web no se caiga.

1. **Cloudflare**: crea la cuenta (plan gratuito) y, en *Workers & Pages → Create → Pages → Direct Upload*,
   crea un proyecto (por ejemplo `wiki-reality`). Sube cualquier carpeta vacía si lo pide; el contenido real
   lo sube Actions.
2. **Token**: en *My Profile → API Tokens → Create Token → Custom*, permiso `Account · Cloudflare Pages · Edit`.
   Copia el token y el *Account ID* (aparece en la página de inicio de Workers & Pages).
3. **GitHub** (*Settings → Secrets and variables → Actions*):
   - Secretos: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
   - Variables: `CF_PAGES_PROJECT` = nombre del proyecto; `SITE_URL` = `https://<proyecto>.pages.dev`
     (o el dominio propio cuando lo tengas, sin barra final).
4. Lanza a mano el workflow **Actualizar noticias y publicar** y comprueba que la web abre en `SITE_URL`.
5. Solo entonces: *Settings → General → Change visibility → Private*. GitHub Pages deja de servir la web
   antigua; desactívalo en *Settings → Pages*.

Notas:
- Con el repo privado, Actions gratis da 2.000 minutos al mes; la actualización diaria gasta unos 10.
- La web publicada no contiene los JSON de `data/`: solo páginas ya montadas y un índice mínimo del buscador.
- `robots.txt` bloquea robots de copia masiva y de IA y deja pasar a los buscadores. En Cloudflare conviene
  activar además *Security → Bots → Bot Fight Mode* y *Block AI bots*, y una regla de *Rate limiting*
  (por ejemplo, 120 peticiones por minuto por IP), que es lo que de verdad frena una descarga masiva.
