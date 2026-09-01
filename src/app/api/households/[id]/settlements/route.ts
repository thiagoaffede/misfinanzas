import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { requireMembership } from '@/lib/household';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  await requireMembership(user.id, id);
  const r = await db.query(
    `select s.*, fu.name as from_name, tu.name as to_name
     from settlements s
     join household_members fm on fm.id = s.from_member_id join users fu on fu.id = fm.user_id
     join household_members tm on tm.id = s.to_member_id join users tu on tu.id = tm.user_id
     where s.household_id=$1 order by s.paid_at desc, s.created_at desc`,
    [id]
  );
  return NextResponse.json({ settlements: r.rows.map((x: any) => ({ ...x, amount: Number(x.amount) })) });
}
