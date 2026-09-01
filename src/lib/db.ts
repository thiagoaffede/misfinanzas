import { Pool } from 'pg';

const isServer = typeof window === 'undefined';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error('DATABASE_URL no configurada');
  pool = new Pool({
    connectionString: conn,
    max: 10,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

export const db = {
  query: (text: string, params?: unknown[]) => {
    if (!isServer) throw new Error('db solo se usa en el server');
    return getPool().query(text, params as never[]);
  },
};
export { isServer };
