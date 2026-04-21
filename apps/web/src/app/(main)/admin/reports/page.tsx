'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { relativeTime } from '@/lib/time';
import { toast } from '@/store/toast';

const REASON_LABELS = {
  spam: '스팸',
  harassment: '괴롭힘',
  misinformation: '허위정보',
  inappropriate: '부적절한 내용',
  other: '기타',
} as const;

const STATUS_LABELS = {
  pending: '검토 중',
  resolved: '처리 완료',
  dismissed: '기각',
} as const;

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-slate-100 text-slate-600',
} as const;

type ReportStatus = keyof typeof STATUS_LABELS;

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'dismissed' | undefined>(undefined);
  const utils = trpc.useContext();

  const { data: reportList, isLoading, error } = trpc.reports.getList.useQuery({ status: filter });
  const updateStatus = trpc.reports.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      utils.reports.getList.invalidate();
      toast.success(`신고가 "${STATUS_LABELS[variables.status]}"으로 변경되었습니다.`);
    },
  });

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
        <p className="text-red-600 text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">신고 관리</h1>
        <div className="flex gap-1.5">
          {([undefined, 'pending', 'resolved', 'dismissed'] as const).map((s) => (
            <button
              key={String(s)}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === undefined ? '전체' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm py-8 text-center">불러오는 중...</div>
      ) : reportList?.length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center">신고가 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {reportList?.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[(report.status ?? 'pending') as ReportStatus]}`}>
                      {STATUS_LABELS[(report.status ?? 'pending') as ReportStatus]}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {REASON_LABELS[report.reason as keyof typeof REASON_LABELS] ?? report.reason}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{report.targetType}</span>
                    <Link
                      href={report.targetType === 'post' ? `/posts/${report.targetId}` : '#'}
                      className="text-xs text-blue-500 hover:underline font-mono truncate max-w-[120px]"
                    >
                      {report.targetId.slice(0, 8)}…
                    </Link>
                  </div>
                  {report.description && (
                    <p className="text-sm text-slate-700 mb-1">{report.description}</p>
                  )}
                  <p className="text-xs text-slate-400">{relativeTime(report.createdAt)}</p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus.mutate({ id: report.id, status: 'resolved' })}
                      disabled={updateStatus.isLoading}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      처리
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ id: report.id, status: 'dismissed' })}
                      disabled={updateStatus.isLoading}
                      className="text-xs border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      기각
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
