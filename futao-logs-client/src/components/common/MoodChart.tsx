'use client';

import { useState } from 'react';

/* ─── Mood definitions matching DiaryCard ─── */
const MOOD_DEFS: Record<string, { emoji: string; color: string; label: string }> = {
  calm: { emoji: '🌿', color: '#34d399', label: '平静' },
  happy: { emoji: '😊', color: '#facc15', label: '开心' },
  sad: { emoji: '😢', color: '#60a5fa', label: '伤心' },
  fire: { emoji: '🔥', color: '#f97316', label: '燃烧' },
  idea: { emoji: '💡', color: '#a78bfa', label: '灵感' },
  sparkle: { emoji: '✨', color: '#f472b6', label: '闪亮' },
};

const MOOD_KEYS = Object.keys(MOOD_DEFS);

/* ─── Types ─── */
interface MoodCount {
  mood: string;
  count: number;
}

interface MoodChartProps {
  data: MoodCount[];
  totalCount: number;
  loading?: boolean;
}

/* ─── Helpers ─── */
function getMoodDef(key: string) {
  return MOOD_DEFS[key] || { emoji: '❓', color: '#6b7280', label: key };
}

/** 判断某种情绪是否属于"积极" */
function isPositive(key: string): boolean {
  return !['sad'].includes(key);
}

/* ─── Skeleton ─── */
function MoodChartSkeleton() {
  return (
    <div
      className="rounded-xl p-4 animate-pulse"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="h-4 w-28 rounded mb-4" style={{ background: 'var(--bg-tertiary)' }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <div className="h-3 w-8 rounded" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="flex-1 h-3 rounded-full" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-3 w-4 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Empty state ─── */
function MoodChartEmpty() {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-4">
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>📊 本月心情</span>
      </div>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
        还没有日记数据
      </p>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        开始记录日记后这里会显示情绪趋势
      </p>
    </div>
  );
}

/* ─── Main component ─── */
export default function MoodChart({ data, totalCount, loading = false }: MoodChartProps) {
  if (loading) return <MoodChartSkeleton />;
  if (totalCount === 0) return <MoodChartEmpty />;

  // Build a map: moodKey -> count
  const countMap: Record<string, number> = {};
  for (const d of data) {
    countMap[d.mood] = (countMap[d.mood] || 0) + d.count;
  }

  // Fill in zero counts for missing moods
  const sorted = MOOD_KEYS.map((key) => ({
    key,
    count: countMap[key] || 0,
    ...getMoodDef(key),
  })).filter((m) => m.count > 0);

  const maxCount = Math.max(...sorted.map((m) => m.count), 1);
  const positiveCount = sorted.filter((m) => isPositive(m.key)).reduce((sum, m) => sum + m.count, 0);
  const positivePct = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Title */}
      <div className="flex items-center gap-1.5 mb-4">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>📊 本周心情</span>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        {sorted.map((m) => (
          <div key={m.key} className="flex items-center gap-2">
            {/* Emoji + label */}
            <span className="text-xs w-10 shrink-0" style={{ color: 'var(--text-secondary)' }}>
              {m.emoji} {m.label}
            </span>

            {/* Bar track */}
            <div
              className="flex-1 h-3 rounded-full overflow-hidden"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((m.count / maxCount) * 100, 5)}%`,
                  background: m.color,
                }}
              />
            </div>

            {/* Count */}
            <span className="text-xs w-6 text-right shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              {m.count}
            </span>
          </div>
        ))}
      </div>

      {/* Stats line */}
      <div className="mt-3 text-center">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          共 {totalCount} 篇日记 · 积极情绪占 {positivePct}%
        </span>
      </div>
    </div>
  );
}
