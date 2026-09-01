import { db } from './db';

export async function getMembership(userId: string, householdId: string) {
  const r = await db.query(
    'select m.id as member_id, m.role, h.name as household_name from household_members m join households h on h.id = m.household_id where m.user_id=$1 and m.household_id=$2',
    [userId, householdId]
  );
  return r.rows[0] || null;
}

export async function requireMembership(userId: string, householdId: string) {
  const m = await getMembership(userId, householdId);
  if (!m) {
    const err = new Error('No perteneces a este hogar') as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return m;
}
