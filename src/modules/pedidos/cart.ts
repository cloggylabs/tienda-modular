// Carrito en una cookie por tienda. Solo guarda producto, variante y cantidad: precios, nombres y
// disponibilidad se leen siempre de la base, así que la cookie no sirve para cambiar un precio.
import type { AstroCookies } from 'astro';
import type { Product, ProductVariant } from '../../db/schema';
import type { Db } from '../../lib/db';
import { availableUnits, variantPrice } from '../catalogo/format';
import { listActiveProductsByIds } from '../catalogo/repo';

export interface CartEntry {
  productId: number;
  variantId: string | null;
  quantity: number;
}

export const MAX_QUANTITY = 20;
export const MAX_LINES = 30;
const MAX_AGE = 60 * 60 * 24 * 30;

// En local, la vista previa sirve varias tiendas desde el mismo dominio: cada una tiene su cookie.
const cookieName = (storeId: number) => `carrito_${storeId}`;
const VARIANT_ID = /^[a-z0-9]{1,16}$/;

export const entryKey = (e: Pick<CartEntry, 'productId' | 'variantId'>) => `${e.productId}:${e.variantId ?? ''}`;

export function readCart(cookies: AstroCookies, storeId: number): CartEntry[] {
  const raw = cookies.get(cookieName(storeId))?.value;
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const entries: CartEntry[] = [];
    for (const item of data.slice(0, MAX_LINES)) {
      if (!Array.isArray(item)) continue;
      const [productId, variantId, quantity] = item;
      if (!Number.isInteger(productId) || productId <= 0) continue;
      if (!Number.isInteger(quantity) || quantity <= 0) continue;
      const variant = typeof variantId === 'string' && VARIANT_ID.test(variantId) ? variantId : null;
      entries.push({ productId, variantId: variant, quantity: Math.min(quantity, MAX_QUANTITY) });
    }
    return entries;
  } catch {
    return [];
  }
}

export function writeCart(cookies: AstroCookies, storeId: number, entries: CartEntry[], secure: boolean) {
  if (!entries.length) {
    cookies.delete(cookieName(storeId), { path: '/' });
    return;
  }
  const value = JSON.stringify(entries.slice(0, MAX_LINES).map((e) => [e.productId, e.variantId ?? '', e.quantity]));
  cookies.set(cookieName(storeId), value, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: MAX_AGE });
}

export const cartCount = (entries: CartEntry[]) => entries.reduce((sum, e) => sum + e.quantity, 0);

/** Suma (o fija) la cantidad de una línea; con cantidad 0 la quita. */
export function setQuantity(entries: CartEntry[], target: Omit<CartEntry, 'quantity'>, quantity: number): CartEntry[] {
  const key = entryKey(target);
  const rest = entries.filter((e) => entryKey(e) !== key);
  if (quantity <= 0) return rest;
  const line = { ...target, quantity: Math.min(quantity, MAX_QUANTITY) };
  const index = entries.findIndex((e) => entryKey(e) === key);
  if (index === -1) return [...entries, line].slice(-MAX_LINES);
  return entries.map((e, i) => (i === index ? line : e));
}

export interface CartLine {
  key: string;
  product: Product;
  variant?: ProductVariant;
  unitPrice: number;
  quantity: number;
  total: number;
  /** Tope de unidades para esta línea (stock o el máximo general). */
  max: number;
}

export interface ResolvedCart {
  lines: CartLine[];
  subtotal: number;
  /** Avisos para la clienta: productos que se quitaron o cantidades que se ajustaron. */
  notices: string[];
  /** La cookie tenía algo que ya no aplica y hay que reescribirla. */
  changed: boolean;
}

/** Arma el carrito con los datos actuales: solo productos publicados, con stock y precio de hoy. */
export async function resolveCart(db: Db, storeId: number, entries: CartEntry[]): Promise<ResolvedCart> {
  const products = await listActiveProductsByIds(db, storeId, [...new Set(entries.map((e) => e.productId))]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartLine[] = [];
  const notices: string[] = [];
  let changed = false;

  for (const entry of entries) {
    const product = byId.get(entry.productId);
    const variant = product?.variants.find((v) => v.id === entry.variantId);
    // La variante debe existir si el producto tiene opciones, y no venir si no las tiene.
    if (!product || (product.variants.length ? !variant : entry.variantId)) {
      notices.push(product ? `Una opción de «${product.name}» ya no existe y se quitó del carrito.` : 'Un producto ya no está disponible y se quitó del carrito.');
      changed = true;
      continue;
    }
    const label = variant ? `${product.name} (${variant.name})` : product.name;
    const units = availableUnits(product, variant);
    if (units !== null && units <= 0) {
      notices.push(`«${label}» se agotó y se quitó del carrito.`);
      changed = true;
      continue;
    }
    const max = Math.min(MAX_QUANTITY, units ?? MAX_QUANTITY);
    let quantity = entry.quantity;
    if (quantity > max) {
      quantity = max;
      notices.push(`De «${label}» solo quedan ${max} unidades: ajustamos la cantidad.`);
      changed = true;
    }
    const unitPrice = variantPrice(product, variant);
    lines.push({ key: entryKey(entry), product, variant, unitPrice, quantity, total: unitPrice * quantity, max });
  }

  return { lines, subtotal: lines.reduce((sum, l) => sum + l.total, 0), notices, changed };
}

/** Entradas de cookie a partir de un carrito ya revisado. */
export const toEntries = (lines: CartLine[]): CartEntry[] =>
  lines.map((l) => ({ productId: l.product.id, variantId: l.variant?.id ?? null, quantity: l.quantity }));
