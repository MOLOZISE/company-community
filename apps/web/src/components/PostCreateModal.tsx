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
  const [showOptional, setShowOptional] = useState(false);

  const { data: channelsData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0 });
  const createPost = trpc.posts.create.useMutation();

  function handleFile(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId) {
      setError('게시판을 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }
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
      setError(err instanceof Error ? err.message : '게시물 작성에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">새 글 작성</h2>
            <p className="mt-1 text-sm text-slate-500">질문, 공유, 고민을 편하게 적어보세요.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            닫기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              채널
            </label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">채널 선택</option>
              {channelsData?.items.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
              rows={7}
              placeholder="상황, 궁금한 점, 의견을 편하게 적어주세요."
              required
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p
              className={`mt-0.5 text-right text-xs ${
                content.length > MAX_CONTENT * 0.9 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {content.length}/{MAX_CONTENT}
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span>
              <span className="block font-medium text-slate-800">익명으로 게시</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                프로필 대신 익명 별명으로 표시됩니다.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => setShowOptional((value) => !value)}
            aria-expanded={showOptional}
            className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showOptional ? '추가 옵션 ▲' : '추가 옵션 ▼'}
          </button>

          {showOptional && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    제목
                  </label>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                  placeholder="제목은 선택 사항입니다."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {title.length > MAX_TITLE * 0.8 && (
                  <p
                    className={`mt-0.5 text-right text-xs ${
                      title.length >= MAX_TITLE ? 'text-red-400' : 'text-slate-400'
                    }`}
                  >
                    {title.length}/{MAX_TITLE}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  글 유형
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FLAIRS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFlair(flair === f.value ? '' : f.value)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        flair === f.value
                          ? f.color
                          : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <ImageUpload onFile={handleFile} preview={imagePreview} />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={uploading || createPost.isLoading}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? '업로드 중...' : createPost.isLoading ? '게시 중...' : '게시하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
