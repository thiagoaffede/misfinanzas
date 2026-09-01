'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/components/store';

type Member = { member_id: string; user_id: string; name: string; email: string; role: string };

export default function MiembrosPage() {
  const { activeId, households, api, refresh } = useStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [newName, setNewName] = useState('');

  const current = households.find((h) => h.id === activeId);
  let currentUserId: string | null = null;
  try {
    currentUserId = (JSON.parse(localStorage.getItem('mf_user') || 'null') as any)?.id || null;
  } catch {
    currentUserId = null;
  }
  const amAdmin = current?.members?.find((m) => m.user_id === currentUserId)?.role === 'admin';

  const load = useCallback(async () => {
    if (!activeId) return;
    const m = await api(`/api/households/${activeId}/members`);
    setMembers(m.members);
  }, [activeId, api]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setOk('');
    try {
      await api(`/api/households/${activeId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setEmail('');
      setOk('Miembro agregado. Pedile que se registre con ese email y ya va a ver el hogar.');
      load();
    } catch (e: any) {
      setErr(e.message || 'Error');
    }
  }

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await api('/api/households', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
    setNewName('');
    refresh();
  }

  if (!activeId) return null;

  return (
    <div>
      <h1 className="pageTitle">👥 Miembros</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Nuevo hogar</h3>
        <form className="form" onSubmit={createHousehold}>
          <div className="row">
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del nuevo hogar" />
            <button className="btn">Crear</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Miembros de {current?.name}</h3>
        <div className="list">
          {members.map((m) => (
            <div className="item" key={m.member_id}>
              <span className="ic">🙂</span>
              <div className="body">
                <div className="title">{m.name}</div>
                <div className="meta">{m.email}</div>
              </div>
              <span className="tag">{m.role === 'admin' ? 'Admin' : 'Miembro'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Agregar miembro por email</h3>
        {!amAdmin ? (
          <p className="empty">Solo el admin puede agregar miembros.</p>
        ) : (
          <form className="form" onSubmit={add}>
            {err && <p className="err">{err}</p>}
            {ok && <p style={{ color: 'var(--accent)', fontSize: 14 }}>{ok}</p>}
            <div className="row">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" required />
              <button className="btn">Agregar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
