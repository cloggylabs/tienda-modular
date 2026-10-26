// Autenticación del panel: contraseñas con PBKDF2-SHA256 (Web Crypto, disponible en Workers)
// y sesiones con token aleatorio; en la base solo se guarda el SHA-256 del token.
import type { AstroCookies } from 'astro';
import { and, eq, gt, lt } from 'drizzle-orm';
import { adminSessions, adminUsers, type AdminUser } from '../db/schema';
import type { Db } from './db';

export const SESSION_COOKIE = 'tm_sesion';
const SESSION_DAYS = 30;
// Cloudflare Workers admite hasta 100 000 iteraciones de PBKDF2.
const PBKDF2_ITERATIONS = 100_000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const s = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iter || !salt || !hash) return false;
  const actual = await pbkdf2(password, fromBase64Url(salt), Number(iter));
  const expected = fromBase64Url(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

/** Hash ficticio para que un correo inexistente tarde lo mismo que uno real. */
let dummyHash: Promise<string> | undefined;

export function validatePassword(password: string): string | null {
  if (password.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (password.length > 200) return 'La contraseña es demasiado larga.';
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sha256(value: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

export type LoginResult = { ok: true; user: AdminUser } | { ok: false; error: string };

export async function attemptLogin(db: Db, emailInput: string, password: string): Promise<LoginResult> {
  const email = normalizeEmail(emailInput);
  const generic = 'Correo o contraseña incorrectos.';
  const user = await db.query.adminUsers.findFirst({ where: eq(adminUsers.email, email) });

  if (!user) {
    dummyHash ??= hashPassword('contraseña-ficticia');
    await verifyPassword(password, await dummyHash);
    return { ok: false, error: generic };
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return { ok: false, error: `Demasiados intentos. Vuelve a intentarlo en ${LOCK_MINUTES} minutos.` };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedAttempts + 1;
    const locked = failed >= MAX_FAILED_ATTEMPTS;
    await db
      .update(adminUsers)
      .set({
        failedAttempts: locked ? 0 : failed,
        lockedUntil: locked ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(adminUsers.id, user.id));
    return { ok: false, error: generic };
  }

  await db
    .update(adminUsers)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now })
    .where(eq(adminUsers.id, user.id));
  return { ok: true, user };
}

export async function createSession(db: Db, cookies: AstroCookies, userId: number, secure: boolean) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  // Limpieza oportunista de sesiones vencidas.
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  await db.insert(adminSessions).values({ id: await sha256(token), userId, expiresAt });
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    expires: expiresAt,
  });
}

export async function getSessionUser(db: Db, cookies: AstroCookies): Promise<AdminUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db
    .select({ user: adminUsers })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(and(eq(adminSessions.id, await sha256(token)), gt(adminSessions.expiresAt, new Date())))
    .get();
  return row?.user ?? null;
}

export async function destroySession(db: Db, cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.id, await sha256(token)));
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
