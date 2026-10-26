// Tema por tienda: colores, tipografías y forma. Se guarda como JSON en stores.theme
// y se inyecta como variables CSS en cada página de la tienda.

export const COLOR_KEYS = ['ink', 'canvas', 'surface', 'band', 'season', 'onSeason', 'cta', 'accent'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const COLOR_LABELS: Record<ColorKey, { label: string; help: string }> = {
  ink: { label: 'Tinta', help: 'Texto, bordes e iconos sobre fondos claros. Evita el negro puro.' },
  canvas: { label: 'Fondo', help: 'Color de fondo por defecto de la tienda.' },
  surface: { label: 'Superficie', help: 'Bandas alternas, footer y chips.' },
  band: { label: 'Banda de marca', help: 'Hero y bandas editoriales a sangre. Lleva texto en Tinta.' },
  season: { label: 'Banda de temporada', help: 'Promos con fecha (Halloween, Navidad…). Máximo una por página.' },
  onSeason: { label: 'Texto sobre temporada', help: 'Color del texto encima de la banda de temporada.' },
  cta: { label: 'Botón principal', help: 'Único relleno de botón. Lleva texto en Tinta.' },
  accent: { label: 'Acento', help: 'Decoración poco frecuente: marcadores de foto, ilustraciones.' },
};

/** Pares que deben ser legibles: [texto, fondo, contraste mínimo WCAG]. */
export const CONTRAST_PAIRS: { fg: ColorKey; bg: ColorKey; min: number; label: string }[] = [
  { fg: 'ink', bg: 'canvas', min: 4.5, label: 'Tinta sobre fondo' },
  { fg: 'ink', bg: 'surface', min: 4.5, label: 'Tinta sobre superficie' },
  { fg: 'ink', bg: 'band', min: 4.5, label: 'Tinta sobre banda de marca' },
  { fg: 'ink', bg: 'cta', min: 4.5, label: 'Tinta sobre botón principal' },
  { fg: 'onSeason', bg: 'season', min: 4.5, label: 'Texto sobre banda de temporada' },
];

/** Tipografías disponibles. Solo estas se cargan, así que el tema no puede pedir otra. */
export const FONTS = {
  'ibm-plex-serif': { label: 'IBM Plex Serif', stack: "'IBM Plex Serif', Georgia, 'Times New Roman', serif" },
  'cormorant-garamond': { label: 'Cormorant Garamond', stack: "'Cormorant Garamond', Garamond, Georgia, serif" },
  inter: { label: 'Inter', stack: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  // Su ligadura «fi» se parece a una «ñ» («prefieras» se lee «preñeras»), así que va sin ligaduras.
  'pixelify-sans': { label: 'Pixelify Sans (pixel)', stack: "'Pixelify Sans', ui-monospace, monospace", noLigatures: true },
  rubik: { label: 'Rubik', stack: "'Rubik', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
} as const;
export type FontKey = keyof typeof FONTS;
export const FONT_ROLES = ['body', 'display', 'badge'] as const;
export type FontRole = (typeof FONT_ROLES)[number];
export const FONT_ROLE_LABELS: Record<FontRole, string> = {
  body: 'Texto de lectura y botones',
  display: 'Titulares grandes',
  badge: 'Micro-etiquetas',
};

export const ART_OPTIONS = {
  'layer-heart': 'Corazón de capas',
  'voxel-stack': 'Bloques de vóxeles',
  none: 'Sin ilustración',
} as const;
export type ArtKey = keyof typeof ART_OPTIONS;

export interface Theme {
  colors: Record<ColorKey, string>;
  fonts: Record<FontRole, FontKey>;
  shape: {
    /** px */
    radiusButtons: number;
    /** px */
    radiusImages: number;
  };
  type: {
    /** em, negativo aprieta los titulares */
    displayTracking: number;
    /** interlineado de titulares */
    displayLeading: number;
    /** Pone la segunda línea del titular en cursiva (solo si la fuente la tiene). */
    italicAccent: boolean;
  };
  /** Ilustración del hero mientras no haya fotos. */
  art: ArtKey;
}

export const LIMITS = {
  radiusButtons: [0, 32],
  radiusImages: [0, 48],
  displayTracking: [-0.06, 0.1],
  displayLeading: [0.8, 1.4],
} as const;

const HEX = /^#[0-9a-f]{6}$/i;

/** Valida un tema venido de la base de datos o de un formulario. Devuelve errores legibles. */
export function validateTheme(input: unknown): { ok: true; theme: Theme } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const t = (input ?? {}) as Partial<Theme>;

  const colors = {} as Record<ColorKey, string>;
  for (const key of COLOR_KEYS) {
    const value = String(t.colors?.[key] ?? '').trim();
    if (!HEX.test(value)) errors.push(`${COLOR_LABELS[key].label}: usa un color en formato #rrggbb.`);
    colors[key] = value.toLowerCase();
  }

  const fonts = {} as Record<FontRole, FontKey>;
  for (const role of FONT_ROLES) {
    const value = t.fonts?.[role];
    if (!value || !(value in FONTS)) errors.push(`${FONT_ROLE_LABELS[role]}: tipografía no disponible.`);
    fonts[role] = value as FontKey;
  }

  const num = (value: unknown, [min, max]: readonly [number, number], label: string) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) errors.push(`${label}: debe estar entre ${min} y ${max}.`);
    return n;
  };

  const shape = {
    radiusButtons: num(t.shape?.radiusButtons, LIMITS.radiusButtons, 'Radio de botones'),
    radiusImages: num(t.shape?.radiusImages, LIMITS.radiusImages, 'Radio de imágenes'),
  };
  const type = {
    displayTracking: num(t.type?.displayTracking, LIMITS.displayTracking, 'Espaciado de titulares'),
    displayLeading: num(t.type?.displayLeading, LIMITS.displayLeading, 'Interlineado de titulares'),
    italicAccent: Boolean(t.type?.italicAccent),
  };

  const art = t.art && t.art in ART_OPTIONS ? t.art : null;
  if (!art) errors.push('Ilustración del hero: opción no válida.');

  if (errors.length) return { ok: false, errors };
  return { ok: true, theme: { colors, fonts, shape, type, art: art as ArtKey } };
}

const ligatures = (key: FontKey) => ('noLigatures' in FONTS[key] ? 'no-common-ligatures' : 'normal');

/** Variables CSS del tema. Solo recibe un tema ya validado, así que nada puede romper el <style>. */
export function themeVars(theme: Theme): Record<string, string> {
  const c = theme.colors;
  return {
    '--color-ink': c.ink,
    '--color-canvas': c.canvas,
    '--color-surface': c.surface,
    '--color-band': c.band,
    '--color-season': c.season,
    '--color-on-season': c.onSeason,
    '--color-cta': c.cta,
    '--color-accent': c.accent,
    '--font-body': FONTS[theme.fonts.body].stack,
    '--font-display': FONTS[theme.fonts.display].stack,
    '--font-badge': FONTS[theme.fonts.badge].stack,
    '--ligatures-body': ligatures(theme.fonts.body),
    '--ligatures-display': ligatures(theme.fonts.display),
    '--ligatures-badge': ligatures(theme.fonts.badge),
    '--radius-buttons': `${theme.shape.radiusButtons}px`,
    '--radius-inputs': `${theme.shape.radiusButtons}px`,
    '--radius-images': `${theme.shape.radiusImages}px`,
    '--tracking-display': `${theme.type.displayTracking}em`,
    '--leading-display': String(theme.type.displayLeading),
    '--accent-style': theme.type.italicAccent ? 'italic' : 'normal',
  };
}

export function themeToCss(theme: Theme): string {
  return `:root{${Object.entries(themeVars(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;
}

// --- Contraste WCAG ---

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function contrastReport(theme: Theme) {
  return CONTRAST_PAIRS.map((p) => {
    const ratio = contrastRatio(theme.colors[p.fg], theme.colors[p.bg]);
    return { ...p, ratio, ok: ratio >= p.min };
  });
}
