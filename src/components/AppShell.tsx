'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from './store';

const NAV = [
  { href: '/app', label: 'Dashboard', icon: '🏠' },
  { href: '/app/gastos', label: 'Gastos', icon: '💳' },
  { href: '/app/ingresos', label: 'Ingresos', icon: '💰' },
  { href: '/app/tarjetas', label: 'Tarjetas', icon: '🏦' },
  { href: '/app/deudas', label: 'Deudas', icon: '🤝' },
  { href: '/app/recurrentes', label: 'Fijos', icon: '🔁' },
  { href: '/app/categorias', label: 'Categorías', icon: '🏷️' },
  { href: '/app/miembro', label: 'Miembros', icon: '👥' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, households, activeId, setActive, ready } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const activeHousehold = households.find((h) => h.id === activeId);

  useEffect(() => {
    if (ready && !user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [ready, user, router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('mf_user');
    window.location.href = '/login';
  }

  if (!ready) {
    return (
      <div className="authWrap">
        <p>Cargando…</p>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">💰 MiFinanzas</div>
        <select
          className="hhSelect"
          value={activeId || ''}
          onChange={(e) => setActive(e.target.value)}
        >
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <nav className="sidenav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={isActive(n.href) ? 'active' : ''}>
              <span className="navIcon">{n.icon}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div className="sideFoot">
          <span>{user.name}</span>
          <button onClick={logout} className="ghost">Salir</button>
        </div>
      </aside>

      <main className="main">
        {children}
      </main>

      <nav className="bottomnav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={isActive(n.href) ? 'active' : ''}>
            <span>{n.icon}</span>
            <small>{n.label}</small>
          </Link>
        ))}
      </nav>
    </div>
  );
}
