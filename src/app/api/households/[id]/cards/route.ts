import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';

type CardRow = {
  id: string;
  name: string;
  type: string;
  cutoff_day: number;
  limit_amount: string;
  last4: string | null;
  active: boolean;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const r = await db.query(
    'select * from cards where household_id=$1 order by active desc, name',
    [id]
  );
  return NextResponse.json({ cards: r.rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = body.type === 'debit' ? 'debit' : 'credit';
  if (!name) return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 });
  const r = await db.query(
    `insert into cards (household_id, name, type, cutoff_day, limit_amount, last4, active)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [
      id,
      name,
      type,
      Math.min(31, Math.max(1, Number(body.cutoffDay) || 1)),
      Number(body.limitAmount) || 0,
      body.last4 ? String(body.last4).slice(-4) : null,
      body.active !== false,
    ]
  );
  return NextResponse.json({ ok: true, card: r.rows[0] });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const cardId = String(body.cardId || '');
  if (!cardId) return NextResponse.json({ error: 'cardId obligatorio' }, { status: 400 });
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.name !== undefined) {
    vals.push(String(body.name).trim());
    sets.push(`name=$${vals.length}`);
  }
  if (body.cutoffDay !== undefined) {
    vals.push(Math.min(31, Math.max(1, Number(body.cutoffDay) || 1)));
    sets.push(`cutoff_day=$${vals.length}`);
  }
  if (body.limitAmount !== undefined) {
    vals.push(Number(body.limitAmount) || 0);
    sets.push(`limit_amount=$${vals.length}`);
  }
  if (body.active !== undefined) {
    vals.push(body.active ? true : false);
    sets.push(`active=$${vals.length}`);
  }
  if (sets.length) {
    vals.push(cardId, id);
    const n = vals.length - 1;
    await db.query(`update cards set ${sets.join(', ')} where id=$${n} and household_id=$${n + 1}`, vals);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const cardId = new URL(req.url).searchParams.get('cardId');
  if (!cardId) return NextResponse.json({ error: 'cardId obligatorio' }, { status: 400 });
  await db.query('delete from cards where id=$1 and household_id=$2', [cardId, id]);
  return NextResponse.json({ ok: true });
}
