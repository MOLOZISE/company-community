'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

const REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'harassment', label: '괴롭힘/혐오' },
  { value: 'misinformation', label: '허위정보' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'other', label: '기타' },
] as const;

type Reason = (typeof REASONS)[number]['value'];

interface ReportButtonProps {
  targetType: 'post' | 'comment';
  targetId: string;
}

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('spam');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const report = trpc.reports.create.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => setOpen(false), 1500);
    },
  });

  if (submitted) {
    return <span className="text-xs text-slate-400">신고 완료</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-400 hover:text-red-400"
      >
        신고
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-4">신고 사유 선택</h3>

            <div className="space-y-2 mb-4">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추가 설명 (선택)"
              rows={2}
              maxLength={500}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            />

            {report.error && (
              <p className="text-xs text-red-500 mb-3">{report.error.message}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                취소
              </button>
              <button
                onClick={() => report.mutate({ targetType, targetId, reason, description: description || undefined })}
                disabled={report.isLoading}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                신고하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
