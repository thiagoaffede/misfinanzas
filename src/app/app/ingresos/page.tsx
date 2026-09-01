'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/components/store';
import { moneyBare, fmtDate, todayLocal, errMsg } from '@/lib/format';

type Cat = { id: string; name: string; type: string };
type Income = {
  id: string;
  title: string;
  amount: number;
  category_name: string | null;
  income_date: string;
  is_recurring: boolean;
};

export default function IngresosPage() {
  const { activeId, api } = useStore();
  const [cats, setCats] = useState<Cat[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeId) return;
    try {
      const [c, i] = await Promise.all([
        api<{ categories: Cat[] }>(`/api/households/${activeId}/categories`),
        api<{ incomes: Income[] }>(`/api/households/${activeId}/incomes`),
      ]);
      const incCats = c.categories.filter((x: Cat) => x.type === 'income');
      setCats(incCats);
      setCategoryId((cur) => cur || incCats[0]?.id || '');
      setIncomes(i.incomes);
    } finally {
      setLoading(false);
    }
  }, [activeId, api]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await api(`/api/households/${activeId}/incomes`, {
        method: 'POST',
        body: JSON.stringify({ title, amount: parseFloat(amount), categoryId, incomeDate: date, isRecurring }),
      });
      setTitle('');
      setAmount('');
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este ingreso?')) return;
    setErr('');
    try {
      await api(`/api/households/${activeId}/incomes?incomeId=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Error al eliminar'));
    }
  }

  if (!activeId) return null;

  return (
    <div>
      <h1 className="pageTitle">💰 Ingresos</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Nuevo ingreso</h3>
        <form className="form" onSubmit={onSubmit}>
          {err && <p className="err">{err}</p>}
          <div className="field">
            <label>Concepto</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Sueldo mensual" />
          </div>
          <div className="row">
            <div className="field">
              <label>Monto</label>
              <input className="input" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="field">
              <label>Categoría</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            Ingreso fijo / mensual
          </label>
          <button className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ingreso'}</button>
        </form>
      </div>

      <div className="card">
        <h3>Historial</h3>
        {loading ? (
          <p>Cargando…</p>
        ) : incomes.length === 0 ? (
          <p className="empty">Todavía no hay ingresos</p>
        ) : (
          <div className="list">
            {incomes.map((x) => (
              <div className="item" key={x.id}>
                <span className="ic">💵</span>
                <div className="body">
                  <div className="title">{x.title}</div>
                  <div className="meta">
                    {x.category_name || 'Sin categoría'} · {fmtDate(x.income_date)}
                    {x.is_recurring && <span className="tag" style={{ marginLeft: 6 }}>Mensual</span>}
                  </div>
                </div>
                <span className="amt pos mono">{moneyBare(x.amount)}</span>
                <button className="ghost" aria-label={`Eliminar ingreso ${x.title}`} onClick={() => del(x.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
