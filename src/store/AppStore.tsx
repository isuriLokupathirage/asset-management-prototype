import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Db } from '../types';
import { buildSeed } from '../data/seed';
import { ServiceError } from '../services/domain';

const STORAGE_KEY = 'a360-asset-mgmt-prototype-v1';

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* storage unavailable or corrupt: fall back to the demo data */
  }
  return buildSeed();
}

interface Store {
  db: Db;
  /** True while a simulated request is in flight. */
  busy: boolean;
  /**
   * Runs a domain operation as if it were an API call: short delay, then the new state is applied.
   * Resolves true on success; on a business-rule error it shows the message and resolves false.
   */
  run: <T = void>(op: (db: Db) => Db | {db: Db;result: T;}, successMessage?: string) => Promise<{ok: boolean;result?: T;}>;
  resetDemo: () => void;
  toast: string | null;
  error: string | null;
  notify: (message: string) => void;
  clearToast: () => void;
  clearError: () => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: {children: React.ReactNode;}) {
  const [db, setDb] = useState<Db>(load);
  const dbRef = useRef(db);
  dbRef.current = db;
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* ignore quota or privacy-mode errors */
    }
  }, [db]);

  const run: Store['run'] = useCallback(async (op, successMessage) => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 350));
    try {
      const out = op(dbRef.current);
      const next = 'db' in out ? out.db : out;
      const result = 'db' in out ? out.result : undefined;
      dbRef.current = next;
      setDb(next);
      if (successMessage) setToast(successMessage);
      return { ok: true, result: result as never };
    } catch (e) {
      if (e instanceof ServiceError) {
        setError(e.message);
        return { ok: false };
      }
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<Store>(() => ({
    db,
    busy,
    run,
    resetDemo: () => {
      const fresh = buildSeed();
      dbRef.current = fresh;
      setDb(fresh);
      setToast('Demo data has been reset');
    },
    toast,
    error,
    notify: setToast,
    clearToast: () => setToast(null),
    clearError: () => setError(null)
  }), [db, busy, run, toast, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside AppStoreProvider');
  return v;
}
