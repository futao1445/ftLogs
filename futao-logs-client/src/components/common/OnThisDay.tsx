'use client';

interface OnThisDayProps {
  diary: { id: number; preview: string; year: number } | null;
  onView: (id: number) => void;
}

export default function OnThisDay({ diary, onView }: OnThisDayProps) {
  if (!diary) return null;

  return (
    <div
      className="rounded-xl p-4 mb-6 animate-[fadeIn_0.3s_ease-out]"
      style={{
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">📅</span>
        <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          {diary.year} 年今天
        </span>
      </div>
      <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-primary)' }}>
        你写了「{diary.preview}」
      </p>
      <button
        onClick={() => onView(diary.id)}
        className="text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--accent)' }}
      >
        查看完整日记 →
      </button>
    </div>
  );
}
