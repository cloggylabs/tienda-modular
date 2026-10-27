// Fotos de cada tienda: el archivo va a R2 (binding MEDIA) y sus datos a la tabla media.
import { env } from 'cloudflare:workers';
import { and, desc, eq, sql } from 'drizzle-orm';
import { blocks, collections, media, products, type Media } from '../../db/schema';
import { BLOCK_LABELS } from '../contenido/blocks';
import type { Db } from '../../lib/db';

/** Tipos aceptados. SVG queda fuera a propósito: puede contener scripts. */
export const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};
export const MAX_BYTES = 5 * 1024 * 1024;

/** Ruta pública con la que la tienda muestra la foto. */
export const mediaUrl = (m: Pick<Media, 'key'>) => `/media/${m.key}`;

export function listMedia(db: Db, storeId: number) {
  return db.select().from(media).where(eq(media.storeId, storeId)).orderBy(desc(media.createdAt), desc(media.id)).all();
}

export function getMedia(db: Db, storeId: number, id: number) {
  return db.query.media.findFirst({ where: and(eq(media.id, id), eq(media.storeId, storeId)) });
}

/** Revisa los primeros bytes: el tipo que declara el navegador no basta. */
export function sniffType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'image/avif';
  if (ascii(0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

export type UploadResult = { ok: true; media: Media } | { ok: false; error: string };

export async function uploadMedia(
  db: Db,
  storeId: number,
  file: File,
  meta: { alt: string; width?: number; height?: number },
): Promise<UploadResult> {
  if (!file || typeof file === 'string' || file.size === 0) return { ok: false, error: 'Elige una foto para subir.' };
  if (file.size > MAX_BYTES) return { ok: false, error: `«${file.name}» pesa más de 5 MB.` };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type || !ALLOWED_TYPES[type]) {
    return { ok: false, error: `«${file.name}» no es una foto JPG, PNG, WebP o AVIF.` };
  }

  const key = `tiendas/${storeId}/${crypto.randomUUID()}.${ALLOWED_TYPES[type]}`;
  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
  });

  const dim = (n?: number) => (Number.isInteger(n) && n! > 0 && n! < 20000 ? n : null);
  const row = await db
    .insert(media)
    .values({
      storeId,
      key,
      filename: file.name.slice(0, 200),
      contentType: type,
      size: bytes.byteLength,
      width: dim(meta.width),
      height: dim(meta.height),
      alt: meta.alt.slice(0, 200),
    })
    .returning()
    .get();
  return { ok: true, media: row };
}

export async function updateMediaAlt(db: Db, storeId: number, id: number, alt: string) {
  await db
    .update(media)
    .set({ alt: alt.trim().slice(0, 200) })
    .where(and(eq(media.id, id), eq(media.storeId, storeId)));
}

/** Dónde se usa esta foto (bloques, productos, colecciones), para no borrar algo que se está mostrando. */
export async function mediaUsage(db: Db, storeId: number, m: Media): Promise<string[]> {
  const url = mediaUrl(m);
  // instr() y no LIKE: D1 limita los patrones de LIKE a 50 caracteres y la ruta de una foto es más larga.
  // (Además, like() de Drizzle convertiría el patrón a JSON por ser una columna JSON.)
  const [b, p, c] = await Promise.all([
    db
      .select({ type: blocks.type })
      .from(blocks)
      .where(and(eq(blocks.storeId, storeId), sql`instr(${blocks.props}, ${url}) > 0`))
      .all(),
    db
      .select({ name: products.name })
      .from(products)
      .where(and(eq(products.storeId, storeId), sql`instr(${products.images}, ${url}) > 0`))
      .all(),
    db
      .select({ name: collections.name })
      .from(collections)
      .where(and(eq(collections.storeId, storeId), eq(collections.image, url)))
      .all(),
  ]);
  return [
    ...b.map((x) => `el bloque «${BLOCK_LABELS[x.type] ?? x.type}»`),
    ...p.map((x) => `el producto «${x.name}»`),
    ...c.map((x) => `la colección «${x.name}»`),
  ];
}

export async function deleteMedia(db: Db, storeId: number, m: Media) {
  await env.MEDIA.delete(m.key);
  await db.delete(media).where(and(eq(media.id, m.id), eq(media.storeId, storeId)));
}
