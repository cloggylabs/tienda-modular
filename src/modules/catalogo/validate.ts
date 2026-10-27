// Lectura y validación de los formularios del catálogo en el panel.
import type { Availability, Product, ProductVariant } from '../../db/schema';
import { isoToLocalInput } from '../contenido/fields';
import { SLUG, slugify } from './format';
import type { CollectionInput, ProductInput } from './repo';

export const MAX_VARIANTS = 10;
export const MAX_IMAGES = 8;
const MAX_PRICE = 100_000_000;

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** "25.000", "$ 25000" o "25,000" → 25000. Vacío → null. NaN si no es un número válido. */
export function parsePrice(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  if (!/^\$?\s*[\d.,\s]+$/.test(value)) return NaN;
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : NaN;
}

/** Fecha local de Colombia (datetime-local) → Date. Vacío → null. */
export function parseLocalDate(raw: string): Date | null | undefined {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return undefined;
  const d = new Date(`${raw}:00-05:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
export const dateToLocalInput = (d: Date | null | undefined) => (d ? isoToLocalInput(d.toISOString()) : '');

function checkSlug(value: string, fallbackFrom: string, errors: string[]) {
  const slug = value ? value.toLowerCase() : slugify(fallbackFrom);
  if (!SLUG.test(slug)) errors.push('Dirección: usa solo letras minúsculas sin tildes, números y guiones.');
  return slug;
}

export interface ProductFormContext {
  storeId: number;
  categoryIds: number[];
}

export type ProductParse =
  | { ok: true; input: ProductInput; collectionIds: number[] }
  | { ok: false; errors: string[]; draft: Partial<Product> & { collectionIds: number[] } };

export function parseProductForm(form: FormData, ctx: ProductFormContext): ProductParse {
  const errors: string[] = [];
  const name = text(form, 'name');
  if (!name) errors.push('Nombre: es obligatorio.');
  if (name.length > 120) errors.push('Nombre: máximo 120 caracteres.');

  const slug = checkSlug(text(form, 'slug'), name, errors);

  const description = text(form, 'description');
  if (description.length > 3000) errors.push('Descripción: máximo 3000 caracteres.');

  const price = parsePrice(text(form, 'price'));
  if (price === null || Number.isNaN(price) || price <= 0 || price > MAX_PRICE) {
    errors.push('Precio: escribe el valor en pesos, por ejemplo 25.000.');
  }
  const compareAt = parsePrice(text(form, 'compareAtPrice'));
  if (compareAt !== null && (Number.isNaN(compareAt) || compareAt > MAX_PRICE)) {
    errors.push('Precio anterior: escribe el valor en pesos o déjalo vacío.');
  } else if (compareAt !== null && price && compareAt <= price) {
    errors.push('Precio anterior: debe ser mayor que el precio actual para mostrarse como descuento.');
  }

  const statusRaw = text(form, 'status');
  const status = (['draft', 'active', 'archived'] as const).find((s) => s === statusRaw) ?? 'draft';

  const categoryRaw = Number(text(form, 'categoryId'));
  const categoryId = ctx.categoryIds.includes(categoryRaw) ? categoryRaw : null;

  const availability: Availability = text(form, 'availability') === 'stock' ? 'stock' : 'made_to_order';
  const productionDays = text(form, 'productionDays');
  if (productionDays.length > 40) errors.push('Tiempo de producción: máximo 40 caracteres.');

  const intOrNull = (raw: string, label: string) => {
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 100_000) {
      errors.push(`${label}: escribe un número entero de 0 en adelante.`);
      return null;
    }
    return n;
  };
  let stock = availability === 'stock' ? intOrNull(text(form, 'stock'), 'Stock') : null;

  // Fotos: solo de la biblioteca de esta tienda; la principal va primero.
  const own = `/media/tiendas/${ctx.storeId}/`;
  const picked = form.getAll('images').map(String).filter((src) => src.startsWith(own) && /^[\w/.-]+$/.test(src));
  const main = text(form, 'mainImage');
  const images = [...new Set(main && picked.includes(main) ? [main, ...picked] : picked)];
  if (images.length > MAX_IMAGES) errors.push(`Fotos: máximo ${MAX_IMAGES} por producto.`);

  // Variantes: filas con nombre; las vacías se ignoran.
  const variants: ProductVariant[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < MAX_VARIANTS; i++) {
    const vName = text(form, `v.${i}.name`);
    const vPriceRaw = text(form, `v.${i}.price`);
    const vStockRaw = text(form, `v.${i}.stock`);
    if (!vName) {
      if (vPriceRaw || vStockRaw) errors.push(`Variante ${i + 1}: escribe su nombre o deja la fila vacía.`);
      continue;
    }
    if (vName.length > 60) errors.push(`Variante ${i + 1}: nombre de máximo 60 caracteres.`);
    if (seen.has(vName.toLowerCase())) errors.push(`Variante «${vName}»: está repetida.`);
    seen.add(vName.toLowerCase());
    const vPrice = parsePrice(vPriceRaw);
    if (vPrice !== null && (Number.isNaN(vPrice) || vPrice <= 0 || vPrice > MAX_PRICE)) {
      errors.push(`Variante «${vName}»: precio no válido.`);
    }
    const idRaw = text(form, `v.${i}.id`);
    const variant: ProductVariant = { id: /^[a-z0-9]{1,16}$/.test(idRaw) ? idRaw : crypto.randomUUID().slice(0, 8), name: vName };
    if (vPrice !== null && !Number.isNaN(vPrice)) variant.price = vPrice;
    if (availability === 'stock') {
      const s = intOrNull(vStockRaw, `Stock de «${vName}»`);
      variant.stock = s ?? 0;
    }
    variants.push(variant);
  }
  if (variants.length) stock = null; // el stock vive en cada variante

  const collectionIds = form
    .getAll('collections')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

  const input: ProductInput = {
    name,
    slug,
    description,
    price: price && !Number.isNaN(price) ? price : 0,
    compareAtPrice: compareAt && !Number.isNaN(compareAt) ? compareAt : null,
    status,
    categoryId,
    featured: form.get('featured') === 'on',
    availability,
    stock,
    productionDays: availability === 'made_to_order' ? productionDays : '',
    images: images.slice(0, MAX_IMAGES),
    variants,
  };

  if (errors.length) return { ok: false, errors, draft: { ...input, collectionIds } };
  return { ok: true, input, collectionIds };
}

export type CollectionParse = { ok: true; input: CollectionInput } | { ok: false; errors: string[]; draft: CollectionInput };

export function parseCollectionForm(form: FormData, storeId: number): CollectionParse {
  const errors: string[] = [];
  const name = text(form, 'name');
  if (!name) errors.push('Nombre: es obligatorio.');
  if (name.length > 80) errors.push('Nombre: máximo 80 caracteres.');
  const slug = checkSlug(text(form, 'slug'), name, errors);
  const description = text(form, 'description');
  if (description.length > 1000) errors.push('Descripción: máximo 1000 caracteres.');

  const imageRaw = text(form, 'image');
  const image = imageRaw && imageRaw.startsWith(`/media/tiendas/${storeId}/`) && /^[\w/.-]+$/.test(imageRaw) ? imageRaw : null;

  const startsAt = parseLocalDate(text(form, 'startsAt'));
  const endsAt = parseLocalDate(text(form, 'endsAt'));
  if (startsAt === undefined) errors.push('Desde: fecha no válida.');
  if (endsAt === undefined) errors.push('Hasta: fecha no válida.');
  if (startsAt && endsAt && endsAt <= startsAt) errors.push('La fecha de fin debe ser posterior a la de inicio.');

  const input: CollectionInput = {
    name,
    slug,
    description,
    image,
    startsAt: startsAt ?? null,
    endsAt: endsAt ?? null,
    enabled: form.get('enabled') === 'on',
  };
  return errors.length ? { ok: false, errors, draft: input } : { ok: true, input };
}
