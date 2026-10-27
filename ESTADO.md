# Estado del proyecto

Última actualización: 26 de octubre de 2026.

## Hecho y publicado

- **Fase 1:** base multi-tienda (Artelicat y Pochi Craft 3D), tema por tienda, panel con acceso, ajustes generales y editor de tema.
- **Fase 2:** editor de bloques de contenido y biblioteca de fotos en R2.
- **Fase 3:** catálogo con productos, variantes, categorías, colecciones por temporada y bloque «Productos» para el inicio.

En producción (Cloudflare, plan gratuito):

- Artelicat: https://artelicat.tienda-modular.workers.dev
- Pochi Craft 3D: https://pochi-craft-3d.tienda-modular.workers.dev
- Panel: `/admin` en cualquiera de las dos (una sola cuenta para ambas tiendas).
- Base D1 `tienda-modular` (región ENAM), bucket R2 `tienda-modular-media`.
- Migraciones aplicadas en producción: 0000_inicial, 0001_fotos, 0002_catalogo.
- `SETUP_TOKEN` configurado en el worker `artelicat` por la dueña; la cuenta del panel ya existe.

## Decisiones tomadas

- Panel propio (no CMS externo). Login con correo y contraseña; sesiones en D1.
- Pagos: por ahora solo Bre-B/transferencia y contra entrega. Pasarela en línea (Wompi) más adelante.
- Sin dominio propio todavía: cada tienda es un worker con su subdominio `*.workers.dev`; ambos comparten la base.
- Pochi Craft 3D aún no tiene identidad visual: su paleta (cielo, pasto, arena, tierra) y textos son provisionales.
- Artelicat sigue con merch inspirado en BTS, con colecciones por temporada (Halloween, Navidad, Feria del Libro…).
- Todo en español de Colombia; emprendimiento de persona natural.

## Pendiente de la dueña

- Cambiar el WhatsApp de prueba `573000000000` en *Ajustes generales* de ambas tiendas.
- Instagram de Pochi Craft 3D (vacío).
- La promo de Halloween de Artelicat vence el 31 de octubre; la de Navidad de Pochi aparece el 15 de noviembre (contenido inventado como ejemplo).
- Cargar categorías, fotos y productos reales.

## Siguiente: Fase 4 — carrito y checkout

Idea acordada a grandes rasgos (falta detallar):

- Carrito con varios productos y variantes.
- Checkout con datos de envío del cliente.
- Pago por Bre-B/transferencia: el cliente sube el comprobante y la dueña lo confirma en el panel.
- Contra entrega solo en ciudades habilitadas.
- Pedidos visibles en el panel; aviso a la dueña (WhatsApp o correo).

Después: Fase 5 (estados de pedido, envíos, descuento de stock) y luego personalización de productos y pasarela en línea.

## Notas para retomar

- Local: `npm run dev` → http://localhost:4321 (Pochi: `/?tienda=pochi-craft-3d`). La base local tiene la cuenta de la dueña y ningún dato de prueba.
- Publicar: `npm run deploy` (aplica migraciones remotas y luego publica los dos workers).
- El remoto `origin` usa SSH (`git@github.com:cloggylabs/tienda-modular.git`).
- Desde la sesión de Claude Code no hay permiso para guardar secretos de Cloudflare (`wrangler secret put`): eso lo hace la dueña.
