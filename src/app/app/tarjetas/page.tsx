'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/components/store';
import { moneyBare, fmtDate } from '@/lib/format';

type Card = {
  id: string;
  name: string;
  type: string;
  cutoff_day: number;
  limit_amount: number;
  last4: string | null;
  active: boolean;
};

type CardDash = {
  id: string;
  name: string;
  type: string;
  cutoff_day: number;
  limit_amount: number;
  next_cutoff: string;
  next_cutoff_total: number;
  pending: {
    id: string;
    title: string;
    monthly: number;
    installments: number;
    paid_installments: number;
    missing: number;
    effective_date: string;
  }[];
};

export default function TarjetasPage() {
  const { activeId, api } = useStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [dash, setDash] = useState<CardDash[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [cutoffDay, setCutoffDay] = useState('5');
  const [limitAmount, setLimitAmount] = useState('');
  const [last4, setLast4] = useState('');

  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const c = await api(`/api/households/${activeId}/cards`);
      setCards(c.cards);
      const d = await api(`/api/households/${activeId}/cards/dashboard`);
      setDash(d.cards);
    } catch (e: any) {
      setErr((e && e.message) || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [activeId, api]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr('');
    try {
      await api(`/api/households/${activeId}/cards`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          cutoffDay: parseInt(cutoffDay),
          limitAmount: parseFloat(limitAmount),
          last4: last4 || undefined,
        }),
      });
      setName('');
      setLast4('');
      setLimitAmount('');
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al guardar la tarjeta');
    }
  }

  async function toggle(c: Card) {
    setErr('');
    try {
      await api(`/api/households/${activeId}/cards`, {
        method: 'PATCH',
        body: JSON.stringify({ cardId: c.id, active: !c.active }),
      });
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al actualizar');
    }
  }

  async function del(c: Card) {
    if (!confirm(`¿Eliminar la tarjeta "${c.name}"?`)) return;
    setErr('');
    try {
      await api(`/api/households/${activeId}/cards?cardId=${c.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al eliminar');
    }
  }

  async function markPaid(expenseId: string) {
    setErr('');
    try {
      await api(`/api/households/${activeId}/expenses`, {
        method: 'PATCH',
        body: JSON.stringify({ expenseId, markPaid: true }),
      });
      await load();
    } catch (e: any) {
      setErr((e && e.message) || 'Error al marcar cuota');
    }
  }

  if (!activeId) return null;

  return (
    <div>
      <h1 className="pageTitle">💳 Tarjetas</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Nueva tarjeta</h3>
        <form className="form" onSubmit={create}>
          {err && <p className="err">{err}</p>}
          <div className="field">
            <label>Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej: Visa de crédito, BNA débito" />
          </div>
          <div className="row">
            <div className="field">
              <label>Tipo</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="credit">Crédito</option>
                <option value="debit">Débito</option>
              </select>
            </div>
            {type === 'credit' && (
              <div className="field">
                <label>Día de cierre</label>
                <input className="input" type="number" min="1" max="31" value={cutoffDay} onChange={(e) => setCutoffDay(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Límite ($)</label>
              <input className="input" type="number" step="0.01" min="0" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="field">
              <label>Últimos 4</label>
              <input className="input" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))} placeholder="****" />
            </div>
          </div>
          <button className="btn">Guardar tarjeta</button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {cards.map((c) => (
          <span
            key={c.id}
            className={`chip ${c.active ? 'active' : ''}`}
            onClick={() => toggle(c)}
            role="button"
            tabIndex={0}
            aria-pressed={c.active}
            aria-label={`${c.name}${c.active ? '' : ' (pausada)'}. ${c.active ? 'Pausar' : 'Reactivar'}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c); } }}
          >
            {c.type === 'credit' ? '💳' : '🏦'} {c.name} {c.active ? '' : '(pausada)'}
            <span
              onClick={(e) => { e.stopPropagation(); del(c); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); del(c); } }}
              role="button"
              tabIndex={0}
              aria-label={`Eliminar tarjeta ${c.name}`}
              style={{ marginLeft: 4 }}
            >✕</span>
          </span>
        ))}
      </div>

      {cards.filter((c) => c.active).length === 0 && (
        <p className="empty">Todavía no tenés tarjetas activas. Cargá una arriba. 💳</p>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {dash.map((d) => (
          <div className="card" key={d.id}>
            <h3>
              {d.type === 'credit' ? '💳' : '🏦'} {d.name}
              {d.type === 'credit' && <span className="tag gray" style={{ marginLeft: 6 }}>Cada {d.cutoff_day}</span>}
            </h3>
            {d.type === 'credit' ? (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 14 }}>
                  Próximo cierre: <b>{fmtDate(d.next_cutoff)}</b> · Total: <b className="neg">{moneyBare(d.next_cutoff_total)}</b>
                </p>
                {d.pending.length === 0 ? (
                  <p className="empty">Sin cuotas pendientes</p>
                ) : (
                  <div className="list">
                    {d.pending.map((p) => (
                      <div className="item" key={p.id}>
                        <div className="body">
                          <div className="title">{p.title}</div>
                          <div className="meta">
                            {p.paid_installments}/{p.installments} cuotas pagadas
                            {p.missing > 0 && ` · faltan ${p.missing}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="amt mono">{moneyBare(p.monthly)}</div>
                          <div className="meta">/mes</div>
                        </div>
                        {p.missing > 0 && (
                          <button className="ghost" onClick={() => markPaid(p.id)}>Pagar cuota</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
                Tarjeta de débito. Los gastos impactan inmediato (son pagos).
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
