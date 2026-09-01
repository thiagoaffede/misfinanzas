import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';
import { getDebts, round2 } from '@/lib/finance';
import { localMonth } from '@/lib/date';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const month = localMonth();

  const exp = await db.query(
    `select coalesce(sum(amount / nullif(installments,0)),0) as total from expenses
     where household_id=$1 and to_char(effective_date,'YYYY-MM')=$2`,
    [id, month]
  );
  const inc = await db.query(
    `select coalesce(sum(amount),0) as total from incomes where household_id=$1 and to_char(income_date,'YYYY-MM')=$2`,
    [id, month]
  );

  const byCategory = await db.query(
    `select c.name, c.type, coalesce(sum(e.amount / nullif(e.installments,0)),0) as total
     from categories c left join expenses e on e.category_id=c.id and e.household_id=$1
       and to_char(e.effective_date,'YYYY-MM')=$2
     where c.household_id=$1 and c.type='expense'
     group by c.name, c.type, c.sort order by c.sort`,
    [id, month]
  );

  const recurring = await db.query(`select coalesce(sum(amount),0) as total from recurring_expenses where household_id=$1 and active=true`, [id]);

  const debts = await getDebts(id);

  return NextResponse.json({
    month,
    totalExpenses: round2(Number(exp.rows[0].total)),
    totalIncomes: round2(Number(inc.rows[0].total)),
    balance: round2(Number(inc.rows[0].total) - Number(exp.rows[0].total)),
    byCategory: byCategory.rows.map((x: { name: string; type: string; total: string }) => ({ name: x.name, type: x.type, total: round2(Number(x.total)) })),
    recurringMonthly: round2(Number(recurring.rows[0].total)),
    debts,
  });
}
