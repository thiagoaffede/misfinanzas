import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const r = await db.query(
    `select r.*, c.name as category_name from recurring_expenses r
     left join categories c on c.id = r.category_id
     where r.household_id=$1 order by r.title`,
    [id]
  );
  return NextResponse.json({ recurring: r.rows.map((x: any) => ({ ...x, amount: Number(x.amount) })) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const title = String(body.title || '');
  if (!title || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Título y monto válido obligatorios' }, { status: 400 });
  }
  const r = await db.query(
    `insert into recurring_expenses (household_id, title, amount, category_id, day_of_month, active)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [id, title, amount, body.categoryId ? String(body.categoryId) : null, Number(body.dayOfMonth) || 1, body.active !== false]
  );
  return NextResponse.json({ ok: true, recurring: { ...r.rows[0], amount: Number(r.rows[0].amount) } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const rid = String(body.id || '');
  if (!rid) return NextResponse.json({ error: 'id obligatorio' }, { status: 400 });
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.active !== undefined) {
    vals.push(body.active ? true : false);
    sets.push(`active=$${vals.length}`);
  }
  if (body.title) {
    vals.push(String(body.title));
    sets.push(`title=$${vals.length}`);
  }
  if (sets.length) {
    vals.push(rid, id);
    const n = vals.length - 1;
    await db.query(
      `update recurring_expenses set ${sets.join(', ')} where id=$${n} and household_id=$${n + 1}`,
      vals
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const rid = new URL(req.url).searchParams.get('id');
  if (!rid) return NextResponse.json({ error: 'id obligatorio' }, { status: 400 });
  await db.query('delete from recurring_expenses where id=$1 and household_id=$2', [rid, id]);
  return NextResponse.json({ ok: true });
}
