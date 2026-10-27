// Lectura y validación del formulario para finalizar la compra.
import type { PaymentMethod } from '../../db/schema';
import type { CheckoutConfig } from '../tiendas/settings';
import { DEPARTMENTS, shippingCost } from './format';

export interface CheckoutValues {
  customerName: string;
  phone: string;
  email: string;
  department: string;
  city: string;
  address: string;
  notes: string;
  zone: string;
  paymentMethod: string;
}

export interface CheckoutData {
  customerName: string;
  phone: string;
  email: string;
  department: string;
  city: string;
  address: string;
  notes: string;
  shippingZone: string;
  shippingCost: number | null;
  paymentMethod: PaymentMethod;
}

export type CheckoutParse = { ok: true; data: CheckoutData } | { ok: false; errors: string[]; values: CheckoutValues };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Celular colombiano: 10 dígitos que empiezan por 3, con o sin +57. Devuelve "57300…" o null. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? `57${digits}` : null;
}

/** Métodos de pago posibles para un destino. */
export function paymentMethodsFor(config: CheckoutConfig, zoneName: string): PaymentMethod[] {
  const zone = config.zones.find((z) => z.name === zoneName);
  const methods: PaymentMethod[] = [];
  if (config.acceptsTransfer) methods.push('transfer');
  if (config.acceptsCod && zone?.cod) methods.push('cod');
  return methods;
}

export function parseCheckoutForm(form: FormData, config: CheckoutConfig, subtotal: number): CheckoutParse {
  const text = (key: string, max: number) => String(form.get(key) ?? '').trim().slice(0, max);
  const values: CheckoutValues = {
    customerName: text('customerName', 120),
    phone: text('phone', 30),
    email: text('email', 120),
    department: text('department', 60),
    city: text('city', 80),
    address: text('address', 200),
    notes: text('notes', 500),
    zone: text('zone', 60),
    paymentMethod: text('paymentMethod', 20),
  };
  const errors: string[] = [];

  if (values.customerName.length < 3) errors.push('Nombre: escribe tu nombre completo.');
  const phone = normalizePhone(values.phone);
  if (!phone) errors.push('Celular: escribe un número colombiano de 10 dígitos, por ejemplo 300 123 4567.');
  if (values.email && !EMAIL.test(values.email)) errors.push('Correo: revisa que esté bien escrito o déjalo vacío.');
  if (!(DEPARTMENTS as readonly string[]).includes(values.department)) errors.push('Departamento: elige uno de la lista.');
  if (values.city.length < 2) errors.push('Ciudad o municipio: es obligatorio.');
  if (values.address.length < 5) errors.push('Dirección: escribe la dirección completa (calle, número, apartamento, barrio).');

  const zone = config.zones.find((z) => z.name === values.zone);
  if (!zone) errors.push('Envío: elige el destino.');
  const methods = zone ? paymentMethodsFor(config, zone.name) : [];
  const paymentMethod = methods.find((m) => m === values.paymentMethod);
  if (zone && !methods.length) errors.push('Para ese destino no tenemos un método de pago disponible. Escríbenos por WhatsApp.');
  else if (zone && !paymentMethod) {
    errors.push(values.paymentMethod === 'cod' ? 'Contra entrega no está disponible para ese destino.' : 'Pago: elige cómo quieres pagar.');
  }

  if (errors.length || !phone || !zone || !paymentMethod) return { ok: false, errors, values };
  return {
    ok: true,
    data: {
      customerName: values.customerName,
      phone,
      email: values.email.toLowerCase(),
      department: values.department,
      city: values.city,
      address: values.address,
      notes: values.notes,
      shippingZone: zone.name,
      shippingCost: shippingCost(zone, subtotal, config.freeShippingFrom),
      paymentMethod,
    },
  };
}
