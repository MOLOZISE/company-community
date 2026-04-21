interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-10 h-3" />
      </div>
      <Skeleton className="w-3/4 h-4" />
      <Skeleton className="w-full h-3" />
      <Skeleton className="w-2/3 h-3" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="w-10 h-3" />
        <Skeleton className="w-10 h-3" />
        <Skeleton className="w-10 h-3" />
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-12 h-3" />
        <Skeleton className="w-8 h-3" />
      </div>
      <Skeleton className="w-full h-3" />
      <Skeleton className="w-4/5 h-3" />
    </div>
  );
}
