'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ImageUpload } from './ImageUpload';
import { uploadPostImage } from '@/lib/storage';
import { toast } from '@/store/toast';
import { FLAIRS } from '@/lib/flair';

const MAX_TITLE = 300;
const MAX_CONTENT = 10000;
const MAX_POLL_OPTIONS = 5;

interface PostCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
  defaultChannelId?: string;
}

export function PostCreateModal({ onClose, onCreated, defaultChannelId }: PostCreateModalProps) {
  const [kind, setKind] = useState<'text' | 'poll'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channelId, setChannelId] = useState(defaultChannelId ?? '');
  const [flair, setFlair] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const { data: channelsData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0 });
  const createPost = trpc.posts.create.useMutation();

  const visiblePollOptions = useMemo(() => pollOptions.slice(0, MAX_POLL_OPTIONS), [pollOptions]);

  function handleFile(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function switchKind(nextKind: 'text' | 'poll') {
    setKind(nextKind);
    setError('');
    if (nextKind === 'poll') {
      setImageFile(null);
      setImagePreview(null);
      setPollOptions((current) => {
        const next = [...current];
        while (next.length < 2) next.push('');
        return next.slice(0, MAX_POLL_OPTIONS);
      });
    }
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function addPollOption() {
    setPollOptions((current) => (current.length >= MAX_POLL_OPTIONS ? current : [...current, '']));
  }

  function removePollOption(index: number) {
    setPollOptions((current) => (current.length <= 2 ? current : current.filter((_, i) => i !== index)));
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

    const normalizedPollOptions =
      kind === 'poll'
        ? pollOptions.map((option) => option.trim()).filter(Boolean)
        : [];

    if (kind === 'poll' && (normalizedPollOptions.length < 2 || normalizedPollOptions.length > 5)) {
      setError('투표 옵션은 최소 2개, 최대 5개까지 입력할 수 있어요.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      let mediaUrls: string[] = [];
      if (kind === 'text' && imageFile) {
        const url = await uploadPostImage(imageFile, crypto.randomUUID());
        mediaUrls = [url];
      }

      await createPost.mutateAsync({
        channelId,
        title: title.trim() || undefined,
        content: content.trim(),
        kind,
        pollOptions: kind === 'poll' ? normalizedPollOptions : undefined,
        isAnonymous,
        mediaUrls,
        flair: flair || undefined,
      });

      toast.success('게시글을 작성했어요.');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 작성에 실패했어요.');
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
            <h2 className="text-lg font-bold text-slate-950">게시글 작성</h2>
            <p className="mt-1 text-sm text-slate-500">일반 글 또는 투표 게시글을 작성할 수 있어요.</p>
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
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchKind('text')}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                kind === 'text' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              일반 글
            </button>
            <button
              type="button"
              onClick={() => switchKind('poll')}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                kind === 'poll' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              투표 게시글 만들기
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              게시판
            </label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">게시판 선택</option>
              {channelsData?.items.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          {kind === 'poll' && (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">투표 옵션</p>
                  <p className="mt-0.5 text-xs text-slate-500">최소 2개, 최대 5개까지 입력할 수 있어요.</p>
                </div>
                <span className="text-xs text-slate-400">{visiblePollOptions.length}/{MAX_POLL_OPTIONS}</span>
              </div>

              <div className="space-y-2">
                {visiblePollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`옵션 ${index + 1}`}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {visiblePollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(index)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-white"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {visiblePollOptions.length < MAX_POLL_OPTIONS && (
                <button
                  type="button"
                  onClick={addPollOption}
                  className="w-full rounded-lg border border-dashed border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  옵션 추가
                </button>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
              rows={7}
              placeholder={kind === 'poll' ? '투표에 대한 설명을 적어주세요.' : '내용을 입력해주세요.'}
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
                프로필 대신 익명 별칭으로 표시돼요.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            aria-expanded={showAdvanced}
            className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showAdvanced ? '추가 옵션 닫기' : '추가 옵션 열기'}
          </button>

          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  제목
                </label>
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
                  글 분류
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

              {kind === 'text' && <ImageUpload onFile={handleFile} preview={imagePreview} />}
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
