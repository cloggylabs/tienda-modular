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
    catalogo/    productos, variantes, categorías y colecciones por temporada
    pedidos/     carrito (cookie), checkout, pedidos y comprobantes de pago
  pages/
    index.astro  inicio de la tienda (pinta los bloques de la base)
    catalogo.astro, producto/, coleccion/   catálogo público
    carrito.astro, finalizar.astro, pedido/  carrito, checkout y página del pedido
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

## Catálogo

- **Productos:** precio en COP sin decimales, precio anterior opcional (oferta), hasta 8 fotos, estado *Borrador / Publicado / Archivado* y hasta 10 variantes con precio y stock propios.
- **Disponibilidad:** *Hecho por pedido* (con días de producción) o *Con stock*; con stock en cero el producto se muestra como agotado y el botón pregunta cuándo vuelve.
- **Categorías** permanentes para filtrar el catálogo y **colecciones** con fechas que aparecen y desaparecen solas.
- Cada producto tiene su página (`/producto/<direccion>`) con datos estructurados para Google y un botón de WhatsApp que incluye producto, opción, precio y enlace.
- El bloque *Productos* muestra en el inicio destacados, recientes, una colección o una categoría. «Catálogo» aparece en el menú cuando hay productos publicados.

## Carrito y pedidos

- **Carrito:** vive en una cookie por tienda que solo guarda producto, variante y cantidad. Precios, nombres y stock se leen siempre de la base; si algo se agotó o dejó de publicarse, el carrito lo quita y avisa. Funciona sin JavaScript.
- **Finalizar compra** (`/finalizar`): nombre, celular colombiano, correo opcional, departamento, ciudad, dirección y notas; la clienta elige el **destino de envío** y el **pago**.
- **Envíos** (*Ajustes generales → Envíos*): hasta 8 destinos con su costo (vacío = «por confirmar» por WhatsApp) y si admiten **contra entrega**. Opcional: envío gratis desde cierto subtotal. Sin destinos guardados se ofrece «Envío a todo Colombia» por confirmar y sin contra entrega.
- **Bre-B / transferencia:** al confirmar, la página del pedido muestra el valor y los *Datos para Bre-B o transferencia* de los ajustes, y la clienta sube el comprobante (foto o PDF, máx. 5 MB). Los comprobantes van a R2 bajo `comprobantes/` y solo se ven desde el panel.
- **Página del pedido** (`/pedido/<clave>`): enlace secreto y no indexado; muestra el estado y un botón para avisar por WhatsApp con el resumen.
- **Panel → Pedidos:** lista con filtros y búsqueda, contador de pedidos por atender, detalle con comprobante, confirmar o rechazar el pago, confirmar pedidos contra entrega, cancelar o reabrir y nota interna.
- Los pedidos copian nombre, opción, precio y foto de cada producto: no cambian si después se edita el catálogo. El stock todavía no se descuenta (Fase 5).

## Fotos

Las fotos se suben en *Fotos* y se eligen en los bloques. Antes de subirlas, el navegador las reduce a 1600 px y las convierte a WebP; el servidor solo acepta JPG, PNG, WebP o AVIF (revisa el contenido real del archivo, no solo su extensión) de hasta 5 MB. Una foto que se usa en un bloque, un producto o una colección no se puede borrar.

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
npm run deploy                                       # aplica migraciones y publica los dos workers
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
- [x] Fase 3: catálogo con productos, variantes, categorías y colecciones por temporada
- [x] Fase 4: carrito y checkout con Bre-B/transferencia (comprobante) y contra entrega
- [ ] Fase 5: pedidos, envíos y stock
- [ ] Después: personalización de productos y pasarela en línea
