import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toast } from '../ui/Toast';
import { useStore } from '../../store/AppStore';

export function AppShell() {
  const { toast, error, clearToast, clearError } = useStore();
  return (
    <>
      <div className="flex h-full w-full bg-canvas">
        <Sidebar />
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toast message={toast} onClose={clearToast} />
      <Toast message={error} onClose={clearError} tone="error" />
    </>);

}
