'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/components/store';
import { moneyBare, fmtDate, todayLocal, monthLocal, errMsg } from '@/lib/format';

type Member = { member_id: string; user_id: string; name: string; email: string; role: string };
type Cat = { id: string; name: string; type: string };
type Card = { id: string; name: string; type: string; cutoff_day: number };
type Expense = {
  id: string;
  title: string;
  amount: number;
  kind: string;
  category_name: string;
  payer_name: string;
  payment_method: string;
  card_id: string | null;
  card_name: string | null;
  installments: number;
  paid_installments: number;
  monthly: number;
  expense_date: string;
  effective_date: string;
};

export default function GastosPage() {
  const { activeId, api } = useStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'joint' | 'individual'>('joint');
  const [categoryId, setCategoryId] = useState('');
  const [payerId, setPayerId] = useState('');
  const [method, setMethod] = useState('cash');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState('1');
  const [date, setDate] = useState(todayLocal());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [monthFilter, setMonthFilter] = useState(monthLocal());

  const isCardMethod = method === 'debit' || method === 'credit';
  const selectedCard = cards.find((c) => c.id === cardId);

  const load = useCallback(async () => {
    if (!activeId) return;
    try {
      const [m, c, e, cd] = await Promise.all([
        api<{ members: Member[] }>(`/api/households/${activeId}/members`),
        api<{ categories: Cat[] }>(`/api/households/${activeId}/categories`),
        api<{ expenses: Expense[] }>(`/api/households/${activeId}/expenses?month=${monthFilter}`),
        api<{ cards: Card[] }>(`/api/households/${activeId}/cards`),
      ]);
      setMembers(m.members);
      const expCats = c.categories.filter((x: Cat) => x.type === 'expense');
      setCats(expCats);
      setCategoryId((cur) => cur || expCats[0]?.id || '');
      setPayerId((cur) => cur || m.members[0]?.member_id || 'individual');
      setCards(cd.cards);
      setCardId((cur) => cur || cd.cards[0]?.id || '');
      setExpenses(e.expenses);
    } finally {
      setLoading(false);
    }
  }, [activeId, api, monthFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      await api(`/api/households/${activeId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          kind,
          categoryId,
          payerId,
          paymentMethod: method,
          cardId: isCardMethod ? cardId : null,
          installments: kind === 'joint' || method === 'debit' ? 1 : parseInt(installments) || 1,
          expenseDate: date,
        }),
      });
      setTitle('');
      setAmount('');
      setInstallments('1');
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return;
    setErr('');
    try {
      await api(`/api/households/${activeId}/expenses?expenseId=${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setErr(errMsg(e, 'Error al eliminar'));
    }
  }

  if (!activeId) return null;

  return (
    <div>
      <h1 className="pageTitle">💳 Gastos</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Nuevo gasto</h3>
        <form className="form" onSubmit={onSubmit}>
          {err && <p className="err">{err}</p>}
          <div className="field">
            <label>Concepto</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Supermercado" />
          </div>
          <div className="row">
            <div className="field">
              <label>Monto</label>
              <input className="input" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select className="input" value={kind} onChange={(e) => {
                const v = e.target.value as 'joint' | 'individual';
                setKind(v);
                setPayerId(v === 'individual' ? 'individual' : members[0]?.member_id || '');
              }}>
                <option value="joint">Conjunto (reparte)</option>
                <option value="individual">Individual</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Categoría</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Pagó</label>
              <select className="input" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                {kind === 'individual' && <option value="individual">Individual</option>}
                {members.map((m) => (
                  <option key={m.member_id} value={m.member_id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label>Método</label>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="debit">Tarjeta de débito</option>
                <option value="credit">Tarjeta de crédito</option>
              </select>
            </div>
            {isCardMethod && (
              <div className="field">
                <label>{method === 'debit' ? 'Tarjeta de débito' : 'Tarjeta de crédito'}</label>
                <select className="input" value={cardId} onChange={(e) => setCardId(e.target.value)}>
                  {cards
                    .filter((c) => c.type === method)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
            )}
            {method === 'credit' && selectedCard?.type === 'credit' && (
              <div className="field">
                <label>Cuotas</label>
                <select className="input" value={installments} onChange={(e) => setInstallments(e.target.value)}>
                  {[1, 2, 3, 6, 9, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>{n === 1 ? 'Contado' : `${n} cuotas`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Fecha</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {selectedCard && method === 'credit' && (
            <p style={{ fontSize: 13, margin: 0, color: 'var(--muted)' }}>
              💡 Crédito: no impacta hoy, entra al próximo cierre de “<b>{selectedCard.name}</b>”.
            </p>
          )}

          <button className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar gasto'}</button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Historial</h3>
          <input type="month" className="input" style={{ width: 180 }} value={monthFilter} onChange={(e) => { setLoading(true); setMonthFilter(e.target.value); }} />
        </div>
        {loading ? (
          <p>Cargando…</p>
        ) : expenses.length === 0 ? (
          <p className="empty">Todavía no hay gastos en este mes</p>
        ) : (
          <div className="list">
            {expenses.map((x) => (
              <div className="item" key={x.id}>
                <span className="ic">{x.kind === 'joint' ? '👥' : '🙋'}</span>
                <div className="body">
                  <div className="title">{x.title}</div>
                  <div className="meta">
                    {x.category_name} · {x.payer_name || 'Individual'} · {methodLabel(x.payment_method)}
                    {x.card_name ? ` · ${x.card_name}` : ''}
                    {' · '}
                    {fmtDate(x.effective_date)}
                    {x.installments > 1 && ` · ${x.paid_installments}/${x.installments} cuotas`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="amt mono">{moneyBare(x.monthly)}{x.installments > 1 ? '/mes' : ''}</div>
                  {x.installments > 1 && <div className="meta">total {moneyBare(x.amount)}</div>}
                </div>
                <button className="ghost" aria-label={`Eliminar gasto ${x.title}`} onClick={() => del(x.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function methodLabel(m: string) {
  const map: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    debit: 'Débito',
    credit: 'Crédito',
  };
  return map[m] || m;
}
