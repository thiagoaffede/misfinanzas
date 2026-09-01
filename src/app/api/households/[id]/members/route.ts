import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const r = await db.query(
    `select m.id as member_id, m.user_id, u.name, u.email, m.role
     from household_members m join users u on u.id = m.user_id
     where m.household_id=$1 order by u.name`,
    [id]
  );
  return NextResponse.json({ members: r.rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const membership = await requireMembership(user.id, id);
  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el admin puede agregar miembros' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();
  if (!email) return NextResponse.json({ error: 'Email obligatorio' }, { status: 400 });

  const target = await db.query('select id, name from users where email=$1', [email]);
  if (!target.rows.length) return NextResponse.json({ error: 'No existe usuario con ese email' }, { status: 404 });

  const exists = await db.query('select id from household_members where household_id=$1 and user_id=$2', [id, target.rows[0].id]);
  if (exists.rows.length) return NextResponse.json({ error: 'Ese usuario ya pertenece al hogar' }, { status: 409 });

  await db.query('insert into household_members (household_id, user_id, role) values ($1,$2,$3)', [id, target.rows[0].id, 'member']);
  return NextResponse.json({ ok: true });
}
