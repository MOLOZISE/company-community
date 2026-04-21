'use client';

import { useToastStore } from '@/store/toast';

const STYLES = {
  success: 'bg-slate-900 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-indigo-600 text-white',
} as const;

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
} as const;

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-auto animate-in fade-in slide-in-from-bottom-2 ${STYLES[t.type]}`}
        >
          <span className="text-xs font-bold">{ICONS[t.type]}</span>
          {t.message}
          <button
            onClick={() => remove(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 text-xs leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
