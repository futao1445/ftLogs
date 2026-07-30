'use client';

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

/** Today's label for the page header */
function todayLabel(): string {
  const now = new Date();
  return `今天 ${mmdd(now)}`;
}

/* ─── Skeleton card (loading placeholder) ─── */

function TimelineSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      {/* Leaf illustration */}
      <svg
        className="mb-6"
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M32 8C32 8 18 20 16 32C14 44 24 54 32 56C40 54 50 44 48 32C46 20 32 8 32 8Z"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="var(--accent-soft)"
        />
        <path d="M32 56L32 32" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M32 32L44 22" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        还没有日记，写第一篇吧
      </p>

      {onNew && (
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          写第一篇日记
        </button>
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ═══ Page header — today's date + export + new-diary button ═══ */}
      <header className="flex items-center justify-between mb-2">
        <h1
          className="text-lg font-medium tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          ◈ {todayLabel()}
        </h1>

        <div className="flex items-center gap-2">
          <ExportButton />
          {onNew && (
            <button
              onClick={onNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-hover)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
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
            </button>
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
              <div style={{ paddingLeft: 32 }}>
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
                {/* For the first group (today), the page header already shows
                    "今天 MM/DD", so we only render the grouped header for
                    non-today groups. */}
                {!(isFirstGroup && isTodayGroup) && (
                  <div
                    className="relative timeline-dot mb-5"
                    style={{ paddingLeft: 32 }}
                  >
                    <h2
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      ◈ {groupLabel(group.date)}
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
                        style={{ paddingLeft: 32 }}
                      >
                        <div
                          className="h-px w-full"
                          style={{ background: 'var(--border-default)' }}
                        />
                      </div>

                      {/* Card */}
                      <div style={{ paddingLeft: 32 }}>
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
            <div className="flex justify-center pt-6 pb-2" style={{ paddingLeft: 32 }}>
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {loading ? '加载中…' : '加载更多'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ Inline loading indicator (loading more) ═══ */}
      {loading && groups.length > 0 && (
        <div className="flex justify-center py-4" style={{ paddingLeft: 32 }}>
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
