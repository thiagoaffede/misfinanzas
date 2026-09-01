'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/components/store';
import { moneyBare, errMsg } from '@/lib/format';

type Cat = { id: string; name: string; type: string };
type Rec = { id: string; title: string; amount: number; category_name: string | null; day_of_month: number; active: boolean };

export default function RecurrentesPage() {
  const { activeId, api } = useStore();
  const [cats, setCats] = useState<Cat[]>([]);
  const [list, setList] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [day, setDay] = useState('1');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!activeId) return;
    try {
      const [c, r] = await Promise.all([
        api<{ categories: Cat[] }>(`/api/households/${activeId}/categories`),
        api<{ recurring: Rec[] }>(`/api/households/${activeId}/recurring`),
      ]);
      const expCats = c.categories.filter((x: Cat) => x.type === 'expense');
      setCats(expCats);
      setCategoryId((cur) => cur || expCats[0]?.id || '');
      setList(r.recurring);
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
    try {
      await api(`/api/households/${activeId}/recurring`, {
        method: 'POST',
        body: JSON.stringify({ title, amount: parseFloat(amount), categoryId, dayOfMonth: parseInt(day) }),
      });
      setTitle('');
      setAmount('');
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Error al crear el gasto fijo'));
    }
  }

  async function toggle(r: Rec) {
    try {
      await api(`/api/households/${activeId}/recurring`, {
        method: 'PATCH',
        body: JSON.stringify({ id: r.id, active: !r.active }),
      });
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Error al actualizar'));
    }
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este gasto fijo?')) return;
    try {
      await api(`/api/households/${activeId}/recurring?id=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Error al eliminar'));
    }
  }

  if (!activeId) return null;

  const total = list.filter((r) => r.active).reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <h1 className="pageTitle">🔁 Gastos fijos</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Nuevo gasto fijo mensual</h3>
        <form className="form" onSubmit={onSubmit}>
          {err && <p className="err">{err}</p>}
          <div className="field">
            <label>Concepto</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Alquiler, Streaming…" />
          </div>
          <div className="row">
            <div className="field">
              <label>Monto/mes</label>
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
              <label>Día del mes</label>
              <input className="input" type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
          </div>
          <button className="btn">Guardar</button>
        </form>
      </div>

      <div className="card">
        <h3>Activos ({list.filter((r) => r.active).length}) · Total /mes: <span className="neg">{moneyBare(total)}</span></h3>
        {loading ? (
          <p>Cargando…</p>
        ) : list.length === 0 ? (
          <p className="empty">Sin gastos fijos todavía</p>
        ) : (
          <div className="list">
            {list.map((r) => (
              <div className="item" key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                <span className="ic">{r.active ? '🔁' : '⏸️'}</span>
                <div className="body">
                  <div className="title">{r.title}</div>
                  <div className="meta">Día {r.day_of_month} · {r.category_name || 'Sin categoría'}</div>
                </div>
                <span className="amt mono">{moneyBare(r.amount)}</span>
                <button className="ghost" onClick={() => toggle(r)}>{r.active ? 'Pausar' : 'Reactivar'}</button>
                <button className="ghost" aria-label={`Eliminar gasto fijo ${r.title}`} onClick={() => del(r.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
