'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { errMsg } from '@/lib/format';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error');
      localStorage.setItem('mf_user', JSON.stringify({ id: body.id, name: body.name }));
      router.push('/app');
      router.refresh();
    } catch (e) {
      setErr(errMsg(e, 'Error de inicio de sesión'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authWrap">
      <form className="authCard" onSubmit={onSubmit}>
        <h1>💰 MiFinanzas</h1>
        <p className="sub">Iniciá sesión en tu hogar</p>
        {err && <p className="err">{err}</p>}
        <div className="form">
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn btn-block" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
          <p style={{ textAlign: 'center', margin: 0 }}>
            <Link className="link" href="/register">Crear cuenta</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
