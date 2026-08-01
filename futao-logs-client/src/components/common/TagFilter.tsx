'use client';

import type { Tag } from '../../lib/types';

interface TagFilterProps {
  tags: Tag[];
  selectedTagId: number | null;
  onChange: (tagId: number | null) => void;
}

export default function TagFilter({ tags, selectedTagId, onChange }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
      <button
        onClick={() => onChange(null)}
        className="text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer"
        style={{
          background: selectedTagId === null ? 'var(--accent-soft)' : 'var(--bg-secondary)',
          color: selectedTagId === null ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: selectedTagId === null ? 500 : 400,
        }}
      >
        全部日记
      </button>
      {tags.map((tag) => {
        const sel = selectedTagId === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() => onChange(sel ? null : tag.id)}
            className="text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all duration-150 cursor-pointer"
            style={{
              background: sel ? 'var(--accent-soft)' : 'var(--bg-secondary)',
              color: sel ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: sel ? 500 : 400,
            }}
          >
            #{tag.name}
          </button>
        );
      })}
    </div>
  );
}
