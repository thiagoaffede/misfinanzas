import { db, getPool } from './db';
import { localDate } from './date';

export type ExpenseInput = {
  householdId: string;
  categoryId: string;
  title: string;
  amount: number;
  kind: 'joint' | 'individual';
  payerId: string | null;
  paymentMethod: 'cash' | 'transfer' | 'debit' | 'credit';
  cardId: string | null;
  installments: number;
  expenseDate: string;
  createdBy: string;
  memberIds: string[]; // miembros que comparten el gasto (para joint)
};

// Fecha del próximo cierre de tarjeta después de la fecha de compra
function nextCutoff(expenseDate: string, cutoffDay: number): string {
  const d = new Date(expenseDate + 'T00:00:00');
  let year = d.getFullYear();
  let month = d.getMonth();
  let cutoff = new Date(year, month, cutoffDay);
  if (d > cutoff) {
    cutoff = new Date(year, month + 1, cutoffDay);
  }
  const y = cutoff.getFullYear();
  const m = String(cutoff.getMonth() + 1).padStart(2, '0');
  const day = String(cutoff.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeEffectiveDate(paymentMethod: string, card: { type: string; cutoff_day: number } | null, expenseDate: string): string {
  if (paymentMethod === 'credit' && card) {
    return nextCutoff(expenseDate, card.cutoff_day);
  }
  return expenseDate;
}

export async function createExpense(input: ExpenseInput) {
  const amount = Number(input.amount);
  if (!input.title || isNaN(amount) || amount <= 0) {
    throw new Error('Datos inválidos');
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('begin');

    // Si es tarjeta, recuperar su tipo y día de corte para calcular el impacto
    let card: { type: string; cutoff_day: number } | null = null;
    if (input.cardId) {
      const cr = await client.query('select type, cutoff_day from cards where id=$1', [input.cardId]);
      card = cr.rows[0] || null;
    }
    const effectiveDate = computeEffectiveDate(input.paymentMethod, card, input.expenseDate || localDate());

    const e = await client.query(
      `insert into expenses (household_id, category_id, title, amount, kind, payer_id, payment_method, card_id, installments, expense_date, effective_date, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
      [
        input.householdId,
        input.categoryId,
        input.title,
        amount,
        input.kind,
        input.payerId || null,
        input.paymentMethod,
        input.cardId || null,
        input.installments > 0 ? input.installments : 1,
        input.expenseDate || localDate(),
        effectiveDate,
        input.createdBy,
      ]
    );
    const expense = e.rows[0];

    if (input.kind === 'joint' && input.memberIds.length > 0) {
      const share = Math.round((amount / input.memberIds.length) * 100) / 100;
      for (const memberId of input.memberIds) {
        await client.query(
          'insert into expense_shares (expense_id, member_id, amount) values ($1,$2,$3)',
          [expense.id, memberId, share]
        );
      }
    }

    await client.query('commit');
    return { ...expense, monthly: expense.installments > 1 ? round2(amount / expense.installments) : amount };
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function listExpenses(householdId: string, month?: string) {
  let sql = `select e.*, c.name as category_name, cd.name as card_name,
       (select coalesce(u.name, '') from users u join household_members m on m.user_id=u.id where m.id=e.payer_id) as payer_name
     from expenses e join categories c on c.id = e.category_id
     left join cards cd on cd.id = e.card_id
     where e.household_id = $1`;
  const params: unknown[] = [householdId];
  if (month) {
    sql += ` and to_char(e.effective_date, 'YYYY-MM') = $2`;
    params.push(month);
  }
  sql += ` order by e.effective_date desc, e.created_at desc`;
  const r = await db.query(sql, params);
  return r.rows.map((x: any) => ({
    ...x,
    amount: Number(x.amount),
    monthly: x.installments > 1 ? round2(Number(x.amount) / x.installments) : Number(x.amount),
  }));
}

export type DebtRow = {
  from_member_id: string;
  from_name: string;
  to_member_id: string;
  to_name: string;
  amount: number;
};

export async function getDebts(householdId: string): Promise<DebtRow[]> {
  const members = await db.query(
    `select m.id, u.name from household_members m join users u on u.id=m.user_id where m.household_id=$1`,
    [householdId]
  );
  if (members.rows.length < 2) return [];

  // acumulado: cada share (lo que cada miembro debe) agrupado por pagador
  const r = await db.query(
    `select e.payer_id, s.member_id, sum(s.amount) as total
     from expense_shares s
     join expenses e on e.id = s.expense_id
     where e.household_id=$1 and e.kind='joint'
     group by e.payer_id, s.member_id`,
    [householdId]
  );

  const nameById = new Map(members.rows.map((m: any) => [m.id, m.name]));
  const owes = new Map<string, number>();
  for (const row of r.rows) {
    if (row.payer_id && row.payer_id !== row.member_id) {
      const key = `${row.member_id}->${row.payer_id}`;
      owes.set(key, (owes.get(key) || 0) + Number(row.total));
    }
  }

  // settlements reducen deuda de_miembro -> a_miembro
  const st = await db.query(
    `select from_member_id, to_member_id, sum(amount) as total from settlements where household_id=$1 group by from_member_id, to_member_id`,
    [householdId]
  );
  for (const row of st.rows) {
    const key = `${row.from_member_id}->${row.to_member_id}`;
    owes.set(key, (owes.get(key) || 0) - Number(row.total));
  }

  // netear en pares
  const pairs = new Set<string>();
  const result: DebtRow[] = [];
  for (const [key, amount] of owes) {
    const [a, b] = key.split('->');
    const reverse = `${b}->${a}`;
    const pairKey = [a, b].sort().join('|');
    if (pairs.has(pairKey)) continue;
    pairs.add(pairKey);
    const net = amount - (owes.get(reverse) || 0);
    const rounded = round2(net);
    if (Math.abs(rounded) < 0.01) continue;
    const [fromId, toId] = rounded > 0 ? [a, b] : [b, a];
    result.push({
      from_member_id: fromId,
      from_name: nameById.get(fromId) || '',
      to_member_id: toId,
      to_name: nameById.get(toId) || '',
      amount: Math.abs(rounded),
    });
  }
  return result;
}
