import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const r = await db.query(
    'select id, name, type, icon, "isDefault", sort from categories where household_id=$1 order by type, sort, name',
    [id]
  );
  return NextResponse.json({ categories: r.rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '');
  if (!name || !['income', 'expense'].includes(type)) {
    return NextResponse.json({ error: 'Nombre y tipo (income/expense) obligatorios' }, { status: 400 });
  }
  const r = await db.query(
    'insert into categories (household_id, name, type, icon) values ($1,$2,$3,$4) returning id, name, type',
    [id, name, type, body.icon || 'tag']
  );
  return NextResponse.json({ ok: true, category: r.rows[0] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const catId = String(body.categoryId || '');
  const name = String(body.name || '').trim();
  if (!catId || !name) return NextResponse.json({ error: 'categoryId y name obligatorios' }, { status: 400 });
  await db.query('update categories set name=$1 where id=$2 and household_id=$3', [name, catId, id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const catId = new URL(req.url).searchParams.get('categoryId');
  if (!catId) return NextResponse.json({ error: 'categoryId obligatorio' }, { status: 400 });
  await db.query('delete from categories where id=$1 and household_id=$2', [catId, id]);
  return NextResponse.json({ ok: true });
}
