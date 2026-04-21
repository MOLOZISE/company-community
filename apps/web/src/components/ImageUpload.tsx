'use client';

import { useRef, useState } from 'react';

interface ImageUploadProps {
  onFile: (file: File | null) => void;
  preview: string | null;
}

export function ImageUpload({ onFile, preview }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지는 10MB 이하만 업로드할 수 있습니다.');
      return;
    }
    onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (preview) {
    return (
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="첨부 이미지 미리보기" className="max-h-48 rounded-lg object-cover" />
        <button
          type="button"
          onClick={() => onFile(null)}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
          aria-label="이미지 제거"
        >
          x
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <p className="text-sm text-slate-500">이미지를 드래그하거나 클릭해서 업로드</p>
      <p className="mt-1 text-xs text-slate-400">최대 10MB</p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}
