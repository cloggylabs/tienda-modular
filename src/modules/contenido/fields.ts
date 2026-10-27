// Campos editables de cada tipo de bloque. Un solo formulario genérico (BlockFields.astro)
// los pinta y parseBlockForm los convierte en props validadas. Para un bloque nuevo basta
// con agregar su tipo en blocks.ts, su componente y su lista de campos aquí.
import type { BlockPropsByType, BlockType, LinkTarget } from './blocks';

type SubField =
  | { kind: 'text'; name: string; label: string; max?: number; required?: boolean }
  | { kind: 'textarea'; name: string; label: string; max?: number }
  | { kind: 'select'; name: string; label: string; options: Record<string, string> }
  | { kind: 'number'; name: string; label: string; min: number; max: number }
  | { kind: 'checkbox'; name: string; label: string };

export type Field =
  | { kind: 'text'; name: string; label: string; help?: string; max?: number; required?: boolean }
  | { kind: 'textarea'; name: string; label: string; help?: string; max?: number; required?: boolean }
  | { kind: 'anchor'; name: string; label: string; help?: string }
  | { kind: 'link'; name: string; label: string; help?: string; optional?: boolean }
  | { kind: 'lines'; name: string; label: string; help?: string; maxItems: number }
  | { kind: 'repeat'; name: string; label: string; help?: string; rows: number; minItems?: number; fields: SubField[] }
  | { kind: 'image'; name: string; label: string; help?: string }
  | { kind: 'select'; name: string; label: string; help?: string; options: Record<string, string> }
  | { kind: 'checkbox'; name: string; label: string; help?: string }
  | { kind: 'datetime'; name: string; label: string; help?: string }
  | { kind: 'number'; name: string; label: string; help?: string; min: number; max: number }
  /** Elige una colección o categoría existente de la tienda (por slug). */
  | { kind: 'ref'; name: string; label: string; help?: string; ref: 'collection' | 'category' | 'any' };

const ANCHOR_HELP = 'Opcional. Una palabra sin espacios (ej. hacemos) para enlazarla desde el menú como #hacemos.';

export const BLOCK_FIELDS: { [K in BlockType]: Field[] } = {
  hero: [
    { kind: 'text', name: 'badge', label: 'Etiqueta superior', max: 60 },
    { kind: 'text', name: 'title', label: 'Titular', required: true, max: 80 },
    { kind: 'text', name: 'titleAccent', label: 'Segunda línea del titular', help: 'Opcional. Va en cursiva si el tema lo permite.', max: 80 },
    { kind: 'textarea', name: 'body', label: 'Texto', max: 400 },
    { kind: 'link', name: 'primary', label: 'Botón principal' },
    { kind: 'link', name: 'secondary', label: 'Botón secundario', optional: true },
  ],
  promo: [
    { kind: 'text', name: 'badge', label: 'Etiqueta superior', max: 60 },
    { kind: 'text', name: 'title', label: 'Titular', required: true, max: 90 },
    { kind: 'textarea', name: 'body', label: 'Texto', max: 400 },
    { kind: 'link', name: 'cta', label: 'Botón' },
    { kind: 'datetime', name: 'startsAt', label: 'Se muestra desde', help: 'Hora de Colombia. Vacío: desde ya.' },
    { kind: 'datetime', name: 'until', label: 'Se muestra hasta', help: 'Hora de Colombia. Vacío: sin fecha de fin.' },
  ],
  split: [
    { kind: 'anchor', name: 'anchor', label: 'Ancla para el menú', help: ANCHOR_HELP },
    { kind: 'text', name: 'badge', label: 'Etiqueta superior', max: 60 },
    { kind: 'text', name: 'title', label: 'Titular', required: true, max: 90 },
    { kind: 'textarea', name: 'body', label: 'Texto', max: 500 },
    { kind: 'lines', name: 'items', label: 'Lista', help: 'Un elemento por línea (máximo 8).', maxItems: 8 },
    { kind: 'link', name: 'link', label: 'Enlace al final' },
    { kind: 'image', name: 'image', label: 'Foto', help: 'Sin foto se muestra un marcador de color con el rótulo.' },
    { kind: 'checkbox', name: 'reverse', label: 'Foto a la izquierda' },
    { kind: 'select', name: 'tone', label: 'Fondo', options: { canvas: 'Fondo de la tienda', surface: 'Superficie' } },
  ],
  keywords: [
    { kind: 'text', name: 'label', label: 'Descripción para lectores de pantalla', required: true, max: 80 },
    {
      kind: 'repeat',
      name: 'words',
      label: 'Palabras',
      help: 'Deja vacías las filas que no uses. Inclinación entre -8 y 8 grados.',
      rows: 12,
      minItems: 1,
      fields: [
        { kind: 'text', name: 'text', label: 'Palabra', max: 30, required: true },
        { kind: 'select', name: 'size', label: 'Tamaño', options: { sm: 'Pequeña', md: 'Mediana', lg: 'Grande' } },
        { kind: 'number', name: 'rotate', label: 'Inclinación', min: -8, max: 8 },
        { kind: 'checkbox', name: 'circled', label: 'En óvalo' },
      ],
    },
  ],
  how_to_buy: [
    { kind: 'anchor', name: 'anchor', label: 'Ancla para el menú', help: ANCHOR_HELP },
    { kind: 'text', name: 'badge', label: 'Etiqueta superior', max: 60 },
    { kind: 'text', name: 'title', label: 'Titular', required: true, max: 80 },
    {
      kind: 'repeat',
      name: 'steps',
      label: 'Pasos',
      help: 'Deja vacíos los pasos que no uses.',
      rows: 4,
      minItems: 1,
      fields: [
        { kind: 'text', name: 'title', label: 'Paso', max: 40, required: true },
        { kind: 'textarea', name: 'body', label: 'Descripción', max: 300 },
      ],
    },
    { kind: 'link', name: 'cta', label: 'Botón' },
  ],
  products: [
    { kind: 'text', name: 'badge', label: 'Etiqueta superior', max: 60 },
    { kind: 'text', name: 'title', label: 'Titular', required: true, max: 80 },
    {
      kind: 'select',
      name: 'source',
      label: 'Qué productos mostrar',
      options: {
        featured: 'Destacados',
        latest: 'Los más recientes',
        collection: 'Los de una colección',
        category: 'Los de una categoría',
      },
    },
    { kind: 'ref', name: 'ref', label: 'Colección o categoría', ref: 'any', help: 'Solo aplica si elegiste una colección o una categoría.' },
    { kind: 'number', name: 'limit', label: 'Cuántos mostrar', min: 2, max: 12 },
    { kind: 'text', name: 'linkLabel', label: 'Texto del enlace «ver todo»', help: 'Vacío lo oculta.', max: 40 },
    { kind: 'select', name: 'tone', label: 'Fondo', options: { canvas: 'Fondo de la tienda', surface: 'Superficie' } },
  ],
};

/** Contenido de un bloque recién creado, para que nunca nazca vacío. */
export const BLOCK_DEFAULTS: { [K in BlockType]: BlockPropsByType[K] } = {
  hero: {
    badge: 'Hecho en Colombia',
    title: 'Un titular que inspire',
    body: 'Cuenta en una o dos frases qué haces y para quién.',
    primary: { to: 'whatsapp', label: 'Pedir por WhatsApp' },
  },
  promo: {
    badge: 'Temporada',
    title: 'Nueva colección de temporada',
    body: 'Cuenta qué incluye y hasta cuándo está disponible.',
    cta: { to: 'whatsapp', label: 'Quiero la colección' },
  },
  split: {
    badge: 'Sección',
    title: 'Título de la sección',
    body: 'Describe esta línea de productos.',
    items: [],
    link: { to: 'whatsapp', label: 'Cotizar' },
    image: { alt: '', label: 'Foto' },
  },
  keywords: {
    label: 'Lo que puedes encontrar',
    words: [
      { text: 'Llaveros', size: 'lg', rotate: -2 },
      { text: 'Stickers', size: 'md', rotate: 2 },
    ],
  },
  how_to_buy: {
    badge: 'Cómo comprar',
    title: 'Tres pasos y es tuyo.',
    steps: [{ title: 'Escríbenos', body: 'Cuéntanos qué quieres por WhatsApp.' }],
    cta: { to: 'whatsapp', label: 'Hacer mi pedido' },
  },
  products: {
    badge: 'Catálogo',
    title: 'Los favoritos de la casa',
    source: 'featured',
    limit: 4,
    linkLabel: 'Ver todo el catálogo',
  },
};

// --- Fechas: el panel trabaja en hora de Colombia (UTC-5, sin horario de verano) ---
const BOGOTA_OFFSET = '-05:00';

export function isoToLocalInput(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t - 5 * 3600_000).toISOString().slice(0, 16);
}

function localInputToIso(value: string): string | undefined | null {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const iso = `${value}:00${BOGOTA_OFFSET}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

// --- Lectura del formulario ---

const SAFE_HREF = /^(#[\w-]*|\/[^\s]*|https:\/\/[^\s]+)$/;
const ANCHOR = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MEDIA_SRC = /^\/media\/tiendas\/\d+\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;

export type ParseResult<K extends BlockType> =
  | { ok: true; props: BlockPropsByType[K] }
  | { ok: false; errors: string[]; draft: Record<string, unknown> };

export function parseBlockForm<K extends BlockType>(type: K, form: FormData): ParseResult<K> {
  const errors: string[] = [];
  const props: Record<string, unknown> = {};
  const get = (key: string) => String(form.get(`f.${key}`) ?? '').trim();

  const text = (key: string, label: string, max = 500, required = false) => {
    const v = get(key);
    if (required && !v) errors.push(`${label}: es obligatorio.`);
    if (v.length > max) errors.push(`${label}: máximo ${max} caracteres.`);
    return v;
  };

  for (const field of BLOCK_FIELDS[type]) {
    switch (field.kind) {
      case 'text':
      case 'textarea': {
        const v = text(field.name, field.label, field.max, field.required);
        if (v || field.required) props[field.name] = v;
        break;
      }
      case 'anchor': {
        const v = get(field.name).toLowerCase();
        if (v && !ANCHOR.test(v)) errors.push(`${field.label}: usa solo letras minúsculas, números y guiones, sin espacios.`);
        if (v) props[field.name] = v;
        break;
      }
      case 'link': {
        const to = get(`${field.name}.to`);
        const label = text(`${field.name}.label`, `${field.label} (texto)`, 40);
        if (field.optional && (to === 'none' || !to)) break;
        if (!label) errors.push(`${field.label}: escribe el texto del botón.`);
        let link: LinkTarget;
        if (to === 'instagram') link = { to, label };
        else if (to === 'url') {
          const href = get(`${field.name}.href`);
          if (!SAFE_HREF.test(href)) errors.push(`${field.label}: la dirección debe empezar por #, / o https://.`);
          link = { to, label, href };
        } else {
          const message = text(`${field.name}.message`, `${field.label} (mensaje)`, 200);
          link = message ? { to: 'whatsapp', label, message } : { to: 'whatsapp', label };
        }
        props[field.name] = link;
        break;
      }
      case 'lines': {
        const items = get(field.name)
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (items.length > field.maxItems) errors.push(`${field.label}: máximo ${field.maxItems} elementos.`);
        if (items.some((i) => i.length > 120)) errors.push(`${field.label}: cada elemento debe tener máximo 120 caracteres.`);
        props[field.name] = items.slice(0, field.maxItems);
        break;
      }
      case 'repeat': {
        const rows: Record<string, unknown>[] = [];
        for (let i = 0; i < field.rows; i++) {
          const row: Record<string, unknown> = {};
          let filled = false;
          for (const sub of field.fields) {
            const key = `${field.name}.${i}.${sub.name}`;
            const raw = get(key);
            if (sub.kind === 'checkbox') {
              if (form.get(`f.${key}`) === 'on') row[sub.name] = true;
            } else if (sub.kind === 'number') {
              const n = raw === '' ? 0 : Number(raw);
              if (!Number.isFinite(n) || n < sub.min || n > sub.max)
                errors.push(`${field.label} ${i + 1}: ${sub.label.toLowerCase()} debe estar entre ${sub.min} y ${sub.max}.`);
              if (n) row[sub.name] = n;
            } else if (sub.kind === 'select') {
              row[sub.name] = raw in sub.options ? raw : Object.keys(sub.options)[0];
            } else {
              if (raw.length > (sub.max ?? 500)) errors.push(`${field.label} ${i + 1}: ${sub.label.toLowerCase()} es demasiado largo.`);
              if (raw) {
                row[sub.name] = raw;
                filled = true;
              }
            }
          }
          if (!filled) continue;
          const missing = field.fields.find((s) => 'required' in s && s.required && !row[s.name]);
          if (missing) errors.push(`${field.label} ${i + 1}: falta ${missing.label.toLowerCase()}.`);
          if (field.name === 'steps' && !row.body) row.body = '';
          rows.push(row);
        }
        if (rows.length < (field.minItems ?? 0)) errors.push(`${field.label}: agrega al menos ${field.minItems}.`);
        props[field.name] = rows;
        break;
      }
      case 'image': {
        const src = get(`${field.name}.src`);
        if (src && !MEDIA_SRC.test(src)) errors.push(`${field.label}: elige una foto de la biblioteca.`);
        const alt = text(`${field.name}.alt`, `${field.label} (descripción)`, 200);
        const label = text(`${field.name}.label`, `${field.label} (rótulo)`, 40);
        props[field.name] = { ...(src ? { src } : {}), alt, label: label || 'Foto' };
        break;
      }
      case 'select': {
        const v = get(field.name);
        props[field.name] = v in field.options ? v : Object.keys(field.options)[0];
        break;
      }
      case 'checkbox':
        if (form.get(`f.${field.name}`) === 'on') props[field.name] = true;
        break;
      case 'number': {
        const raw = get(field.name);
        const n = Number(raw);
        if (!raw || !Number.isInteger(n) || n < field.min || n > field.max)
          errors.push(`${field.label}: debe ser un número entre ${field.min} y ${field.max}.`);
        props[field.name] = Number.isInteger(n) ? n : field.min;
        break;
      }
      case 'ref': {
        const v = get(field.name);
        if (v && !/^(collection|category):[a-z0-9-]{1,60}$/.test(v)) errors.push(`${field.label}: opción no válida.`);
        if (v) props[field.name] = v;
        break;
      }
      case 'datetime': {
        const iso = localInputToIso(get(field.name));
        if (iso === null) errors.push(`${field.label}: fecha no válida.`);
        else if (iso) props[field.name] = iso;
        break;
      }
    }
  }

  if (type === 'products') {
    const source = props.source as string;
    const ref = String(props.ref ?? '');
    if ((source === 'collection' || source === 'category') && !ref.startsWith(`${source}:`)) {
      errors.push(`Colección o categoría: elige ${source === 'collection' ? 'una colección' : 'una categoría'}.`);
    }
    if (source !== 'collection' && source !== 'category') delete props.ref;
  }

  if (type === 'promo' && props.startsAt && props.until && Date.parse(String(props.until)) <= Date.parse(String(props.startsAt))) {
    errors.push('La fecha de fin debe ser posterior a la de inicio.');
  }

  if (errors.length) return { ok: false, errors, draft: props };
  return { ok: true, props: props as unknown as BlockPropsByType[K] };
}
