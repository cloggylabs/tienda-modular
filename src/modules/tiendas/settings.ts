// Datos de contacto y textos fijos de cada tienda. Se editan desde el panel (Ajustes generales).

export interface NavLink {
  label: string;
  href: string;
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
}

export const PAYMENT_OPTIONS = ['Bre-B', 'Transferencia bancaria', 'Efectivo contra entrega'] as const;

export function whatsappUrl(settings: StoreSettings, message?: string): string {
  const text = message ?? settings.whatsappMessage;
  return `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function instagramUrl(settings: StoreSettings): string {
  return `https://instagram.com/${settings.instagram}`;
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
    },
  };
}
