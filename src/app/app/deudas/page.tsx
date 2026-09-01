'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/components/store';
import { moneyBare } from '@/lib/format';

type Debt = { from_member_id: string; from_name: string; to_member_id: string; to_name: string; amount: number };

export default function DeudasPage() {
  const { activeId, api } = useStore();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        api(`/api/households/${activeId}/debts`),
        api(`/api/households/${activeId}/settlements`),
      ]);
      setDebts(d.debts);
      setSettlements(s.settlements || []);
    } catch {
      setErr('Error al cargar las deudas');
    } finally {
      setLoading(false);
    }
  }, [activeId, api]);

  useEffect(() => {
    load();
  }, [load]);

  async function pay(d: Debt) {
    setErr('');
    try {
      await api(`/api/households/${activeId}/debts`, {
        method: 'POST',
        body: JSON.stringify({ fromMemberId: d.from_member_id, toMemberId: d.to_member_id, amount: d.amount, note }),
      });
      setNote('');
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al liquidar la deuda');
    }
  }

  if (!activeId) return null;

  return (
    <div>
      <h1 className="pageTitle">🤝 Deudas</h1>
      {err && <p className="err">{err}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>¿Quién le debe a quién?</h3>
        {loading ? (
          <p>Cargando…</p>
        ) : debts.length === 0 ? (
          <p className="empty">No hay deudas pendientes 🎉</p>
        ) : (
          <div className="list">
            {debts.map((d, i) => (
              <div className="item" key={i}>
                <span className="ic">↔️</span>
                <div className="body">
                  <div className="title">
                    <b>{d.from_name}</b> le debe a <b>{d.to_name}</b>
                  </div>
                </div>
                <span className="amt mono">{moneyBare(d.amount)}</span>
                <button className="btn" onClick={() => pay(d)}>Liquidar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Historial de liquidaciones</h3>
        {settlements.length === 0 ? (
          <p className="empty">Sin liquidaciones todavía</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Pagó</th><th>Recibió</th><th>Monto</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {settlements.map((s: any, i: number) => (
                <tr key={i}>
                  <td>{s.from_name}</td>
                  <td>{s.to_name}</td>
                  <td className="mono">{moneyBare(Number(s.amount))}</td>
                  <td>{s.paid_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
