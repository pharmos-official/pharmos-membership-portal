import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

let toastId = 0;
const listeners: ((toast: Toast) => void)[] = [];

export function showToast(message: string, tone: Toast['tone'] = 'success') {
  const toast = { id: ++toastId, message, tone };
  listeners.forEach(l => l(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3500);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-card-hover ${
            t.tone === 'success'
              ? 'bg-emerald-600 text-white'
              : t.tone === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-pharmos-600 text-white'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}
