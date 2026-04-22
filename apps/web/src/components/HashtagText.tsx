import Link from 'next/link';
import type { ReactNode } from 'react';

const HASHTAG_PATTERN = /#([\p{L}\p{N}_]+)/gu;

interface HashtagTextProps {
  text: string;
  className?: string;
}

export function HashtagText({ text, className }: HashtagTextProps) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(HASHTAG_PATTERN)) {
    const start = match.index ?? 0;
    const tag = match[1] ?? '';
    const before = text.slice(lastIndex, start);
    if (before) nodes.push(before);
    nodes.push(
      <Link
        key={`${start}-${tag}`}
        href={`/tag/${encodeURIComponent(tag.toLowerCase())}`}
        className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
      >
        #{tag}
      </Link>
    );
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span className={className}>{nodes}</span>;
}
