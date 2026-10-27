// Reglas de presentación del catálogo, compartidas por la tienda y el panel.
import type { Collection, Product, ProductVariant } from '../../db/schema';

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** 25000 → "$ 25.000" */
export function formatCOP(value: number): string {
  return cop.format(value);
}

/** "Llavero Corazón Morado" → "llavero-corazon-morado" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

export const STATUS_LABELS: Record<Product['status'], string> = {
  draft: 'Borrador',
  active: 'Publicado',
  archived: 'Archivado',
};

/** Precio de una variante (o del producto si no tiene precio propio). */
export function variantPrice(product: Pick<Product, 'price'>, variant?: ProductVariant): number {
  return variant?.price ?? product.price;
}

/** Rango de precios para tarjetas: "$ 18.000" o "Desde $ 18.000". */
export function priceLabel(product: Pick<Product, 'price' | 'variants'>): string {
  const prices = product.variants.length ? product.variants.map((v) => v.price ?? product.price) : [product.price];
  const min = Math.min(...prices);
  return prices.some((p) => p !== min) ? `Desde ${formatCOP(min)}` : formatCOP(min);
}

export type StockState = { available: boolean; label: string };

/** Estado de disponibilidad de un producto o de una de sus variantes. */
export function stockState(
  product: Pick<Product, 'availability' | 'stock' | 'productionDays' | 'variants'>,
  variant?: ProductVariant,
): StockState {
  if (product.availability === 'made_to_order') {
    return { available: true, label: product.productionDays ? `Hecho por pedido · ${product.productionDays}` : 'Hecho por pedido' };
  }
  const units = variant
    ? (variant.stock ?? 0)
    : product.variants.length
      ? product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
      : (product.stock ?? 0);
  if (units <= 0) return { available: false, label: 'Agotado' };
  if (units <= 3) return { available: true, label: `¡Últimas ${units} unidades!` };
  return { available: true, label: 'Disponible' };
}

/** Una colección está activa si está habilitada y dentro de sus fechas. */
export function isCollectionActive(c: Pick<Collection, 'enabled' | 'startsAt' | 'endsAt'>, now = new Date()): boolean {
  if (!c.enabled) return false;
  if (c.startsAt && now < c.startsAt) return false;
  if (c.endsAt && now > c.endsAt) return false;
  return true;
}

export function collectionStatus(c: Pick<Collection, 'enabled' | 'startsAt' | 'endsAt'>, now = new Date()): string {
  if (!c.enabled) return 'Oculta';
  if (c.startsAt && now < c.startsAt) return 'Programada';
  if (c.endsAt && now > c.endsAt) return 'Terminada';
  return 'Activa';
}

/** Texto de WhatsApp para pedir un producto concreto. */
export function orderMessage(opts: {
  greeting: string;
  product: Pick<Product, 'name'>;
  variant?: ProductVariant;
  price: number;
  url: string;
}): string {
  const lines = [opts.greeting.trim() || '¡Hola! Quiero hacer un pedido.', '', `• Producto: ${opts.product.name}`];
  if (opts.variant) lines.push(`• Opción: ${opts.variant.name}`);
  lines.push(`• Precio: ${formatCOP(opts.price)}`, `• Enlace: ${opts.url}`);
  return lines.join('\n');
}
