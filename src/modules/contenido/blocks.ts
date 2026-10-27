// Bloques de contenido. Cada tipo corresponde a un componente en src/modules/contenido/components.
// En la Fase 2 el panel podrá crear, ordenar y editar estos bloques.

/** Destino de un botón o enlace. */
export type LinkTarget =
  | { to: 'whatsapp'; label: string; message?: string }
  | { to: 'instagram'; label: string }
  | { to: 'url'; label: string; href: string };

export interface HeroProps {
  badge: string;
  title: string;
  /** Segunda línea emotiva del titular (va en cursiva si el tema lo permite). */
  titleAccent?: string;
  body: string;
  primary: LinkTarget;
  secondary?: LinkTarget;
}

export interface PromoProps {
  badge: string;
  title: string;
  body: string;
  cta: LinkTarget;
  /** ISO 8601 con zona horaria. La banda solo se muestra dentro de este rango. */
  startsAt?: string;
  until?: string;
}

export interface SplitProps {
  anchor?: string;
  badge: string;
  title: string;
  body: string;
  items: string[];
  link: LinkTarget;
  image: { src?: string; alt: string; label: string };
  reverse?: boolean;
  tone?: 'canvas' | 'surface';
}

export interface KeywordsProps {
  label: string;
  words: { text: string; size: 'sm' | 'md' | 'lg'; rotate?: number; circled?: boolean }[];
}

export interface HowToBuyProps {
  anchor?: string;
  badge: string;
  title: string;
  steps: { title: string; body: string }[];
  cta: LinkTarget;
}

export interface ProductsProps {
  badge: string;
  title: string;
  /** De dónde salen los productos. */
  source: 'featured' | 'latest' | 'collection' | 'category';
  /** slug de la colección o categoría cuando aplica. */
  ref?: string;
  limit: number;
  /** Texto del enlace «ver todo»; vacío lo oculta. */
  linkLabel?: string;
  tone?: 'canvas' | 'surface';
}

export interface BlockPropsByType {
  hero: HeroProps;
  promo: PromoProps;
  split: SplitProps;
  keywords: KeywordsProps;
  how_to_buy: HowToBuyProps;
  products: ProductsProps;
}
export type BlockType = keyof BlockPropsByType;
export type BlockProps = BlockPropsByType[BlockType];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Portada',
  promo: 'Banda de temporada',
  split: 'Sección con imagen',
  keywords: 'Nube de palabras',
  how_to_buy: 'Cómo comprar',
  products: 'Productos',
};

/** Una promo se muestra solo entre startsAt y until (si están definidos). */
export function isPromoActive(props: PromoProps, now = Date.now()): boolean {
  if (props.startsAt && now < Date.parse(props.startsAt)) return false;
  if (props.until && now > Date.parse(props.until)) return false;
  return true;
}
