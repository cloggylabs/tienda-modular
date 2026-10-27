import { env } from 'cloudflare:workers';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { orderItems, orders, type Order, type OrderStatus } from '../../db/schema';
import type { Db } from '../../lib/db';
import { sniffType } from '../medios/repo';
import type { CartLine } from './cart';
import type { CheckoutData } from './validate';

/** 32 caracteres aleatorios para la dirección pública del pedido. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_');
}
export const TOKEN = /^[\w-]{32}$/;

/**
 * Crea el pedido y sus líneas en un solo lote atómico. El número sale del último de la tienda
 * dentro de la misma operación, y las líneas encuentran su pedido por el token.
 */
export async function createOrder(db: Db, storeId: number, data: CheckoutData, lines: CartLine[], subtotal: number) {
  const token = newToken();
  const orderId = sql`(select id from ${orders} where ${orders.token} = ${token})`;
  const insertOrder = db.insert(orders).values({
    ...data,
    storeId,
    token,
    number: sql`(select coalesce(max(${orders.number}), 1000) + 1 from ${orders} where ${orders.storeId} = ${storeId})`,
    subtotal,
    total: subtotal + (data.shippingCost ?? 0),
  });
  const insertItems = lines.map((l) =>
    db.insert(orderItems).values({
      storeId,
      orderId,
      productId: l.product.id,
      variantId: l.variant?.id ?? null,
      name: l.product.name,
      variantName: l.variant?.name ?? '',
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      image: l.product.images[0] ?? null,
    }),
  );
  await db.batch([insertOrder, ...insertItems]);
  return token;
}

export function listOrderItems(db: Db, orderId: number) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.id)).all();
}

export async function getOrderByToken(db: Db, storeId: number, token: string) {
  if (!TOKEN.test(token)) return undefined;
  return db.query.orders.findFirst({ where: and(eq(orders.storeId, storeId), eq(orders.token, token)) });
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function getOrder(db: Db, storeId: number, id: number) {
  return db.query.orders.findFirst({ where: and(eq(orders.id, id), eq(orders.storeId, storeId)) });
}

export function listOrders(db: Db, storeId: number, opts: { status?: OrderStatus; q?: string } = {}) {
  const where = [eq(orders.storeId, storeId)];
  if (opts.status) where.push(eq(orders.status, opts.status));
  if (opts.q) {
    const q = opts.q.replace(/^#/, '');
    where.push(
      sql`(instr(lower(${orders.customerName}), lower(${q})) > 0 or ${orders.number} = ${Number(q) || -1} or instr(${orders.phone}, ${q.replace(/\D/g, '') || '-'}) > 0)`,
    );
  }
  return db
    .select()
    .from(orders)
    .where(and(...where))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(200)
    .all();
}

/** Cantidad de líneas de cada pedido (para la lista del panel). */
export async function itemCounts(db: Db, orderIds: number[]) {
  if (!orderIds.length) return new Map<number, number>();
  const rows = await db
    .select({ id: orderItems.orderId, n: sql<number>`sum(${orderItems.quantity})` })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .groupBy(orderItems.orderId)
    .all();
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** Pedidos por atender de cada tienda. */
export async function newOrderCounts(db: Db) {
  const rows = await db
    .select({ storeId: orders.storeId, n: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.status, 'new'))
    .groupBy(orders.storeId)
    .all();
  return new Map(rows.map((r) => [r.storeId, r.n]));
}

export async function updateOrder(
  db: Db,
  storeId: number,
  id: number,
  patch: Partial<Pick<Order, 'status' | 'paymentStatus' | 'adminNote'>>,
) {
  await db
    .update(orders)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.storeId, storeId)));
}

// ---------------------------------------------------------------------------
// Comprobantes de pago: R2 privado (fuera de tiendas/, que es lo único que sirve /media)
// ---------------------------------------------------------------------------

export const RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/** Guarda el comprobante y deja el pago «por revisar». Reemplaza uno anterior. */
export async function saveReceipt(db: Db, order: Order, file: File | null): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return 'Elige la foto o el PDF del comprobante.';
  if (file.size > RECEIPT_MAX_BYTES) return 'El comprobante pesa más de 5 MB. Prueba con una captura de pantalla.';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type || !RECEIPT_TYPES[type]) return 'El comprobante debe ser una foto (JPG, PNG o WebP) o un PDF.';

  const key = `comprobantes/${order.storeId}/${crypto.randomUUID()}.${RECEIPT_TYPES[type]}`;
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
  await db
    .update(orders)
    .set({ receiptKey: key, receiptType: type, receiptAt: new Date(), paymentStatus: 'review', updatedAt: new Date() })
    .where(eq(orders.id, order.id));
  if (order.receiptKey) await env.MEDIA.delete(order.receiptKey);
  return null;
}

export function getReceipt(order: Order) {
  return order.receiptKey ? env.MEDIA.get(order.receiptKey) : Promise.resolve(null);
}
