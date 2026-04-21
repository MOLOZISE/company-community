'use client';

import { FLAIRS } from '@/lib/flair';

interface FlairChipsProps {
  activeFlair?: string;
  onChange: (flair: string | undefined) => void;
}

export function FlairChips({ activeFlair, onChange }: FlairChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onChange(undefined)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors whitespace-nowrap ${
          !activeFlair
            ? 'bg-slate-900 text-white ring-slate-900'
            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
        }`}
      >
        전체
      </button>
      {FLAIRS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(activeFlair === f.value ? undefined : f.value)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
            activeFlair === f.value
              ? f.color
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
