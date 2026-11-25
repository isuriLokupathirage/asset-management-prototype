import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toast } from '../ui/Toast';
import { useStore } from '../../store/AppStore';

interface SidebarControl {
  open: boolean;
  toggle: () => void;
}

const SidebarControlContext = createContext<SidebarControl | null>(null);

export function useSidebarControl(): SidebarControl | null {
  return useContext(SidebarControlContext);
}

export function AppShell() {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024);
  const { toast, error, clearToast, clearError } = useStore();
  const location = useLocation();
  const control = useMemo(() => ({ open, toggle: () => setOpen((p) => !p) }), [open]);

  // On narrow screens the sidebar is an overlay: close it after navigating.
  useEffect(() => {
    if (window.innerWidth < 1024) setOpen(false);
  }, [location.pathname]);

  return (
    <SidebarControlContext.Provider value={control}>
      <div className="flex h-full w-full bg-canvas">
        {open &&
        <>
            <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="fixed inset-y-0 left-0 z-40 lg:static lg:z-auto">
              <Sidebar />
            </div>
          </>
        }
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toast message={toast} onClose={clearToast} />
      <Toast message={error} onClose={clearError} tone="error" />
    </SidebarControlContext.Provider>);

}
