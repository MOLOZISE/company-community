export const FLAIRS = [
  { value: '공지', label: '📢 공지', color: 'bg-red-100 text-red-700' },
  { value: '토론', label: '💬 토론', color: 'bg-blue-100 text-blue-700' },
  { value: '질문', label: '❓ 질문', color: 'bg-yellow-100 text-yellow-700' },
  { value: '일상', label: '📝 일상', color: 'bg-green-100 text-green-700' },
  { value: '정보', label: '💡 정보', color: 'bg-purple-100 text-purple-700' },
] as const;

export type FlairValue = (typeof FLAIRS)[number]['value'];

export function getFlairStyle(value: string | null): string {
  return FLAIRS.find((f) => f.value === value)?.color ?? 'bg-slate-100 text-slate-600';
}
