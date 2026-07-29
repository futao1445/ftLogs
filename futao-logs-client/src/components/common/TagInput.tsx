'use client';

import { useState, useRef } from 'react';

interface TagInputProps {
  tags: { id: number; name: string; color: string }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  onCreateTag?: (name: string) => Promise<number | undefined>;
}

export default function TagInput({ tags, selectedIds, onChange, onCreateTag }: TagInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(inputVal.toLowerCase()) &&
      !selectedIds.includes(t.id)
  );

  const handleSelect = (id: number) => {
    onChange([...selectedIds, id]);
    setInputVal('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemove = (id: number) => {
    onChange(selectedIds.filter((sid) => sid !== id));
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputVal.trim() && onCreateTag) {
      const id = await onCreateTag(inputVal.trim());
      if (id) handleSelect(id);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {selectedIds.map((id) => {
          const tag = tags.find((t) => t.id === id);
          if (!tag) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              #{tag.name}
              <button
                onClick={() => handleRemove(id)}
                className="ml-0.5 hover:opacity-70"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="+ 输入标签名，回车创建"
          className="w-full text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
          }}
        />
        {showSuggestions && inputVal && filtered.length > 0 && (
          <div
            className="absolute z-20 w-full mt-1 rounded-lg overflow-hidden shadow-lg"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            {filtered.slice(0, 5).map((t) => (
              <button
                key={t.id}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-primary)' }}
                onMouseDown={() => handleSelect(t.id)}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ background: t.color || 'var(--accent)' }}
                />
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
