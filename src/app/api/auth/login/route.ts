import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, signSession } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');

  const r = await db.query('select id, email, name, password_hash from users where email=$1', [email]);
  if (!r.rows.length) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }
  const u = r.rows[0];
  const ok = await verifyPassword(password, u.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = await signSession({ id: u.id, email: u.email, name: u.name });
  const res = NextResponse.json({ ok: true, id: u.id, name: u.name });
  res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
