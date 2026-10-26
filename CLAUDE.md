# Tienda modular — guía para Claude

Ecommerce multi-tienda (Artelicat y Pochi Craft 3D) en Astro 7 + Cloudflare Workers + D1 + Drizzle. Todo el contenido visible va en español de Colombia; es un emprendimiento de una persona natural.

## Reglas del proyecto
- Toda tabla de negocio lleva `store_id`. Una tienda nueva es una fila, nunca una copia de código.
- Los componentes de la tienda solo usan variables del tema (`--color-ink`, `--color-band`, `--font-display`…). Nada de colores fijos.
- Valores del tema y ajustes: validar al guardar (`validateTheme`, `validateSettings`) y otra vez al mostrar.
- Acceso a bindings con `import { env } from 'cloudflare:workers'` (no existe `Astro.locals.runtime`).
- Cambios de esquema: editar `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate:local`. No editar migraciones ya aplicadas.
- El contenido inicial vive en `db/seed-data.ts`; `db/seed.sql` se genera.
- No usar logos, fotos oficiales ni tipografías de BTS/HYBE ni de Minecraft/Mojang. Nombres solo de forma descriptiva.

## Comandos
- `npm run dev` · `npm run build` (incluye `astro check`) · `npm run db:reset:local`
- Vista previa de otra tienda en local: `/?tienda=pochi-craft-3d`
