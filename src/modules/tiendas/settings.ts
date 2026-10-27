// Datos de contacto y textos fijos de cada tienda. Se editan desde el panel (Ajustes generales).

export interface NavLink {
  label: string;
  href: string;
}

/** Destino de envío que la clienta elige al finalizar la compra (Bogotá, Medellín, Resto del país…). */
export interface ShippingZone {
  name: string;
  /** Costo en COP; null = se confirma por WhatsApp. */
  price: number | null;
  /** Se puede pagar en efectivo contra entrega en este destino. */
  cod: boolean;
}

export interface StoreSettings {
  /** Número en formato internacional, solo dígitos. Ej: 573001234567 */
  whatsapp: string;
  whatsappMessage: string;
  /** Usuario de Instagram sin @ */
  instagram: string;
  payments: string[];
  nav: NavLink[];
  /** Aviso legal del footer (independencia de marcas, etc.). */
  legalNotice: string;
  /** Línea final del footer, ej. "Hecho en Colombia 💜". */
  footerNote: string;
  // Los campos de envío y pago llegaron en la Fase 4: las tiendas creadas antes no los tienen
  // guardados. Se leen siempre con checkoutConfig().
  /** Llave Bre-B, banco, cuenta y titular: se muestran al pagar por transferencia. */
  transferInstructions?: string;
  shippingZones?: ShippingZone[];
  /** Envío gratis desde este subtotal (COP). */
  freeShippingFrom?: number | null;
}

export const PAYMENT_OPTIONS = ['Bre-B', 'Transferencia bancaria', 'Efectivo contra entrega'] as const;

export function whatsappUrl(settings: StoreSettings, message?: string): string {
  const text = message ?? settings.whatsappMessage;
  return `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function instagramUrl(settings: StoreSettings): string {
  return `https://instagram.com/${settings.instagram}`;
}

export const MAX_SHIPPING_ZONES = 8;
const MAX_PRICE = 10_000_000;

export interface CheckoutConfig {
  transferInstructions: string;
  /** Nunca vacío: sin destinos configurados queda uno genérico con costo por confirmar. */
  zones: ShippingZone[];
  freeShippingFrom: number | null;
  /** La tienda recibe Bre-B o transferencia (pago con comprobante). */
  acceptsTransfer: boolean;
  /** Etiqueta del pago con comprobante según lo que acepte la tienda. */
  transferLabel: string;
  acceptsCod: boolean;
}

const price = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_PRICE ? (n as number) : null);

function cleanZones(zones: unknown): ShippingZone[] {
  if (!Array.isArray(zones)) return [];
  return zones
    .map((z) => ({ name: String(z?.name ?? '').trim().slice(0, 60), price: price(z?.price), cod: z?.cod === true }))
    .filter((z) => z.name)
    .slice(0, MAX_SHIPPING_ZONES);
}

/** Ajustes de envío y pago listos para usar (también valida lo guardado antes de mostrarlo). */
export function checkoutConfig(settings: StoreSettings): CheckoutConfig {
  const zones = cleanZones(settings.shippingZones);
  const payments = Array.isArray(settings.payments) ? settings.payments : [];
  const breB = payments.includes('Bre-B');
  const bank = payments.includes('Transferencia bancaria');
  return {
    transferInstructions: String(settings.transferInstructions ?? '').trim().slice(0, 1000),
    zones: zones.length ? zones : [{ name: 'Envío a todo Colombia', price: null, cod: false }],
    freeShippingFrom: price(settings.freeShippingFrom) || null,
    acceptsTransfer: breB || bank,
    transferLabel: breB && bank ? 'Bre-B o transferencia' : breB ? 'Bre-B' : 'Transferencia bancaria',
    acceptsCod: payments.includes('Efectivo contra entrega'),
  };
}

const SAFE_HREF = /^(#[\w-]*|\/[^\s]*|https:\/\/[^\s]+)$/;

/** Valida y normaliza los ajustes enviados desde el panel. */
export function validateSettings(input: Partial<StoreSettings>): { ok: true; settings: StoreSettings } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const whatsapp = String(input.whatsapp ?? '').replace(/\D/g, '');
  if (whatsapp.length < 10 || whatsapp.length > 15) {
    errors.push('WhatsApp: escribe el número con indicativo de país, por ejemplo 573001234567.');
  }
  const instagram = String(input.instagram ?? '').trim().replace(/^@/, '');
  if (instagram && !/^[\w.]{1,30}$/.test(instagram)) errors.push('Instagram: usuario no válido.');

  const payments = (input.payments ?? []).filter((p) => (PAYMENT_OPTIONS as readonly string[]).includes(p));
  if (!payments.length) errors.push('Métodos de pago: elige al menos uno.');

  const nav = (input.nav ?? [])
    .map((l) => ({ label: String(l.label ?? '').trim(), href: String(l.href ?? '').trim() }))
    .filter((l) => l.label || l.href);
  for (const l of nav) {
    if (!l.label || !SAFE_HREF.test(l.href)) errors.push(`Menú: el enlace «${l.label || l.href}» no es válido (usa #seccion, /ruta o https://…).`);
  }

  const transferInstructions = String(input.transferInstructions ?? '').trim();
  if (transferInstructions.length > 1000) errors.push('Datos para transferencia: máximo 1000 caracteres.');
  const zones = Array.isArray(input.shippingZones) ? input.shippingZones : [];
  if (zones.length > MAX_SHIPPING_ZONES) errors.push(`Envíos: máximo ${MAX_SHIPPING_ZONES} destinos.`);
  const names = new Set<string>();
  for (const z of zones) {
    const name = String(z?.name ?? '').trim();
    if (!name || name.length > 60) errors.push('Envíos: cada destino necesita un nombre de máximo 60 caracteres.');
    if (z?.price !== null && price(z?.price) === null) errors.push(`Envíos: el costo de «${name}» no es válido.`);
    if (names.has(name.toLowerCase())) errors.push(`Envíos: el destino «${name}» está repetido.`);
    names.add(name.toLowerCase());
  }
  const freeShippingFrom = input.freeShippingFrom ?? null;
  if (freeShippingFrom !== null && !price(freeShippingFrom)) errors.push('Envío gratis desde: escribe un valor en pesos o déjalo vacío.');

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    settings: {
      whatsapp,
      whatsappMessage: String(input.whatsappMessage ?? '').trim(),
      instagram,
      payments,
      nav,
      legalNotice: String(input.legalNotice ?? '').trim(),
      footerNote: String(input.footerNote ?? '').trim(),
      transferInstructions,
      shippingZones: cleanZones(zones),
      freeShippingFrom,
    },
  };
}
