import { env } from 'cloudflare:workers';
import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { orderEvents, orderItems, orders, products, type Order, type OrderItem, type OrderStatus } from '../../db/schema';
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
  const insertEvent = db.insert(orderEvents).values({ storeId, orderId, status: 'new' });
  await db.batch([insertOrder, ...insertItems, insertEvent]);
  return token;
}

export function listOrderItems(db: Db, orderId: number) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.id)).all();
}

export function listOrderEvents(db: Db, orderId: number) {
  return db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(asc(orderEvents.createdAt), asc(orderEvents.id)).all();
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

export type OrderPatch = Partial<Pick<Order, 'status' | 'paymentStatus' | 'adminNote' | 'carrier' | 'trackingNumber'>>;

/**
 * Cambia el pedido. Si cambia de estado, en la misma operación: lo anota en el historial, descuenta el
 * stock al confirmar y lo devuelve al cancelar. El cambio de estado solo aplica si el pedido sigue como
 * se leyó (un doble clic no duplica el historial) y el stock se mueve una sola vez gracias a stock_applied.
 */
export async function updateOrder(db: Db, order: Pick<Order, 'id' | 'storeId' | 'status'>, patch: OrderPatch) {
  const changesStatus = patch.status !== undefined && patch.status !== order.status;
  const update = db
    .update(orders)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.storeId, order.storeId), changesStatus ? eq(orders.status, order.status) : undefined));
  if (!changesStatus) {
    await update;
    return;
  }
  // Va justo después del update: changes() cuenta las filas que cambió esa sentencia.
  // (insert…select de Drizzle pide todas las columnas en orden: id, store_id, order_id, status, created_at).
  const event = db
    .insert(orderEvents)
    .select(sql`select null, ${order.storeId}, ${order.id}, ${patch.status}, unixepoch() where changes() > 0`);
  const stock =
    patch.status === 'confirmed'
      ? takeStock(db, order, await listOrderItems(db, order.id))
      : patch.status === 'cancelled'
        ? returnStock(db, order, await listOrderItems(db, order.id))
        : [];
  await db.batch([update, event, ...stock]);
}

// ---------------------------------------------------------------------------
// Stock: solo productos con availability = 'stock'. El de las variantes vive en el JSON de variants.
// ---------------------------------------------------------------------------

type StockItem = Pick<OrderItem, 'id' | 'productId' | 'variantId' | 'quantity'>;
type StockOrder = Pick<Order, 'id' | 'storeId'>;

const stockApplied = (order: StockOrder) => sql`(select o.stock_applied from orders o where o.id = ${order.id})`;
const taken = (item: StockItem) => sql`(select oi.stock_taken from order_items oi where oi.id = ${item.id})`;

/** Suma `delta` al stock de la variante (o del producto si no tiene variantes). */
function moveStock(db: Db, order: StockOrder, item: StockItem, delta: SQL, gate: number) {
  // Sin unidades tomadas no se toca el producto (no convierte un stock vacío en 0).
  const where = sql`products.id = ${item.productId} and products.store_id = ${order.storeId} and ${stockApplied(order)} = ${gate} and ${taken(item)} > 0`;
  if (item.variantId) {
    const variants = sql`coalesce((
        select json_set(products.variants, '$[' || v.key || '].stock', coalesce(json_extract(v.value, '$.stock'), 0) + ${delta})
        from json_each(products.variants) v where json_extract(v.value, '$.id') = ${item.variantId}
      ), products.variants)`;
    return db.update(products).set({ variants }).where(where);
  }
  return db
    .update(products)
    .set({ stock: sql`coalesce(products.stock, 0) + ${delta}` })
    .where(sql`${where} and json_array_length(products.variants) = 0`);
}

/** Al confirmar: toma lo que haya (hasta la cantidad pedida), lo anota en la línea y lo resta. */
function takeStock(db: Db, order: StockOrder, items: StockItem[]) {
  const statements = items
    .filter((item) => item.productId !== null)
    .flatMap((item) => {
      const available = item.variantId
        ? sql`(select max(0, coalesce(json_extract(v.value, '$.stock'), 0)) from products p, json_each(p.variants) v
            where p.id = ${item.productId} and p.store_id = ${order.storeId} and p.availability = 'stock'
            and json_extract(v.value, '$.id') = ${item.variantId})`
        : sql`(select max(0, coalesce(p.stock, 0)) from products p
            where p.id = ${item.productId} and p.store_id = ${order.storeId} and p.availability = 'stock'
            and json_array_length(p.variants) = 0)`;
      return [
        db
          .update(orderItems)
          .set({ stockTaken: sql`coalesce(min(${item.quantity}, ${available}), 0)` })
          .where(sql`order_items.id = ${item.id} and ${stockApplied(order)} = 0`),
        moveStock(db, order, item, sql`-${taken(item)}`, 0),
      ];
    });
  return [...statements, db.update(orders).set({ stockApplied: true }).where(eq(orders.id, order.id))];
}

/** Al cancelar: devuelve exactamente lo que se tomó. */
function returnStock(db: Db, order: StockOrder, items: StockItem[]) {
  const statements = items
    .filter((item) => item.productId !== null)
    .flatMap((item) => [
      moveStock(db, order, item, taken(item), 1),
      db.update(orderItems).set({ stockTaken: 0 }).where(sql`order_items.id = ${item.id} and ${stockApplied(order)} = 1`),
    ]);
  return [...statements, db.update(orders).set({ stockApplied: false }).where(eq(orders.id, order.id))];
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
