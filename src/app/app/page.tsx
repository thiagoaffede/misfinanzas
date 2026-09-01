'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/components/store';
import { moneyBare, MONTHS } from '@/lib/format';

type Dash = {
  month: string;
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
  byCategory: { name: string; total: number }[];
  recurringMonthly: number;
  debts: { from_name: string; to_name: string; amount: number }[];
};

export default function DashboardPage() {
  const { activeId, api, ready } = useStore();
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) return;
    api<Dash>(`/api/households/${activeId}/dashboard`)
      .then(setD)
      .catch(() => setD(null))
      .finally(() => setLoading(false));
  }, [activeId, api]);

  if (!ready) return <p>Cargando…</p>;
  if (!activeId) {
    return (
      <div>
        <h1 className="pageTitle">Bienvenido 👋</h1>
        <div className="card">
          <p style={{ marginTop: 0 }}>Todavía no tenés ningún hogar.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const name = (e.currentTarget.elements.namedItem('hh') as HTMLInputElement).value.trim();
              if (name) {
                await fetch('/api/households', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name }),
                });
                window.location.reload();
              }
            }}
            className="form"
          >
            <div className="field">
              <label>Nombre del hogar</label>
              <input className="input" name="hh" placeholder="Ej: Casa de Thiago" required />
            </div>
            <button className="btn">Crear mi primer hogar</button>
          </form>
        </div>
      </div>
    );
  }

  const monthName = d ? MONTHS[parseInt(d.month.split('-')[1]) - 1] : '';

  return (
    <div>
      <h1 className="pageTitle">Dashboard {monthName && `· ${monthName}`}</h1>
      {loading || !d ? (
        <p>Cargando datos…</p>
      ) : (
        <>
          <div className="grid kpis">
            <div className="card kpi">
              <div className="lbl">Ingresos</div>
              <div className="num pos">{moneyBare(d.totalIncomes)}</div>
            </div>
            <div className="card kpi">
              <div className="lbl">Gastos</div>
              <div className="num neg">{moneyBare(d.totalExpenses)}</div>
            </div>
            <div className="card kpi">
              <div className="lbl">Balance</div>
              <div className={`num ${d.balance >= 0 ? 'pos' : 'neg'}`}>{moneyBare(d.balance)}</div>
            </div>
            <div className="card kpi">
              <div className="lbl">Gastos fijos/mes</div>
              <div className="num">{moneyBare(d.recurringMonthly)}</div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
            <div className="card">
              <h3>Gastos por categoría</h3>
              {d.byCategory.filter((c) => c.total > 0).length === 0 ? (
                <p className="empty">Sin gastos este mes</p>
              ) : (
                d.byCategory
                  .filter((c) => c.total > 0)
                  .map((c) => {
                    const pct = d.totalExpenses > 0 ? (c.total / d.totalExpenses) * 100 : 0;
                    return (
                      <div key={c.name} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>{c.name}</span>
                          <span className="mono">{moneyBare(c.total)}</span>
                        </div>
                        <div className="bar" style={{ marginTop: 4 }}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="card">
              <h3>Deudas pendientes</h3>
              {d.debts.length === 0 ? (
                <p className="empty">Todo saldado 🎉</p>
              ) : (
                <div className="list">
                  {d.debts.map((x, i) => (
                    <div className="item" key={i}>
                      <span className="ic">🤝</span>
                      <div className="body">
                        <div className="title">{x.from_name} → {x.to_name}</div>
                      </div>
                      <span className="amt mono">{moneyBare(x.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <Link className="link" href="/app/deudas">Ver deudas →</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
