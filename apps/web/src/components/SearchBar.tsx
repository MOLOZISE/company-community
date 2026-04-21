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
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          placeholder="검색..."
          className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-28 sm:w-44 md:w-56"
        />
      </div>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-[min(320px,calc(100vw-1rem))] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">검색 결과 없음</p>
          ) : (
            results.map((post) => (
              <button
                key={post.id}
                onMouseDown={() => handleSelect(post.id)}
                className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                {post.title && (
                  <p className="text-sm font-medium text-slate-800 truncate">{post.title}</p>
                )}
                <p className="text-xs text-slate-500 truncate mt-0.5">{post.content}</p>
                <p className="text-xs text-slate-400 mt-1">{relativeTime(post.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
