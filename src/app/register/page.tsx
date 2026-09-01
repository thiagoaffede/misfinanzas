'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { errMsg } from '@/lib/format';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [household, setHousehold] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error');
      localStorage.setItem('mf_user', JSON.stringify({ id: body.id, name: body.name }));

      // crear el primer hogar
      const hname = household.trim() || 'Mi hogar';
      const hr = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hname }),
      });
      const hbody = await hr.json().catch(() => ({}));
      if (!hr.ok) throw new Error(hbody.error || 'No se pudo crear el hogar');

      router.push('/app');
      router.refresh();
    } catch (e) {
      setErr(errMsg(e, 'Error al registrarse'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authWrap">
      <form className="authCard" onSubmit={onSubmit}>
        <h1>💰 MiFinanzas</h1>
        <p className="sub">Creá tu cuenta y tu hogar</p>
        {err && <p className="err">{err}</p>}
        <div className="form">
          <div className="field">
            <label>Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label>Contraseña (mín 6)</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label>Nombre del hogar (opcional)</label>
            <input className="input" value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="Ej: Casa de Thiago" />
          </div>
          <button className="btn btn-block" disabled={loading}>{loading ? 'Creando…' : 'Crear cuenta'}</button>
          <p style={{ textAlign: 'center', margin: 0 }}>
            <Link className="link" href="/login">Ya tengo cuenta</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
