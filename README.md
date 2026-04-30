# Amazon Price Tracker

Tracker de precios de Amazon con:

- scraping (vía Decodo API o modo manual),
- persistencia en Turso (libSQL),
- dashboard web en Astro para visualizar evolución de precios,
- workflow de GitHub Actions para ejecuciones automáticas.

## Requisitos

- Node.js >= 22.12.0
- pnpm
- Base de datos Turso creada (URL + auth token)
- Token de Decodo para el scraping por API

## Instalación

```bash
pnpm install
```

## Configuración

1. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

2. Rellena variables en `.env`:

```env
DECODO_AUTH_TOKEN=tu_token

TURSO_DATABASE_URL=tu_database_url
TURSO_AUTH_TOKEN=tu_auth_token

AMAZON_ASINS=B0XXXXXXXX,B0YYYYYYYY
AMAZON_STORE=es
```

Notas:

- `AMAZON_ASINS` acepta una lista separada por comas.
- `AMAZON_STORE` define el dominio (`es` -> `amazon.es`, `com` -> `amazon.com`, etc.).

## Uso

### 1) Ejecutar tracking por API (recomendado)

```bash
pnpm track
```

Esto:

- inicializa la tabla `price_snapshots` si no existe,
- scrapea cada ASIN,
- guarda un snapshot por producto en Turso.

### 2) Ejecutar scraping manual (sin API de Decodo)

```bash
pnpm track:manual
```

Este modo hace fetch directo contra Amazon y puede fallar por CAPTCHA o bloqueo.

### 2.1) Ejecutar scraping manual usando Proxy + Decodo

```bash
pnpm track:manual:proxy
```

Este modo reutiliza el scraper por API (Decodo) y muestra logs manuales por ASIN indicando que la solicitud se realiza por proxy.

### 3) Ver dashboard local

```bash
pnpm dev
```

Abre la URL que muestra Astro (normalmente `http://localhost:4321`) para ver:

- tarjetas por producto,
- precio actual y variación,
- histórico de precios con gráfico.

## Scripts

- `pnpm dev`: arranca la app en desarrollo
- `pnpm build`: build de producción
- `pnpm preview`: sirve el build local
- `pnpm track`: ejecuta scraper API + persistencia
- `pnpm track:manual`: ejecuta scraper manual + persistencia
- `pnpm track:manual:proxy`: ejecuta scraper manual de consola usando Decodo (proxy)

## Automatización con GitHub Actions

Existe un workflow en `.github/workflows/track-amazon-prices.yml` que se ejecuta:

- cada día a las 07:00 UTC,
- y manualmente con `workflow_dispatch`.

Debes configurar estos secretos en GitHub:

- `DECODO_AUTH_TOKEN`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `AMAZON_ASINS`

## Estructura del proyecto

```text
src/
  db/
    client.ts      # cliente Turso
    schema.ts      # creación de tabla e índice
    queries.ts     # inserts y consultas
  tracker/
    index.ts       # entrypoint del tracking por API
    scraper.ts     # scraping con Decodo
    manual-scraper.ts
    utils.ts
    types.ts
  pages/
    index.astro    # dashboard
```

## Cambiar proveedor de scraping

La parte intercambiable está en `src/tracker/scraper.ts`.

Mientras `scrapeProduct(asin)` devuelva la estructura `ProductSnapshot`, el resto del sistema no necesita cambios.

## Consideraciones

- El HTML y las estructuras de Amazon pueden cambiar sin previo aviso.
- Respeta términos de uso y límites del proveedor de scraping.
- Este proyecto está orientado a aprendizaje y monitorización técnica.