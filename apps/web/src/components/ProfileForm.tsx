'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Avatar } from './Avatar';
import { uploadAvatar } from '@/lib/storage';
import { toast } from '@/store/toast';
import { useAuthStore } from '@/store/auth';

export function ProfileForm() {
  const { user } = useAuthStore();
  const utils = trpc.useContext();
  const { data: profile, isLoading } = trpc.auth.getMe.useQuery();
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.getMe.invalidate();
      toast.success('프로필이 저장되었습니다.');
    },
  });

  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
      setDepartment(profile.department ?? '');
      setJobTitle(profile.jobTitle ?? '');
      setAvatarPreview(profile.avatarUrl ?? null);
    }
  }, [profile]);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAvatarFile(file);
  }, []);

  useEffect(() => {
    return () => {
      setAvatarPreview((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return prev;
      });
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setUploading(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, user.id);
      }
      await updateProfile.mutateAsync({
        displayName: displayName || undefined,
        department: department || undefined,
        jobTitle: jobTitle || undefined,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      setAvatarFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return <div className="text-slate-500 text-sm">프로필 불러오는 중...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar
          src={avatarPreview}
          name={displayName || '?'}
          size="lg"
          onClick={() => fileRef.current?.click()}
          title="아바타 변경"
        />
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            사진 변경
          </button>
          <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP · 최대 2MB</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1">
          이름 (닉네임)
        </label>
        <input
          id="displayName"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">
          부서
        </label>
        <input
          id="department"
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="예: 개발팀"
        />
      </div>

      <div>
        <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700 mb-1">
          직책
        </label>
        <input
          id="jobTitle"
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="예: 시니어 개발자"
        />
      </div>

      {updateProfile.error && (
        <p className="text-sm text-red-600">{updateProfile.error.message}</p>
      )}

      <button
        type="submit"
        disabled={updateProfile.isPending || uploading}
        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {uploading ? '업로드 중...' : updateProfile.isPending ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}
