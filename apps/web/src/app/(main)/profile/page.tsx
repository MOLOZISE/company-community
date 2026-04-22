'use client';

import { useState } from 'react';
import { ProfileForm } from '@/components/ProfileForm';
import { ActivityTab } from '@/components/ActivityTab';
import { SavedPostsTab } from '@/components/SavedPostsTab';

type Tab = 'edit' | 'activity' | 'saved';

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'edit', label: '프로필 수정' },
  { key: 'activity', label: '내 활동' },
  { key: 'saved', label: '저장한 글' },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('edit');

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-900">내 프로필</h2>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === item.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'edit' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <ProfileForm />
        </div>
      ) : tab === 'activity' ? (
        <ActivityTab />
      ) : (
        <SavedPostsTab />
      )}
    </div>
  );
}
