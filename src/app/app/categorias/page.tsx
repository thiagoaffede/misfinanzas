'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/components/store';

type Cat = { id: string; name: string; type: string; isDefault: boolean };

export default function CategoriasPage() {
  const { activeId, api } = useStore();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    const c = await api(`/api/households/${activeId}/categories`);
    setCats(c.categories);
    setLoading(false);
  }, [activeId, api]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return;
    try {
      await api(`/api/households/${activeId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name, type }),
      });
      setName('');
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al crear la categoría');
    }
  }

  async function update() {
    if (!editing || !editing.name.trim()) return;
    setErr('');
    try {
      await api(`/api/households/${activeId}/categories`, {
        method: 'PATCH',
        body: JSON.stringify({ categoryId: editing.id, name: editing.name.trim() }),
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al renombrar');
    }
  }

  async function del(c: Cat) {
    if (c.isDefault) {
      alert('Las categorías por defecto no se borran; podés renombrarlas o crear las tuyas.');
      return;
    }
    if (!confirm(`¿Borrar "${c.name}"?`)) return;
    setErr('');
    try {
      await api(`/api/households/${activeId}/categories?categoryId=${c.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al eliminar');
    }
  }

  if (!activeId) return null;

  const visible = cats.filter((c) => c.type === type);
  const total = cats.filter((c) => c.type === type).length;

  return (
    <div>
      <h1 className="pageTitle">🏷️ Categorías</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`chip ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}>Gastos</button>
        <button className={`chip ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}>Ingresos</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Nueva categoría de {type === 'expense' ? 'gasto' : 'ingreso'}</h3>
        <form className="form" onSubmit={create}>
          {err && <p className="err">{err}</p>}
          <div className="row">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la categoría" required />
            <button className="btn">Agregar</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>{total} categorías</h3>
        {loading ? (
          <p>Cargando…</p>
        ) : visible.length === 0 ? (
          <p className="empty">Sin categorías</p>
        ) : (
          visible.map((c) => (
            <div className="catRow" key={c.id}>
              {editing && editing.id === c.id ? (
                <>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    autoFocus
                  />
                  <button className="btn" onClick={update}>OK</button>
                  <button className="ghost" onClick={() => setEditing(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 600 }}>{c.name}</span>
                  {c.isDefault && <span className="tag gray">Default</span>}
                  <button className="ghost" aria-label={`Renombrar categoría ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name })}>Renombrar</button>
                  <button className="ghost" aria-label={`Eliminar categoría ${c.name}`} onClick={() => del(c)}>✕</button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
