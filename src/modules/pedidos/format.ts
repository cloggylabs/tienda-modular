// Reglas y textos de los pedidos, compartidos por la tienda y el panel.
import type { Order, OrderEvent, OrderItem, OrderStatus, PaymentStatus } from '../../db/schema';
import { formatCOP } from '../catalogo/format';
import type { CheckoutConfig, ShippingZone } from '../tiendas/settings';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Recibido',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  shipped: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

/** Camino normal de un pedido. Cancelado puede pasar en cualquier punto antes de entregarse. */
export const ORDER_FLOW = ['new', 'confirmed', 'preparing', 'shipped', 'delivered'] as const satisfies OrderStatus[];

/** Qué significa cada paso, contado a la clienta. */
export const ORDER_STEP_HINTS: Record<OrderStatus, string> = {
  new: 'Recibimos tu pedido.',
  confirmed: 'Confirmamos tu pedido y el pago.',
  preparing: 'Lo estamos haciendo y empacando.',
  shipped: 'Salió hacia tu dirección.',
  delivered: '¡Llegó! Gracias por tu compra.',
  cancelled: 'El pedido se canceló.',
};

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  done: boolean;
  /** Es el estado actual del pedido. */
  current: boolean;
  at?: Date;
}

/**
 * Línea de tiempo del pedido a partir de su historial. Si se canceló, muestra los pasos que alcanzó
 * y termina en «Cancelado»; si no, todo el camino con lo que falta en gris.
 */
export function orderTimeline(order: Pick<Order, 'status' | 'createdAt'>, events: Pick<OrderEvent, 'status' | 'createdAt'>[]): TimelineStep[] {
  const cancelled = order.status === 'cancelled';
  const cancelIndex = cancelled ? events.findLastIndex((e) => e.status === 'cancelled') : -1;
  // Hasta dónde llegó: el estado actual o, si se canceló, el que tenía justo antes.
  const reached = cancelled
    ? (events.slice(0, cancelIndex === -1 ? events.length : cancelIndex).findLast((e) => e.status !== 'cancelled')?.status ?? 'new')
    : order.status;
  const position = ORDER_FLOW.indexOf(reached as (typeof ORDER_FLOW)[number]);
  const lastAt = (status: OrderStatus) => events.findLast((e) => e.status === status)?.createdAt;

  const steps: TimelineStep[] = ORDER_FLOW.map((status, i) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    done: i <= position,
    current: !cancelled && i === position,
    at: i <= position ? (lastAt(status) ?? (status === 'new' ? order.createdAt : undefined)) : undefined,
  }));
  if (!cancelled) return steps;
  return [
    ...steps.filter((s) => s.done),
    { status: 'cancelled', label: ORDER_STATUS_LABELS.cancelled, done: true, current: true, at: lastAt('cancelled') },
  ];
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Sin pagar',
  review: 'Comprobante por revisar',
  paid: 'Pagado',
  rejected: 'Comprobante rechazado',
};

export type OrderAction = 'confirm_payment' | 'reject_receipt' | 'confirm_order' | 'prepare' | 'ship' | 'deliver' | 'cancel' | 'reopen';
type Patch = Partial<Pick<Order, 'status' | 'paymentStatus'>>;

/** Qué puede hacer la dueña con un pedido según su estado, y cómo queda después. */
export function orderActions(order: Pick<Order, 'status' | 'paymentMethod' | 'paymentStatus'>) {
  const actions: { action: OrderAction; label: string; patch: Patch; confirm?: string }[] = [];
  const add = (action: OrderAction, label: string, patch: Patch, confirm?: string) => actions.push({ action, label, patch, confirm });

  switch (order.status) {
    case 'cancelled':
      add('reopen', 'Reabrir pedido', { status: 'new' });
      return actions;
    case 'new':
      if (order.paymentMethod === 'transfer' && order.paymentStatus !== 'paid') {
        add('confirm_payment', order.paymentStatus === 'review' ? 'Confirmar pago' : 'Marcar como pagado', { paymentStatus: 'paid', status: 'confirmed' });
        if (order.paymentStatus === 'review') add('reject_receipt', 'Rechazar comprobante', { paymentStatus: 'rejected' }, '¿Rechazar el comprobante?');
      } else {
        add('confirm_order', 'Confirmar pedido', { status: 'confirmed' });
      }
      break;
    case 'confirmed':
      add('prepare', 'Pasar a preparación', { status: 'preparing' });
      break;
    case 'preparing':
      add('ship', 'Marcar en camino', { status: 'shipped' });
      break;
    case 'shipped':
      // Contra entrega: al entregarlo, la clienta ya pagó en efectivo.
      add('deliver', 'Marcar como entregado', { status: 'delivered', ...(order.paymentMethod === 'cod' ? { paymentStatus: 'paid' as const } : {}) }, '¿Confirmas que el pedido ya fue entregado?');
      break;
    case 'delivered':
      return actions;
  }
  add('cancel', 'Cancelar pedido', { status: 'cancelled' }, '¿Cancelar este pedido?');
  return actions;
}

export function paymentMethodLabel(order: Pick<Order, 'paymentMethod'>, config?: Pick<CheckoutConfig, 'transferLabel'>) {
  return order.paymentMethod === 'cod' ? 'Efectivo contra entrega' : (config?.transferLabel ?? 'Bre-B o transferencia');
}

export const orderCode = (order: Pick<Order, 'number'>) => `#${order.number}`;

/** Costo del envío a un destino; null si se confirma por WhatsApp. */
export function shippingCost(zone: ShippingZone, subtotal: number, freeFrom: number | null): number | null {
  if (freeFrom && subtotal >= freeFrom) return 0;
  return zone.price;
}

export const shippingLabel = (cost: number | null) => (cost === null ? 'Por confirmar' : cost === 0 ? 'Gratis' : formatCOP(cost));

/** "573001234567" → "300 123 4567" */
export function formatPhone(phone: string): string {
  const local = phone.startsWith('57') && phone.length === 12 ? phone.slice(2) : phone;
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : phone;
}

const dateTime = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});
export const formatDateTime = (d: Date) => dateTime.format(d);

/** Texto de WhatsApp con el que la clienta avisa a la tienda que hizo el pedido. */
export function newOrderMessage(order: Order, items: OrderItem[], greeting: string, transferLabel: string, url: string): string {
  const lines = [greeting.trim() || '¡Hola! Acabo de hacer un pedido.', '', `Pedido ${orderCode(order)} a nombre de ${order.customerName}:`];
  for (const item of items) {
    lines.push(`• ${item.quantity} × ${item.name}${item.variantName ? ` (${item.variantName})` : ''}`);
  }
  lines.push(
    '',
    `Total: ${formatCOP(order.total)}${order.shippingCost === null ? ' + envío por confirmar' : ''}`,
    `Pago: ${paymentMethodLabel(order, { transferLabel })}`,
    `Envío a: ${order.city}, ${order.department}`,
    '',
    `Mi pedido: ${url}`,
  );
  return lines.join('\n');
}

export const DEPARTMENTS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bogotá D.C.',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
] as const;
