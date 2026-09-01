import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';
import { createExpense, listExpenses } from '@/lib/finance';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const month = new URL(req.url).searchParams.get('month') || undefined;
  const rows = await listExpenses(id, month);
  return NextResponse.json({ expenses: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const membership = await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));

  try {
    const expense = await createExpense({
      householdId: id,
      categoryId: String(body.categoryId || ''),
      title: String(body.title || ''),
      amount: Number(body.amount),
      kind: body.kind === 'individual' ? 'individual' : 'joint',
      payerId: String(body.payerId || membership.member_id || '') || null,
      paymentMethod: ['cash', 'transfer', 'debit', 'credit'].includes(body.paymentMethod) ? body.paymentMethod : 'cash',
      cardId: body.cardId ? String(body.cardId) : null,
      installments: Number(body.installments) || 1,
      expenseDate: String(body.expenseDate || ''),
      createdBy: user.id,
      memberIds: Array.isArray(body.memberIds) ? body.memberIds : [],
    });
    return NextResponse.json({ ok: true, expense });
  } catch (e: any) {
    return NextResponse.json({ error: (e && e.message) || 'Error creando el gasto' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const expenseId = new URL(req.url).searchParams.get('expenseId');
  if (!expenseId) return NextResponse.json({ error: 'expenseId obligatorio' }, { status: 400 });
  await db.query('delete from expenses where id=$1 and household_id=$2', [expenseId, id]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const body = await req.json().catch(() => ({}));
  const expenseId = String(body.expenseId || '');
  if (!expenseId) return NextResponse.json({ error: 'expenseId obligatorio' }, { status: 400 });
  // marcar una cuota como pagada
  if (body.markPaid) {
    await db.query(
      `update expenses set paid_installments = paid_installments + 1
       where id=$1 and household_id=$2 and paid_installments < installments`,
      [expenseId, id]
    );
  }
  return NextResponse.json({ ok: true });
}
