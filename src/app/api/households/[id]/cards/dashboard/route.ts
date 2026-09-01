import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';
import { round2 } from '@/lib/finance';

function nextCutoff(cutoffDay: number, today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), cutoffDay);
  if (today > d) {
    return new Date(today.getFullYear(), today.getMonth() + 1, cutoffDay);
  }
  return d;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);

  const cards = await db.query(
    'select * from cards where household_id=$1 and active=true order by name',
    [id]
  );

  const today = new Date();
  const result = [];

  for (const c of cards.rows) {
    const upcoming = nextCutoff(Number(c.cutoff_day), today);
    const cutoffStr = `${upcoming.getFullYear()}-${String(upcoming.getMonth() + 1).padStart(2, '0')}-${String(upcoming.getDate()).padStart(2, '0')}`;

    // gastos pendientes de esa tarjeta (crédito con cuotas sin pagar, o débito del cierre)
    const pending = await db.query(
      `select e.id, e.title, e.amount, e.installments, e.paid_installments, e.effective_date, e.payment_method
       from expenses e
       where e.household_id=$1 and e.card_id=$2 and e.installments > e.paid_installments
         and e.payment_method='credit' and to_char(e.effective_date,'YYYY-MM')<=to_char($3::date,'YYYY-MM')
       order by e.effective_date`,
      [id, c.id, cutoffStr]
    );

    const pendingRows = pending.rows.map((x: { id: string; title: string; amount: string; installments: string; paid_installments: string; effective_date: string }) => {
      const monthly = round2(Number(x.amount) / Number(x.installments));
      const missing = Number(x.installments) - Number(x.paid_installments);
      return {
        id: x.id,
        title: x.title,
        amount: Number(x.amount),
        monthly,
        installments: Number(x.installments),
        paid_installments: Number(x.paid_installments),
        missing,
        effective_date: x.effective_date,
      };
    });

    const nextCutoffTotal = round2(
      pendingRows
        .filter((x) => String(x.effective_date) <= cutoffStr)
        .reduce((s, x) => s + x.monthly, 0)
    );

    result.push({
      id: c.id,
      name: c.name,
      type: c.type,
      cutoff_day: Number(c.cutoff_day),
      limit_amount: Number(c.limit_amount),
      last4: c.last4,
      next_cutoff: cutoffStr,
      next_cutoff_total: nextCutoffTotal,
      pending: pendingRows,
    });
  }

  return NextResponse.json({ cards: result });
}
