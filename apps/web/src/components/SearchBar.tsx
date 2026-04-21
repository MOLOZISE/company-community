'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { relativeTime } from '@/lib/time';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results = [] } = trpc.posts.search.useQuery(
    { q: query, limit: 5 },
    { enabled: query.trim().length >= 2 }
  );

  const showDropdown = focused && query.trim().length >= 2;

  function handleSelect(postId: string) {
    setQuery('');
    setFocused(false);
    router.push(`/posts/${postId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && results.length > 0) handleSelect(results[0].id);
    if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 ring-1 ring-transparent focus-within:bg-white focus-within:ring-blue-200">
        <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="게시글, 키워드 검색"
          className="w-32 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:w-56 md:w-72"
        />
      </div>

      {showDropdown && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm font-medium text-slate-700">검색 결과가 없습니다</p>
              <p className="mt-1 text-xs text-slate-400">다른 키워드로 다시 검색해보세요.</p>
            </div>
          ) : (
            results.map((post) => (
              <button
                key={post.id}
                onMouseDown={() => handleSelect(post.id)}
                className="w-full border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {post.channelName && <span>#{post.channelName}</span>}
                  {post.createdAt && <span>{relativeTime(post.createdAt)}</span>}
                </div>
                {post.title && <p className="mt-1 truncate text-sm font-medium text-slate-800">{post.title}</p>}
                <p className="mt-0.5 truncate text-xs text-slate-500">{post.content}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
