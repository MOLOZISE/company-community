'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ImageUpload } from './ImageUpload';
import { uploadPostImage } from '@/lib/storage';
import { toast } from '@/store/toast';
import { FLAIRS } from '@/lib/flair';

const MAX_TITLE = 300;
const MAX_CONTENT = 10000;

interface PostCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
  defaultChannelId?: string;
}

export function PostCreateModal({ onClose, onCreated, defaultChannelId }: PostCreateModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channelId, setChannelId] = useState(defaultChannelId ?? '');
  const [flair, setFlair] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: channelsData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0 });
  const createPost = trpc.posts.create.useMutation();

  function handleFile(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId) { setError('채널을 선택해주세요.'); return; }
    if (!content.trim()) { setError('내용을 입력해주세요.'); return; }
    setError('');
    setUploading(true);

    try {
      let mediaUrls: string[] = [];
      if (imageFile) {
        const url = await uploadPostImage(imageFile, crypto.randomUUID());
        mediaUrls = [url];
      }

      await createPost.mutateAsync({
        channelId,
        title: title.trim() || undefined,
        content: content.trim(),
        isAnonymous,
        mediaUrls,
        flair: flair || undefined,
      });

      toast.success('게시물이 등록되었습니다.');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시물 작성 실패');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">게시물 작성</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl" aria-label="닫기">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">채널 선택</option>
            {channelsData?.items.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>

          {/* Flair chips */}
          <div className="flex flex-wrap gap-1.5">
            {FLAIRS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFlair(flair === f.value ? '' : f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  flair === f.value
                    ? f.color + ' border-transparent'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="제목 (선택)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {title.length > MAX_TITLE * 0.8 && (
              <p className={`text-xs mt-0.5 text-right ${title.length >= MAX_TITLE ? 'text-red-400' : 'text-slate-400'}`}>
                {title.length}/{MAX_TITLE}
              </p>
            )}
          </div>

          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
              rows={5}
              placeholder="내용을 입력하세요..."
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className={`text-xs mt-0.5 text-right ${content.length > MAX_CONTENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
              {content.length}/{MAX_CONTENT}
            </p>
          </div>

          <ImageUpload onFile={handleFile} preview={imagePreview} />

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            익명으로 게시
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={uploading || createPost.isLoading}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {uploading ? '업로드 중...' : createPost.isLoading ? '게시 중...' : '게시하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
