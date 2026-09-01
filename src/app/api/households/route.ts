import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/defaults';

export async function GET() {
  const user = await requireUser();
  const pool = getPool();
  const r = await pool.query(
    `select h.id, h.name, h.created_at,
            (select json_agg(json_build_object(
               'member_id', m.id, 'user_id', m.user_id, 'name', u.name, 'email', u.email, 'role', m.role
             )) from household_members m join users u on u.id = m.user_id
             where m.household_id = h.id) as members
     from households h
     join household_members me on me.household_id = h.id
     where me.user_id = $1
     order by h.created_at desc`,
    [user.id]
  );
  return NextResponse.json({ households: r.rows });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('begin');
    const h = await client.query('insert into households (name, created_by) values ($1,$2) returning id, name', [name, user.id]);
    const householdId = h.rows[0].id;
    await client.query(
      'insert into household_members (household_id, user_id, role) values ($1,$2,$3)',
      [householdId, user.id, 'admin']
    );
    for (const [i, c] of DEFAULT_EXPENSE_CATEGORIES.entries()) {
      await client.query(
        'insert into categories (household_id, name, type, icon, "isDefault", sort) values ($1,$2,$3,$4,true,$5)',
        [householdId, c, 'expense', 'tag', i]
      );
    }
    for (const [i, c] of DEFAULT_INCOME_CATEGORIES.entries()) {
      await client.query(
        'insert into categories (household_id, name, type, icon, "isDefault", sort) values ($1,$2,$3,$4,true,$5)',
        [householdId, c, 'income', 'cash', i]
      );
    }
    await client.query('commit');
    return NextResponse.json({ ok: true, id: householdId, name });
  } catch (e) {
    await client.query('rollback');
    console.error(e);
    return NextResponse.json({ error: 'Error creando el hogar' }, { status: 500 });
  } finally {
    client.release();
  }
}
