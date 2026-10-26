/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Tienda que atiende esta petición (no existe en /admin). */
    store?: import('./db/schema').Store;
    /** Hay una vista previa activa (?tienda=...). */
    isPreview?: boolean;
    /** Persona con sesión en el panel. */
    user?: import('./db/schema').AdminUser | null;
  }
}
