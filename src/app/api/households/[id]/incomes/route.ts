import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';
import { localDate } from '@/lib/date';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const r = await db.query(
    `select i.*, c.name as category_name
     from incomes i left join categories c on c.id = i.category_id
     where i.household_id=$1 order by i.income_date desc, i.created_at desc`,
    [id]
  );
  return NextResponse.json({ incomes: r.rows.map((x: any) => ({ ...x, amount: Number(x.amount) })) });
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
    `insert into incomes (household_id, user_id, category_id, title, amount, income_date, is_recurring)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [
      id,
      user.id,
      body.categoryId ? String(body.categoryId) : null,
      title,
      amount,
      String(body.incomeDate || localDate()),
      body.isRecurring ? true : false,
    ]
  );
  return NextResponse.json({ ok: true, income: { ...r.rows[0], amount: Number(r.rows[0].amount) } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const incomeId = new URL(req.url).searchParams.get('incomeId');
  if (!incomeId) return NextResponse.json({ error: 'incomeId obligatorio' }, { status: 400 });
  await db.query('delete from incomes where id=$1 and household_id=$2', [incomeId, id]);
  return NextResponse.json({ ok: true });
}
