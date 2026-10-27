# Estado del proyecto

Última actualización: 27 de octubre de 2026.

## Hecho y publicado

- **Fase 1:** base multi-tienda (Artelicat y Pochi Craft 3D), tema por tienda, panel con acceso, ajustes generales y editor de tema.
- **Fase 2:** editor de bloques de contenido y biblioteca de fotos en R2.
- **Fase 3:** catálogo con productos, variantes, categorías, colecciones por temporada y bloque «Productos» para el inicio.
- **Fase 4:** carrito, checkout, pedidos y comprobantes de pago (ver README → «Carrito y pedidos»). Publicada el 27 de octubre de 2026.
- Línea de tiempo de pedidos (Recibido, Confirmado, En preparación, En camino, Entregado, Cancelado) con historial de fechas, y botón para copiar el enlace público de productos y colecciones. Publicado el 27 de octubre de 2026.

En producción (Cloudflare, plan gratuito):

- Artelicat: https://artelicat.tienda-modular.workers.dev
- Pochi Craft 3D: https://pochi-craft-3d.tienda-modular.workers.dev
- Panel: `/admin` en cualquiera de las dos (una sola cuenta para ambas tiendas).
- Base D1 `tienda-modular` (región ENAM), bucket R2 `tienda-modular-media`.
- Migraciones aplicadas en producción: 0000_inicial, 0001_fotos, 0002_catalogo, 0003_pedidos, 0004_historial_pedidos.
- **Productos de prueba en producción** (publicados, con «(prueba)» en el nombre y dirección `prueba-…`): 4 en Artelicat y 3 en Pochi. Cubren variantes con precio propio, stock bajo, agotado, hecho por pedido y oferta. La dueña los edita o elimina cuando cargue los reales.
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

## Decisiones de la Fase 4

- Carrito en cookie por tienda (sin cuentas de clientas). Precios y stock siempre desde la base.
- Envío por **destinos** configurables (nombre, costo o «por confirmar», si admite contra entrega) + envío gratis opcional.
- Pago con comprobante: Bre-B/transferencia → la clienta sube foto o PDF; la dueña confirma o rechaza en el panel.
- Aviso a la dueña: contador de «por atender» en el panel + botón «Avisar por WhatsApp» que manda la clienta. Correo automático no, porque Cloudflare Email necesita dominio propio.
- Estados: pedido *Recibido / Confirmado / En preparación / En camino / Entregado / Cancelado*; pago *Sin pagar / Por revisar / Pagado / Rechazado*.
- Antispam básico: campo trampa en el checkout. Si llega spam, siguiente paso: Turnstile.

## Pendiente de la dueña (Fase 4)

- En *Ajustes generales* de cada tienda, llenar **Datos para Bre-B o transferencia** y los **destinos de envío** (sin destinos, todo sale «Envío a todo Colombia», costo por confirmar y sin contra entrega).

## Siguiente: Fase 5 — envíos y stock

- Transportadora y número de guía al marcar «En camino», y avisos a la clienta en cada cambio de estado.
- Descontar stock al confirmar (y devolverlo al cancelar).
- Después: personalización de productos y pasarela en línea (Wompi).

## Notas para retomar

- Local: `npm run dev` → http://localhost:4321 (Pochi: `/?tienda=pochi-craft-3d`). La base local tiene la cuenta de la dueña y ningún dato de prueba.
- Publicar: `npm run deploy` (aplica migraciones remotas y luego publica los dos workers).
- El remoto `origin` usa SSH (`git@github.com:cloggylabs/tienda-modular.git`).
- Desde la sesión de Claude Code no hay permiso para guardar secretos de Cloudflare (`wrangler secret put`): eso lo hace la dueña.
