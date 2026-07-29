'use client';

const MOODS = [
  { key: 'calm', emoji: '🌿' },
  { key: 'happy', emoji: '😊' },
  { key: 'sad', emoji: '😢' },
  { key: 'fire', emoji: '🔥' },
  { key: 'idea', emoji: '💡' },
  { key: 'sparkle', emoji: '✨' },
];

interface MoodPickerProps {
  value: string | null;
  onChange: (mood: string | null) => void;
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        心情：
      </span>
      {MOODS.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(value === m.key ? null : m.key)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all duration-150"
          style={{
            background: value === m.key ? 'var(--gold-soft)' : 'transparent',
            outline: value === m.key ? `2px solid var(--gold)` : 'none',
            transform: value === m.key ? 'scale(1.15)' : 'scale(1)',
          }}
          title={m.key}
        >
          {m.emoji}
        </button>
      ))}
      {value && (
        <button
          onClick={() => onChange(null)}
          className="text-xs px-2 py-1 rounded"
          style={{ color: 'var(--text-tertiary)' }}
        >
          清除
        </button>
      )}
    </div>
  );
}
