import type { Theme } from './theme';

/** Tema de Artelicat: el sistema de la landing (ver DESIGN.md de artelicat-landing). */
export const ARTELICAT_THEME: Theme = {
  colors: {
    ink: '#2b1d3f', // Tinta Borahae
    canvas: '#fbf6fa', // Nube Lila
    surface: '#efe4f6', // Lavanda Suave
    band: '#b79cf2', // Borahae
    season: '#c73a36', // Rojo Arirang
    onSeason: '#fbf6fa',
    cta: '#ffd65c', // Butter
    accent: '#e7b8f0', // Orquídea
  },
  fonts: { body: 'ibm-plex-serif', display: 'cormorant-garamond', badge: 'inter' },
  shape: { radiusButtons: 10, radiusImages: 20 },
  type: { displayTracking: -0.03, displayLeading: 0.9, italicAccent: true },
  art: 'layer-heart',
};

/**
 * Tema provisional de Pochi Craft 3D mientras no tenga identidad visual:
 * cielo, pasto, arena y tierra, con una tipografía pixelada solo en titulares.
 */
export const POCHI_THEME: Theme = {
  colors: {
    ink: '#1d2a1a', // musgo oscuro
    canvas: '#f6f4ec', // papel
    surface: '#e4d6b4', // arena
    band: '#9fd3ea', // cielo
    season: '#7a4a26', // tierra
    onSeason: '#f6f4ec',
    cta: '#f4c542', // oro
    accent: '#6fae3f', // pasto
  },
  fonts: { body: 'rubik', display: 'pixelify-sans', badge: 'pixelify-sans' },
  shape: { radiusButtons: 4, radiusImages: 8 },
  type: { displayTracking: 0, displayLeading: 1, italicAccent: false },
  art: 'voxel-stack',
};

/** Respaldo si el tema guardado de una tienda llegara a ser inválido. */
export const DEFAULT_THEME = ARTELICAT_THEME;
