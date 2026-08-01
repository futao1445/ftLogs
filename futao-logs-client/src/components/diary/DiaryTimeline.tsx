'use client';

import { motion } from 'framer-motion';
import { type Diary, type TimelineGroup, type Tag } from '../../lib/types';
import DiaryCard from './DiaryCard';
import OnThisDay from '../common/OnThisDay';
import TagFilter from '../common/TagFilter';
import ExportButton from '../common/ExportButton';
import AISummaryCard from '../common/AISummaryCard';

/* ─── Props ─── */

interface DiaryTimelineProps {
  groups: TimelineGroup[];
  loading?: boolean;
  onEdit?: (diary: Diary) => void;
  onDelete?: (id: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onNew?: () => void;
  totalCount?: number;
  streak?: number;
  onThisDay?: { id: number; preview: string; year: number } | null;
  onViewOnThisDay?: (id: number) => void;
  tags?: Tag[];
  selectedTagId?: number | null;
  onTagChange?: (tagId: number | null) => void;
}

/* ─── Date / time helpers ─── */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date to "MM/DD" */
function mmdd(d: Date): string {
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

/** Check if a date string falls on the same calendar day as `compare` */
function isSameDay(dateStr: string, compare: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === compare.getFullYear() &&
    d.getMonth() === compare.getMonth() &&
    d.getDate() === compare.getDate()
  );
}

/** Human-friendly date label for a TimelineGroup */
function groupLabel(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const isToday = isSameDay(dateStr, now);

  if (isToday) {
    return `今天 ${mmdd(date)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(dateStr, yesterday)) {
    return `昨天 ${mmdd(date)}`;
  }

  // Same year -> "MM/DD", otherwise "YYYY/MM/DD"
  if (date.getFullYear() === now.getFullYear()) {
    return `${mmdd(date)}`;
  }
  return `${date.getFullYear()}/${mmdd(date)}`;
}

/** Extract "HH:mm" from a date string */
function extractTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* ─── Skeleton card (loading placeholder) ─── */

function TimelineSkeleton() {
  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
      {/* header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-6 w-28 rounded" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-9 w-20 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
      </div>

      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl p-4 animate-pulse"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 w-12 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-3 w-5 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
            <div className="h-px mb-3" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="space-y-2">
              <div className="h-3 w-full rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-3 w-3/4 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-3 w-1/2 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty state ─── */

function TimelineEmpty({ onNew }: { onNew?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* 空水面：一圈等待第一滴水的涟漪 */}
      <div className="relative mb-6" style={{ width: 64, height: 64 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              inset: 12 + i * 8,
              border: '1.5px solid rgba(111,180,255,0.45)',
              opacity: 0.7 - i * 0.2,
              animation: `ripple ${1.8 + i * 0.4}s ease-out ${i * 0.35}s infinite`,
            }}
          />
        ))}
        <span
          className="absolute"
          style={{
            inset: 4,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 42% 32%, rgba(226,236,250,0.9) 0%, #6fb4ff 55%, rgba(111,180,255,0.4) 100%)',
            boxShadow: '0 0 16px rgba(111,180,255,0.35)',
          }}
        />
      </div>

      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        水面上还没有日记，写第一篇吧
      </p>

      {onNew && (
        <motion.button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium cursor-pointer relative overflow-visible"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.25) 0%, rgba(111,180,255,0.08) 60%, rgba(111,180,255,0.02) 100%)',
            color: '#6fb4ff',
            border: '1px solid rgba(111,180,255,0.18)',
            boxShadow: '0 0 4px rgba(111,180,255,0.08)',
          }}
          whileHover={{
            background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.40) 0%, rgba(111,180,255,0.15) 50%, rgba(111,180,255,0.05) 100%)',
            color: '#a8d0ff',
            boxShadow: '0 0 20px rgba(111,180,255,0.25), 0 0 40px rgba(111,180,255,0.10)',
          }}
          whileTap={{
            scale: 0.96,
            background: 'radial-gradient(circle at 50% 50%, rgba(255,217,160,0.40) 0%, rgba(111,180,255,0.20) 50%, rgba(111,180,255,0.08) 100%)',
            color: '#ffd9a0',
            borderColor: 'rgba(255,217,160,0.35)',
            boxShadow: '0 0 40px rgba(255,217,160,0.30), 0 0 80px rgba(111,180,255,0.15)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          写第一篇日记
        </motion.button>
      )}
    </div>
  );
}

/* ─── Main component ─── */

export default function DiaryTimeline({
  groups,
  loading = false,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore = false,
  onNew,
  totalCount = 0,
  streak = 0,
  onThisDay,
  onViewOnThisDay,
  tags = [],
  selectedTagId = null,
  onTagChange,
}: DiaryTimelineProps) {
  /* ── Loading (initial) ── */
  if (loading && groups.length === 0) {
    return <TimelineSkeleton />;
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
      {/* ═══ Page header — today's date + export + new-diary button ═══ */}
      <header className="flex items-center justify-between mb-4">
        <h1
          className="text-lg font-medium tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          今天 · {mmdd(new Date())}
        </h1>

        <div className="flex items-center gap-2">
          <ExportButton />
          {onNew && (
            <motion.button
              onClick={onNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgba(111,180,255,0.85), rgba(168,208,255,0.9))',
                color: '#0a1626',
                boxShadow: '0 4px 18px rgba(111,180,255,0.25)',
                border: '1px solid rgba(168,208,255,0.5)',
                fontFamily: 'inherit',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span className="hidden sm:inline">新日记</span>
            </motion.button>
          )}
        </div>
      </header>

      {/* ═══ Stats bar ═══ */}
      {(totalCount > 0 || streak > 0) && (
        <div
          className="flex items-center gap-4 mb-4 text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {totalCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
              </svg>
              共 {totalCount} 篇
            </span>
          )}
          {streak > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              连续 {streak} 天
            </span>
          )}
        </div>
      )}

      {/* ═══ Tag filter ═══ */}
      {tags.length > 0 && (
        <div className="mb-4">
          <TagFilter tags={tags} selectedTagId={selectedTagId} onChange={onTagChange || (() => {})} />
        </div>
      )}

      {/* ═══ Empty state ═══ */}
      {!loading && groups.length === 0 && <TimelineEmpty onNew={onNew} />}

      {/* ═══ Timeline ═══ */}
      {groups.length > 0 && (
        <div className="relative timeline-line">
          {/* AI Summary Card — shown at top */}
          <section className="mb-6">
            <AISummaryCard />
          </section>

          {/* On This Day card — shown at top of first group when available */}
          {onThisDay && (
            <section className="mb-6">
              <div style={{ paddingLeft: 44 }}>
                <OnThisDay diary={onThisDay} onView={onViewOnThisDay || (() => {})} />
              </div>
            </section>
          )}
          {groups.map((group) => {
            const isFirstGroup = groups.indexOf(group) === 0;
            const now = new Date();
            const isTodayGroup = isSameDay(group.date, now);

            return (
              <section key={group.date} className="mb-8 last:mb-0">
                {/* ── Date group header ── */}
                {!(isFirstGroup && isTodayGroup) && (
                  <div
                    className="relative timeline-dot mb-5"
                    style={{ paddingLeft: 44 }}
                  >
                    <h2
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {groupLabel(group.date)}
                    </h2>
                  </div>
                )}

                {/* ── Diary entries ── */}
                <div className="space-y-6">
                  {group.diaries.map((diary) => (
                    <div key={diary.id}>
                      {/* Timeline separator line (time shown on card header) */}
                      <div
                        className="relative timeline-dot flex items-center mb-3"
                        style={{ paddingLeft: 44 }}
                      >
                        <div
                          className="h-px w-full"
                          style={{ background: 'rgba(45,74,117,0.35)' }}
                        />
                      </div>

                      {/* Card — 浮出玻璃卡 */}
                      <div className="timeline-card" style={{ marginLeft: 44 }}>
                        <DiaryCard
                          diary={diary}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* ═══ Load more ═══ */}
          {hasMore && (
            <div className="flex justify-center pt-6 pb-2" style={{ paddingLeft: 44 }}>
              <motion.button
                onClick={onLoadMore}
                disabled={loading}
                className="px-5 py-2 rounded-2xl text-sm font-medium cursor-pointer relative overflow-visible"
                style={{
                  background: 'linear-gradient(135deg, rgba(23,42,69,0.6) 0%, rgba(33,57,92,0.4) 100%)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(45,74,117,0.45)',
                }}
                whileHover={{
                  borderColor: 'rgba(168,208,255,0.45)',
                  color: '#a8d0ff',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px rgba(111,180,255,0.12)',
                }}
                whileTap={{
                  scale: 0.96,
                  background: 'radial-gradient(circle at 50% 50%, rgba(255,217,160,0.30) 0%, rgba(111,180,255,0.15) 60%, rgba(23,42,69,0.6) 100%)',
                  color: '#ffd9a0',
                  borderColor: 'rgba(255,217,160,0.35)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                {loading ? '加载中…' : '加载更多'}
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* ═══ Inline loading indicator (loading more) ═══ */}
      {loading && groups.length > 0 && (
        <div className="flex justify-center py-4" style={{ paddingLeft: 44 }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--accent)' }}
            />
            加载中…
          </div>
        </div>
      )}
    </div>
  );
}
