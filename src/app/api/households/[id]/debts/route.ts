import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';
import { getDebts } from '@/lib/finance';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const debts = await getDebts(id);
  return NextResponse.json({ debts });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const fromMemberId = String(body.fromMemberId || '');
  const toMemberId = String(body.toMemberId || '');
  const amount = Number(body.amount);
  if (!fromMemberId || !toMemberId || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  await db.query(
    'insert into settlements (household_id, from_member_id, to_member_id, amount, note) values ($1,$2,$3,$4,$5)',
    [id, fromMemberId, toMemberId, amount, String(body.note || '')]
  );
  return NextResponse.json({ ok: true });
}
