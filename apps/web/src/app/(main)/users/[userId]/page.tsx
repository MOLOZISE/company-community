'use client';

import { use } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { relativeTime } from '@/lib/time';
import { getFlairStyle, FLAIRS } from '@/lib/flair';

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);

  const { data: profile, isLoading: profileLoading } = trpc.auth.getById.useQuery({ id: userId });
  const { data: postsData, isLoading: postsLoading } = trpc.posts.getByAuthor.useQuery({
    authorId: userId,
    limit: 20,
  });

  if (profileLoading) {
    return <div className="text-slate-400 text-sm py-8 text-center">불러오는 중...</div>;
  }

  if (!profile) {
    return <div className="text-slate-400 text-sm py-8 text-center">사용자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl text-slate-400 shrink-0 overflow-hidden">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
            ) : (
              profile.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{profile.displayName}</h1>
              {profile.isVerified && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">인증됨</span>
              )}
            </div>
            {profile.department && (
              <p className="text-sm text-slate-500 mt-0.5">{profile.department}</p>
            )}
            {profile.jobTitle && (
              <p className="text-sm text-slate-400">{profile.jobTitle}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {profile.createdAt ? `${relativeTime(profile.createdAt)} 가입` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">작성한 게시물</h2>
        {postsLoading ? (
          <div className="text-slate-400 text-sm py-4 text-center">불러오는 중...</div>
        ) : postsData?.items.length === 0 ? (
          <div className="text-slate-400 text-sm py-4 text-center">공개된 게시물이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {postsData?.items.map((post) => {
              const flairLabel = FLAIRS.find((f) => f.value === post.flair)?.label;
              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {flairLabel && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFlairStyle(post.flair)}`}>
                        {flairLabel}
                      </span>
                    )}
                    {post.createdAt && (
                      <span className="text-xs text-slate-400">{relativeTime(post.createdAt)}</span>
                    )}
                  </div>
                  {post.title && (
                    <h3 className="font-semibold text-slate-900 mb-1">{post.title}</h3>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>↑ {post.upvoteCount ?? 0}</span>
                    <span>💬 {post.commentCount ?? 0}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
