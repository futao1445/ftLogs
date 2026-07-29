'use client';

import { useRef, useState } from 'react';

interface ImageUploadProps {
  images: { filepath: string; filename: string }[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}

export default function ImageUpload({ images, onAdd, onRemove }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length > 0) onAdd(files);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length > 0) onAdd(files);
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <div
            key={i}
            className="relative rounded-lg overflow-hidden group"
            style={{ width: 60, height: 60 }}
          >
            <img
              src={img.filepath}
              alt={img.filename}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-150"
          style={{
            width: 60,
            height: 60,
            background: dragOver ? 'var(--accent-soft)' : 'var(--bg-tertiary)',
            border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`,
            color: 'var(--text-tertiary)',
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          <span className="text-[10px]">添加</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  );
}
