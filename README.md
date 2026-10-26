# Tienda modular

Un solo código para varias tiendas: **Artelicat** (impresión 3D y papelería inspirada en BTS) y **Pochi Craft 3D** (impresión 3D inspirada en Minecraft). Cada tienda tiene su contenido, su tema y su dominio, y todas se administran desde el mismo panel en `/admin`.

Hecho con [Astro](https://astro.build) sobre Cloudflare Workers, base de datos D1 y [Drizzle](https://orm.drizzle.team).

## Desarrollo

Requiere Node 22.12 o superior.

```sh
npm install
cp .dev.vars.example .dev.vars   # define SETUP_TOKEN
npm run db:migrate:local          # crea las tablas en la base local
npm run db:seed:local             # carga Artelicat y Pochi Craft 3D
npm run dev                       # http://localhost:4321
```

- `http://localhost:4321` muestra Artelicat (la tienda por defecto del worker principal).
- `http://localhost:4321/?tienda=pochi-craft-3d` muestra Pochi Craft 3D. La vista previa queda activa hasta que toques «Salir de la vista previa».
- `http://localhost:4321/admin/setup?token=<SETUP_TOKEN>` crea la primera cuenta del panel. Esa pantalla desaparece en cuanto existe una cuenta.

`npm run db:reset:local` borra la base local y la vuelve a crear con el contenido inicial.

## Cómo se decide qué tienda mostrar

1. **Vista previa** `?tienda=<slug>`: solo en desarrollo o con sesión iniciada en el panel.
2. **Dominio**: el hostname se busca en la tabla `store_domains` (se edita en *Ajustes generales → Dominios*).
3. **Tienda por defecto del worker** (`DEFAULT_STORE` en `wrangler.jsonc`).

Sin dominio propio, cada tienda se publica como un worker aparte con su propio subdominio gratuito `*.workers.dev` y ambos comparten la misma base D1. Cuando compres un dominio, agrégalo en el panel y conéctalo al worker en Cloudflare.

## Estructura

```
src/
  modules/
    tiendas/     ajustes de cada tienda, resolución por dominio
    tema/        colores, tipografías y forma por tienda; contraste WCAG
    contenido/   bloques de la página (portada, temporada, secciones…)
                 y sus campos editables (fields.ts)
    medios/      fotos: archivo en R2, datos en la tabla media
  pages/
    index.astro  inicio de la tienda (pinta los bloques de la base)
    admin/       panel: acceso, ajustes, contenido, fotos y tema
    media/       sirve las fotos desde R2
  db/schema.ts   esquema de la base (Drizzle)
  lib/           base de datos y autenticación
  middleware.ts  protege /admin y elige la tienda
db/
  migrations/    migraciones SQL (generadas con drizzle-kit)
  seed-data.ts   contenido inicial de las tiendas
```

Todas las tablas de negocio cuelgan de `store_id`, así una tienda nueva es una fila más y no una copia del código.

## Agregar un tipo de bloque

1. Sus props y su nombre en `src/modules/contenido/blocks.ts`.
2. Su componente en `src/modules/contenido/components/` y su caso en `BlockRenderer.astro`.
3. Sus campos y su contenido de ejemplo en `src/modules/contenido/fields.ts`.

El panel arma el formulario solo a partir de esa lista de campos.

## Fotos

Las fotos se suben en *Fotos* y se eligen en los bloques. Antes de subirlas, el navegador las reduce a 1600 px y las convierte a WebP; el servidor solo acepta JPG, PNG, WebP o AVIF (revisa el contenido real del archivo, no solo su extensión) de hasta 5 MB. Una foto que se usa en algún bloque no se puede borrar.

## Cambiar el esquema

```sh
# 1. edita src/db/schema.ts
npm run db:generate          # crea la migración en db/migrations
npm run db:migrate:local
```

## Publicar en Cloudflare (primera vez)

```sh
npx wrangler login
npx wrangler d1 create tienda-modular
# copia el database_id que imprime en las dos entradas de wrangler.jsonc
# activa R2 en el panel de Cloudflare (Storage & databases → R2) y luego:
npx wrangler r2 bucket create tienda-modular-media
npm run db:migrate:remote
npm run db:seed:remote
npx wrangler secret put SETUP_TOKEN                 # worker de Artelicat
npx wrangler secret put SETUP_TOKEN --env pochi     # worker de Pochi Craft 3D
npm run deploy                                       # publica los dos workers
```

Luego abre `https://artelicat.<tu-subdominio>.workers.dev/admin/setup?token=<SETUP_TOKEN>` para crear tu cuenta. La cuenta sirve para ambas tiendas.

## Seguridad del panel

- Contraseñas con PBKDF2-SHA256 (100 000 iteraciones) y sesiones de 30 días; en la base solo se guarda el hash del token.
- Bloqueo de 15 minutos tras 5 intentos fallidos.
- Todo envío de formularios del panel debe venir del mismo sitio (protección CSRF).
- El tema se valida antes de guardarlo y otra vez antes de mostrarse, porque termina dentro de un `<style>`.

## Roadmap

- [x] Fase 1: base multi-tienda, tema por tienda, panel con acceso, ajustes y editor de tema
- [x] Fase 2: editor de bloques de contenido y biblioteca de fotos en R2
- [ ] Fase 3: catálogo, productos y colecciones por temporada
- [ ] Fase 4: carrito y checkout con Bre-B/transferencia (comprobante) y contra entrega
- [ ] Fase 5: pedidos, envíos y stock
- [ ] Después: personalización de productos y pasarela en línea
