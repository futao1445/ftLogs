import { useState, useMemo, useCallback } from 'react';
import type { CalendarDay } from '../../lib/types';

/* ─── Props ─── */
interface CalendarViewProps {
  year: number;
  month: number;
  days: CalendarDay[];
  onMonthChange: (year: number, month: number) => void;
  onDayClick?: (date: string) => void;
}

/* ─── Constants ─── */
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/* ─── Helpers ─── */

/** Format (year, month, day) into "YYYY-MM-DD". */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Check if a given date is today. */
function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === day
  );
}

/* ─── CalendarCell type ─── */
interface CalendarCell {
  day: number;
  isCurrentMonth: boolean;
  dateStr: string;
}

/** Build the 42-cell calendar grid (6 rows x 7 columns, Monday start). */
function buildGrid(year: number, month: number): CalendarCell[] {
  // Day-of-week for the 1st of the month (0 = Sun … 6 = Sat)
  // Convert to Monday-based: Mon=0, Tue=1 … Sun=6
  const rawFirstDay = new Date(year, month - 1, 1).getDay();
  const startOffset = rawFirstDay === 0 ? 6 : rawFirstDay - 1;

  const daysInMonth = new Date(year, month, 0).getDate();

  // Previous month metadata (for filling leading blanks)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  // Next month metadata (for filling trailing blanks)
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: CalendarCell[] = [];

  // ── Leading blanks (previous month) ──
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      day: d,
      isCurrentMonth: false,
      dateStr: formatDate(prevYear, prevMonth, d),
    });
  }

  // ── Current month ──
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      isCurrentMonth: true,
      dateStr: formatDate(year, month, d),
    });
  }

  // ── Trailing blanks (next month) to fill 42 cells ──
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      isCurrentMonth: false,
      dateStr: formatDate(nextYear, nextMonth, d),
    });
  }

  return cells;
}

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */
export default function CalendarView({
  year,
  month,
  days,
  onMonthChange,
  onDayClick,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Derived data ──
  const calendarCells = useMemo(() => buildGrid(year, month), [year, month]);

  // Mood→dot color map
  const MOOD_DOT_COLORS: Record<string, string> = {
    calm: '#4caf50',
    happy: '#ffc107',
    sad: '#2196f3',
    fire: '#ff5722',
    idea: '#9c27b0',
    sparkle: '#ffd54f',
  };

  const dayMoodMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const day of days) {
      map.set(day.date, day.previews[0]?.mood || null);
    }
    return map;
  }, [days]);

  const daySet = useMemo(() => new Set(days.map((d) => d.date)), [days]);

  // ── Navigation ──
  const handlePrevMonth = useCallback(() => {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    onMonthChange(y, m);
    setSelectedDate(null);
  }, [year, month, onMonthChange]);

  const handleNextMonth = useCallback(() => {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    onMonthChange(y, m);
    setSelectedDate(null);
  }, [year, month, onMonthChange]);

  // ── Day click ──
  const handleDayClick = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      onDayClick?.(dateStr);
    },
    [onDayClick],
  );

  /* ─── Styles (memoised static objects) ─── */

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-card)',
      padding: '12px',
    }),
    [],
  );

  const navStyle: React.CSSProperties = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
      padding: '0 4px',
    }),
    [],
  );

  const arrowBaseStyle: React.CSSProperties = useMemo(
    () => ({
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      fontSize: '14px',
      padding: '4px 8px',
      borderRadius: 'var(--radius-sm)',
      transition: 'background 0.15s, color 0.15s',
      lineHeight: 1,
    }),
    [],
  );

  const monthTitleStyle: React.CSSProperties = useMemo(
    () => ({
      color: 'var(--text-primary)',
      fontSize: 'var(--font-size-base)',
      fontWeight: 600,
      userSelect: 'none',
    }),
    [],
  );

  const gridStyle: React.CSSProperties = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '2px',
    }),
    [],
  );

  const weekdayStyle: React.CSSProperties = useMemo(
    () => ({
      textAlign: 'center',
      fontSize: 'var(--font-size-xs)',
      color: 'var(--text-tertiary)',
      height: '28px',
      lineHeight: '28px',
      fontWeight: 500,
    }),
    [],
  );

  /* ─── Render ─── */
  return (
    <div style={containerStyle}>
      {/* ── Month Navigation ── */}
      <div style={navStyle}>
        <button
          onClick={handlePrevMonth}
          style={arrowBaseStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-soft)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          aria-label="上一个月"
        >
          ◀
        </button>
        <span style={monthTitleStyle}>
          {year}年{month}月
        </span>
        <button
          onClick={handleNextMonth}
          style={arrowBaseStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-soft)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          aria-label="下一个月"
        >
          ▶
        </button>
      </div>

      {/* ── Weekday Header ── */}
      <div style={gridStyle}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} style={weekdayStyle}>
            {label}
          </div>
        ))}

        {/* ── Date Cells ── */}
        {calendarCells.map((cell) => {
          const hasEntry = daySet.has(cell.dateStr);
          const isSelected = selectedDate === cell.dateStr;
          const today = cell.isCurrentMonth && isToday(year, month, cell.day);

          const cellStyle: React.CSSProperties = {
            position: 'relative',
            width: '40px',
            height: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: isSelected ? 'var(--accent-border)' : 'transparent',
            border: isSelected
              ? '1px solid var(--accent)'
              : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            cursor: cell.isCurrentMonth ? 'pointer' : 'default',
            color: !cell.isCurrentMonth
              ? 'var(--text-tertiary)'
              : today
                ? 'var(--accent)'
                : 'var(--text-primary)',
            fontWeight: today || isSelected ? 600 : 400,
            fontSize: 'var(--font-size-sm)',
            transition: 'background 0.15s, border-color 0.1s',
            margin: 'auto',
            padding: 0,
            outline: 'none',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          };

          return (
            <button
              key={cell.dateStr}
              onClick={() => handleDayClick(cell.dateStr)}
              disabled={!cell.isCurrentMonth}
              style={cellStyle}
              onMouseEnter={(e) => {
                if (cell.isCurrentMonth && !isSelected) {
                  e.currentTarget.style.background = 'var(--accent-soft)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              aria-label={`${cell.dateStr}${hasEntry ? ', 有日记' : ''}`}
              aria-selected={isSelected}
              role="gridcell"
            >
              <span>{cell.day}</span>
              {hasEntry && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '5px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: MOOD_DOT_COLORS[dayMoodMap.get(cell.dateStr) || ''] || 'var(--accent)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
