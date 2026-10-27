// Reglas y textos de los pedidos, compartidos por la tienda y el panel.
import type { Order, OrderItem, OrderStatus, PaymentStatus } from '../../db/schema';
import { formatCOP } from '../catalogo/format';
import type { CheckoutConfig, ShippingZone } from '../tiendas/settings';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Por atender',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Sin pagar',
  review: 'Comprobante por revisar',
  paid: 'Pagado',
  rejected: 'Comprobante rechazado',
};

export type OrderAction = 'confirm_payment' | 'reject_receipt' | 'confirm_order' | 'cancel' | 'reopen';

/** Qué puede hacer la dueña con un pedido según su estado, y cómo queda después. */
export function orderActions(order: Pick<Order, 'status' | 'paymentMethod' | 'paymentStatus'>) {
  const actions: { action: OrderAction; label: string; patch: Partial<Pick<Order, 'status' | 'paymentStatus'>> }[] = [];
  if (order.status === 'cancelled') {
    actions.push({ action: 'reopen', label: 'Reabrir pedido', patch: { status: 'new' } });
    return actions;
  }
  if (order.paymentMethod === 'transfer' && order.paymentStatus !== 'paid') {
    const label = order.paymentStatus === 'review' ? 'Confirmar pago' : 'Marcar como pagado';
    actions.push({ action: 'confirm_payment', label, patch: { paymentStatus: 'paid', status: 'confirmed' } });
    if (order.paymentStatus === 'review') {
      actions.push({ action: 'reject_receipt', label: 'Rechazar comprobante', patch: { paymentStatus: 'rejected' } });
    }
  }
  if (order.paymentMethod === 'cod' && order.status === 'new') {
    actions.push({ action: 'confirm_order', label: 'Confirmar pedido', patch: { status: 'confirmed' } });
  }
  actions.push({ action: 'cancel', label: 'Cancelar pedido', patch: { status: 'cancelled' } });
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
