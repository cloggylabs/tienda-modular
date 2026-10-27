// Contenido inicial de las dos tiendas. `npm run db:seed:build` lo convierte en db/seed.sql.
// El seed es idempotente: no toca una tienda que ya existe ni bloques que ya fueron creados,
// así que se puede volver a correr sin borrar lo editado desde el panel.
import { ARTELICAT_THEME, POCHI_THEME } from '../src/modules/tema/defaults.ts';
import type { Theme } from '../src/modules/tema/theme.ts';
import type { BlockPropsByType, BlockType } from '../src/modules/contenido/blocks.ts';
import type { StoreSettings } from '../src/modules/tiendas/settings.ts';

type SeedBlock = { [K in BlockType]: { type: K; props: BlockPropsByType[K] } }[BlockType];

export interface SeedStore {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  settings: StoreSettings;
  theme: Theme;
  blocks: SeedBlock[];
}

export const seedStores: SeedStore[] = [
  {
    slug: 'artelicat',
    name: 'Artelicat',
    tagline: 'Impresión 3D y papelería hecha por ARMY, para ARMY.',
    description:
      'Artelicat: impresión 3D y papelería inspirada en BTS, hecha a mano en Colombia. Pedidos por WhatsApp, pagos por Bre-B, transferencia o contra entrega.',
    settings: {
      whatsapp: '573000000000',
      whatsappMessage: '¡Hola Artelicat! 💜 Quiero hacer un pedido.',
      instagram: 'artelicat',
      payments: ['Bre-B', 'Transferencia bancaria', 'Efectivo contra entrega'],
      nav: [
        { label: 'Qué hacemos', href: '#hacemos' },
        { label: 'Cómo comprar', href: '#como-comprar' },
      ],
      legalNotice:
        'Artelicat es un emprendimiento independiente hecho por fans. No está afiliado ni patrocinado por BTS, HYBE ni BIGHIT MUSIC. Todos los diseños son originales.',
      footerNote: 'Hecho en Colombia 💜',
      // Ejemplo: la dueña cambia destinos, costos y datos de pago en Ajustes generales.
      transferInstructions: '',
      shippingZones: [
        { name: 'Bogotá', price: 8000, cod: true },
        { name: 'Resto del país', price: 16000, cod: false },
      ],
      freeShippingFrom: null,
    },
    theme: ARTELICAT_THEME,
    blocks: [
      {
        type: 'hero',
        props: {
          badge: 'Hecho en Colombia por ARMY',
          title: 'Hecho capa por capa,',
          titleAccent: 'con amor morado.',
          body: 'Impresión 3D y papelería inspirada en BTS para llevar al concierto, al colegio o a tu escritorio. Diseños propios, hechos a mano, en pequeñas tandas.',
          primary: { to: 'whatsapp', label: 'Pedir por WhatsApp' },
          secondary: { to: 'instagram', label: 'Ver el catálogo' },
        },
      },
      {
        type: 'promo',
        props: {
          badge: 'Colección de temporada',
          title: 'Halloween morado, solo hasta el 31.',
          body: 'Llaveros, stickers y separadores de edición limitada para esta temporada. Escríbenos y te contamos qué alcanzamos a entregar.',
          cta: { to: 'whatsapp', label: 'Quiero la colección', message: '¡Hola Artelicat! 💜 Quiero ver la colección de Halloween.' },
          until: '2026-10-31T23:59:59-05:00',
        },
      },
      {
        type: 'split',
        props: {
          anchor: 'hacemos',
          badge: 'Impresión 3D',
          title: 'Piezas que se imprimen capa por capa.',
          body: 'Diseñamos y fabricamos en PLA cada pieza, con acabados a mano. Si lo imaginas, probablemente lo podemos imprimir.',
          items: ['Llaveros y dijes', 'Soportes para photocards y lightstick', 'Decoración para tu escritorio', 'Pedidos personalizados'],
          link: { to: 'whatsapp', label: 'Cotizar una pieza', message: '¡Hola Artelicat! 💜 Quiero cotizar una pieza impresa en 3D.' },
          image: { alt: 'Llaveros impresos en 3D en tonos morados', label: 'Llaveros 3D' },
        },
      },
      {
        type: 'split',
        props: {
          badge: 'Papelería',
          title: 'Papelería para tu bias.',
          body: 'Stickers, libretas y separadores con ilustraciones propias, pensados para decorar tu día a día y tus colecciones.',
          items: ['Stickers y planchas', 'Separadores y postales', 'Libretas y cuadernos', 'Toploaders decorados'],
          link: { to: 'instagram', label: 'Ver novedades en Instagram' },
          image: { alt: 'Planchas de stickers y libretas en tonos lila', label: 'Stickers & libretas' },
          reverse: true,
          tone: 'surface',
        },
      },
      {
        type: 'keywords',
        props: {
          label: 'Lo que puedes encontrar',
          words: [
            { text: 'Llaveros', size: 'lg', rotate: -3 },
            { text: 'Stickers', size: 'md', rotate: 2 },
            { text: 'Photocards', size: 'sm', rotate: -1 },
            { text: 'Borahae', size: 'lg', rotate: -2, circled: true },
            { text: 'Separadores', size: 'sm', rotate: 3 },
            { text: 'Libretas', size: 'md', rotate: -2 },
            { text: 'Toploaders', size: 'sm', rotate: 1 },
            { text: 'Figuras 3D', size: 'lg', rotate: 2 },
            { text: 'Postales', size: 'md', rotate: -4 },
          ],
        },
      },
      {
        type: 'how_to_buy',
        props: {
          anchor: 'como-comprar',
          badge: 'Cómo comprar',
          title: 'Tres pasos y es tuyo.',
          steps: [
            { title: 'Escríbenos', body: 'Cuéntanos qué quieres por WhatsApp o Instagram. Te confirmamos disponibilidad, precio en COP y tiempo de entrega.' },
            { title: 'Paga como prefieras', body: 'Bre-B o transferencia bancaria para envíos nacionales. Efectivo contra entrega en las zonas donde está disponible.' },
            { title: 'Recíbelo', body: 'Empacamos cada pedido a mano. Te enviamos la guía para que sigas tu paquete hasta la puerta.' },
          ],
          cta: { to: 'whatsapp', label: 'Hacer mi pedido' },
        },
      },
    ],
  },
  {
    slug: 'pochi-craft-3d',
    name: 'Pochi Craft 3D',
    tagline: 'Bloques, figuras y accesorios impresos en 3D para gamers.',
    description:
      'Pochi Craft 3D: piezas impresas en 3D inspiradas en el mundo de los bloques, hechas en Colombia. Pedidos por WhatsApp, pagos por Bre-B, transferencia o contra entrega.',
    settings: {
      whatsapp: '573000000000',
      whatsappMessage: '¡Hola Pochi Craft 3D! Quiero hacer un pedido.',
      instagram: '',
      payments: ['Bre-B', 'Transferencia bancaria', 'Efectivo contra entrega'],
      nav: [
        { label: 'Qué imprimimos', href: '#hacemos' },
        { label: 'Cómo comprar', href: '#como-comprar' },
      ],
      legalNotice:
        'Pochi Craft 3D es un emprendimiento independiente hecho por fans. No está afiliado, aprobado ni patrocinado por Mojang Studios ni Microsoft. Minecraft es una marca de sus respectivos dueños. Todos los diseños son originales.',
      footerNote: 'Hecho en Colombia, bloque por bloque',
      // Ejemplo: la dueña cambia destinos, costos y datos de pago en Ajustes generales.
      transferInstructions: '',
      shippingZones: [
        { name: 'Bogotá', price: 8000, cod: true },
        { name: 'Resto del país', price: 16000, cod: false },
      ],
      freeShippingFrom: null,
    },
    theme: POCHI_THEME,
    blocks: [
      {
        type: 'hero',
        props: {
          badge: 'Impresión 3D hecha en Colombia',
          title: 'Construido bloque por bloque.',
          body: 'Figuras, llaveros y accesorios impresos en 3D inspirados en Minecraft, para tu escritorio, tu mochila o tu setup gamer.',
          primary: { to: 'whatsapp', label: 'Pedir por WhatsApp' },
          secondary: { to: 'url', label: 'Ver qué imprimimos', href: '#hacemos' },
        },
      },
      {
        type: 'promo',
        props: {
          badge: 'Temporada de regalos',
          title: 'Navidad en bloques.',
          body: 'Arma tu caja de regalo con figuras y llaveros. Pide con tiempo para recibir antes del 24.',
          cta: { to: 'whatsapp', label: 'Armar mi caja', message: '¡Hola Pochi Craft 3D! Quiero armar una caja de regalo de Navidad.' },
          startsAt: '2026-11-15T00:00:00-05:00',
          until: '2026-12-20T23:59:59-05:00',
        },
      },
      {
        type: 'split',
        props: {
          anchor: 'hacemos',
          badge: 'Impresión 3D',
          title: 'Del mundo de bloques a tu mano.',
          body: 'Modelamos e imprimimos en PLA cada pieza, con colores vivos y acabados revisados a mano.',
          items: ['Figuras y dioramas', 'Llaveros y dijes pixelados', 'Portalápices y organizadores', 'Lámparas de bloque', 'Pedidos personalizados'],
          link: { to: 'whatsapp', label: 'Cotizar una pieza', message: '¡Hola Pochi Craft 3D! Quiero cotizar una pieza.' },
          image: { alt: 'Figuras de bloques impresas en 3D', label: 'Figuras de bloques' },
        },
      },
      {
        type: 'keywords',
        props: {
          label: 'Lo que puedes encontrar',
          words: [
            { text: 'Bloques', size: 'lg', rotate: -2 },
            { text: 'Llaveros', size: 'md', rotate: 2 },
            { text: 'Figuras', size: 'lg', rotate: 1 },
            { text: 'Pixel', size: 'sm', rotate: -3, circled: true },
            { text: 'Lámparas', size: 'md', rotate: -1 },
            { text: 'Imanes', size: 'sm', rotate: 3 },
            { text: 'Dioramas', size: 'md', rotate: -2 },
          ],
        },
      },
      {
        type: 'how_to_buy',
        props: {
          anchor: 'como-comprar',
          badge: 'Cómo comprar',
          title: 'Tres pasos y es tuyo.',
          steps: [
            { title: 'Escríbenos', body: 'Cuéntanos qué pieza quieres por WhatsApp. Te confirmamos color, precio en COP y tiempo de impresión.' },
            { title: 'Paga como prefieras', body: 'Bre-B o transferencia bancaria para envíos nacionales. Efectivo contra entrega donde esté disponible.' },
            { title: 'Recíbelo', body: 'Revisamos y empacamos cada pieza a mano, y te enviamos la guía de tu paquete.' },
          ],
          cta: { to: 'whatsapp', label: 'Hacer mi pedido' },
        },
      },
    ],
  },
];
