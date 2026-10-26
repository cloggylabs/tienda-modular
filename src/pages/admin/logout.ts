import type { APIRoute } from 'astro';
import { destroySession } from '../../lib/auth';
import { getDb } from '../../lib/db';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(getDb(), cookies);
  return redirect('/admin/login');
};
