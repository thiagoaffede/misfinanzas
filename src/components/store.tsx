'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Household = {
  id: string;
  name: string;
  members: { member_id: string; user_id: string; name: string; email: string; role: string }[] | null;
};

type Store = {
  user: { id: string; name: string } | null;
  households: Household[];
  activeId: string | null;
  ready: boolean;
  refresh: () => Promise<void>;
  setActive: (id: string) => void;
  api: <T>(path: string, opts?: RequestInit) => Promise<T>;
};

const Ctx = createContext<Store>({} as Store);

export function useStore() {
  return useContext(Ctx);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const api = useCallback(async <T,>(path: string, opts?: RequestInit): Promise<T> => {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(body.error || 'Error');
    return body;
  }, []);

  const refresh = useCallback(async () => {
    try {
      // fuente de verdad: la sesión real desde la cookie
      let me: { user: { id: string; name: string } | null } = { user: null };
      try {
        const r = await fetch('/api/auth/me');
        if (r.ok) {
          me = await r.json();
        }
      } catch {
        me = { user: null };
      }
      if (me.user) {
        setUser({ id: me.user.id, name: me.user.name });
        localStorage.setItem('mf_user', JSON.stringify(me.user));
      } else {
        setUser(null);
      }
      const data = await api<{ households: Household[] }>('/api/households');
      setHouseholds(data.households);
      const stored = typeof window !== 'undefined' ? localStorage.getItem('mf_active') : null;
      const first = data.households[0]?.id || null;
      const chosen = data.households.some((h) => h.id === stored) ? stored : first;
      setActiveId(chosen);
      if (chosen) localStorage.setItem('mf_active', chosen);
      setReady(true);
    } catch {
      setReady(true);
    }
  }, [api]);

  useEffect(() => {
    queueMicrotask(() => refresh());
  }, [refresh]);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem('mf_active', id);
  }, []);

  return (
    <Ctx.Provider value={{ user, households, activeId, ready, refresh, setActive, api }}>
      {children}
    </Ctx.Provider>
  );
}
