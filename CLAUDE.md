# Tienda modular — guía para Claude

Ecommerce multi-tienda (Artelicat y Pochi Craft 3D) en Astro 7 + Cloudflare Workers + D1 + Drizzle. Todo el contenido visible va en español de Colombia; es un emprendimiento de una persona natural.

**Al retomar, lee primero `ESTADO.md`:** qué está hecho y publicado, decisiones tomadas, pendientes y siguiente fase.

## Reglas del proyecto
- Toda tabla de negocio lleva `store_id`. Una tienda nueva es una fila, nunca una copia de código.
- Los componentes de la tienda solo usan variables del tema (`--color-ink`, `--color-band`, `--font-display`…). Nada de colores fijos.
- Valores del tema y ajustes: validar al guardar (`validateTheme`, `validateSettings`) y otra vez al mostrar.
- Acceso a bindings con `import { env } from 'cloudflare:workers'` (no existe `Astro.locals.runtime`).
- Cambios de esquema: editar `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate:local`. No editar migraciones ya aplicadas.
- El contenido inicial vive en `db/seed-data.ts`; `db/seed.sql` se genera.
- No usar logos, fotos oficiales ni tipografías de BTS/HYBE ni de Minecraft/Mojang. Nombres solo de forma descriptiva.

## Trampas conocidas
- D1 limita los patrones de `LIKE` a 50 caracteres: para buscar dentro de JSON usa `instr()`. Además, `like()` de Drizzle sobre una columna JSON convierte el patrón a JSON.
- Astro conserva los saltos y la sangría dentro de `<textarea>`: escribe `<textarea ...>{valor}</textarea>` en una sola línea.
- En los `<script>` del navegador, los tipos de Workers chocan con los del DOM (`Element.append`, `HTMLSelectElement`): usa `appendChild` o tipos estructurales.
- El archivo de la base local depende del `database_id` de `wrangler.jsonc`; si cambia, la base local queda en otro archivo.
- Un bloque nuevo se define en tres lugares: `blocks.ts` (tipos), `components/` + `BlockRenderer.astro`, y `fields.ts` (campos del panel).

- Precios: enteros en COP; mostrar siempre con `formatCOP` y leer del formulario con `parsePrice`.
- Lo que ve la tienda pasa por las consultas «activas» de `catalogo/repo.ts` (solo publicado y colecciones vigentes); el panel usa las versiones `*Admin`/`list*`.
- Envíos y datos de pago son campos opcionales de `StoreSettings` (las tiendas viejas no los tienen): léelos siempre con `checkoutConfig()`.
- El carrito no guarda precios: todo pasa por `resolveCart()`. Los pedidos se crean en un solo `db.batch` (número consecutivo por tienda y líneas enlazadas por el token).
- Los comprobantes son privados: R2 bajo `comprobantes/`, servidos solo por la ruta del panel. `/media` únicamente sirve `tiendas/…`.
- Pruebas con Playwright en `astro dev`: la barra de desarrollo de Astro tiene su propio DOM y Playwright busca dentro; usa selectores específicos (`li.item`, ids).

## Comandos
- `npm run dev` · `npm run build` (incluye `astro check`) · `npm run db:reset:local`
- Publicar: `npm run deploy` (aplica las migraciones remotas primero y se detiene si fallan; no filtrar su salida con tuberías que oculten el código de salida)
- Vista previa de otra tienda en local: `/?tienda=pochi-craft-3d`
