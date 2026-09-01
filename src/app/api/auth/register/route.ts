import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signSession } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const existing = await db.query('select id from users where email=$1', [email]);
  if (existing.rows.length) {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const user = await db.query(
    'insert into users (email, password_hash, name) values ($1,$2,$3) returning id, name',
    [email, hash, name]
  );
  const userId = user.rows[0].id;
  const token = await signSession({ id: userId, email, name });

  const res = NextResponse.json({ ok: true, id: userId, name });
  res.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
