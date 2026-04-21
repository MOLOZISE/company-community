export const FLAIRS = [
  { value: 'notice', label: '공지', color: 'bg-red-50 text-red-700 ring-1 ring-red-100' },
  { value: 'discussion', label: '토론', color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' },
  { value: 'question', label: '질문', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' },
  { value: 'daily', label: '일상', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
  { value: 'info', label: '정보', color: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' },
] as const;

export type FlairValue = (typeof FLAIRS)[number]['value'];

export function getFlairStyle(value: string | null): string {
  return FLAIRS.find((f) => f.value === value)?.color ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
}
