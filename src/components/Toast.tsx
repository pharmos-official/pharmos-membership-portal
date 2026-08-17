import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let listeners: ((toast: Omit<Toast, 'id'>) => void)[] = [];
let nextId = 1;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = { id: nextId++, message, type };
  listeners.forEach(l => l(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-xs flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' :
            toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> :
           toast.type === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : null}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => remove(toast.id)} className="shrink-0 rounded p-0.5 hover:bg-white/20">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}