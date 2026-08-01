'use client';

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
const MONTH_CN = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

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
  const rawFirstDay = new Date(year, month - 1, 1).getDay();
  const startOffset = rawFirstDay === 0 ? 6 : rawFirstDay - 1;

  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: CalendarCell[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({ day: d, isCurrentMonth: false, dateStr: formatDate(prevYear, prevMonth, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, dateStr: formatDate(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, isCurrentMonth: false, dateStr: formatDate(nextYear, nextMonth, d) });
  }
  return cells;
}

/* ═══════════════════════════════════════════════
   纵向水草日历（#25 页面 01）
   ═══════════════════════════════════════════════ */
export default function CalendarView({
  year,
  month,
  days,
  onMonthChange,
  onDayClick,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendarCells = useMemo(() => buildGrid(year, month), [year, month]);

  const daySet = useMemo(() => new Set(days.map((d) => d.date)), [days]);
  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  /* 双向水草茎：选中月居中，往前往后都能遍历（futao 修复②） */
  const monthStems = useMemo(() => {
    const stems: { y: number; m: number; label: string }[] = [];
    // 3 个过去月 + 当前 + 2 个未来月 = 6 根茎，当前月居中
    const offsets = [-3, -2, -1, 0, 1, 2];
    for (const off of offsets) {
      let m = month + off;
      let y = year;
      while (m <= 0) { m += 12; y--; }
      while (m > 12) { m -= 12; y++; }
      stems.push({ y, m, label: MONTH_CN[m] });
    }
    return stems;
  }, [year, month]);

  /* ── Navigation ── */
  const goMonth = useCallback((y: number, m: number) => {
    onMonthChange(y, m);
    setSelectedDate(null);
  }, [onMonthChange]);

  /* ── Day click — 点日泛涟漪 + 回忆卡浮起（停留本页）── */
  const handleDayClick = useCallback(
    (dateStr: string, isCurrent: boolean) => {
      if (!isCurrent) return;
      setSelectedDate(dateStr === selectedDate ? null : dateStr);
    },
    [selectedDate],
  );

  const selectedDay: CalendarDay | null = selectedDate ? dayMap.get(selectedDate) || null : null;
  const selectedLabel = selectedDate ? `${Number(selectedDate.slice(5, 7))}月${Number(selectedDate.slice(8, 10))}日` : '';

  return (
    <div
      className="cal-pond"
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(45,74,117,0.45)',
        background: 'linear-gradient(180deg, rgba(23,42,69,0.45), rgba(12,22,38,0.4))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 48px rgba(0,0,0,0.22)',
      }}
    >
      <div className="cal-row" style={{ display: 'flex', gap: 16, padding: 20, minHeight: 480 }}>
        {/* ── 左侧：水草月份茎（几何描边茎，非色块）── */}
        <div
          className="cal-stems"
          style={{
            width: 110,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            justifyContent: 'flex-end',
            padding: '10px 6px',
            borderRadius: 16,
            border: '1px solid rgba(45,74,117,0.2)',
            background: 'linear-gradient(180deg, transparent, rgba(23,42,69,0.25))',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 水底光 */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
              background: 'radial-gradient(ellipse at 50% 100%, rgba(111,180,255,0.16), transparent 65%)',
              pointerEvents: 'none',
            }}
          />
          {/* 水面线 */}
          <div
            style={{
              position: 'absolute', left: 8, right: 8, top: '30%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(168,208,255,0.35), transparent)',
              pointerEvents: 'none',
            }}
          />
          {monthStems.map((s, idx) => {
            const active = s.y === year && s.m === month;
            /* 错落茎高：当前月(idx3)贴水底最矮，其余错落 */
            const heights = [118, 96, 108, 74, 100, 86];
            const h = heights[idx] ?? 92;
            return (
              <button
                key={`${s.y}-${s.m}`}
                onClick={() => goMonth(s.y, s.m)}
                className={`cal-stem ${active ? 'on' : ''}`}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  cursor: 'pointer',
                  border: 'none', background: 'none', padding: 0,
                  outline: 'none', fontFamily: 'inherit',
                  transformOrigin: 'bottom center',
                }}
                title={`${s.label}`}
              >
                {/* 选中：茎尖月金水光从根涌到尖 */}
                {active && <span className="cal-stem-glow" />}
                <svg
                  width={56} height={h} viewBox="0 0 56 112"
                  className={`cal-stem-svg ${active ? 'on' : ''}`}
                  style={{ display: 'block', flexShrink: 0 }}
                >
                  {/* 主茎（弯曲描边） */}
                  <path
                    d="M28 110 C26 84 30 62 25 44 C22 30 26 18 29 8"
                    fill="none" strokeWidth="2.6" strokeLinecap="round"
                  />
                  {/* 茎尖小叶 */}
                  <path
                    d="M29 8 C40 6 49 12 52 20 C45 18 38 15 32 13 C30 12 29 9 29 8 Z"
                  />
                  {/* 中部侧叶 */}
                  <path
                    d="M25 52 C15 54 8 60 6 68 C12 64 19 59 27 57 Z"
                  />
                  {/* 根部须（水底扎根） */}
                  <path
                    d="M28 110 C26 114 22 117 18 118 M28 110 C30 113 33 115 37 116"
                    fill="none" strokeWidth="1.4" strokeLinecap="round"
                  />
                </svg>
                <span className="cal-stem-label">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 中间：水面格 ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 星期表头 */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              marginBottom: 8,
            }}
          >
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                style={{
                  textAlign: 'center', fontSize: 11, color: '#8fa6c4',
                  height: 28, lineHeight: '28px', fontWeight: 500, letterSpacing: 1,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 日期格 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {calendarCells.map((cell) => {
              const hasEntry = daySet.has(cell.dateStr);
              const isSelected = selectedDate === cell.dateStr;
              const today = cell.isCurrentMonth && isToday(year, month, cell.day);

              const style: React.CSSProperties = {
                aspectRatio: '1',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                background: hasEntry
                  ? 'radial-gradient(circle at 50% 60%, rgba(111,180,255,0.22) 0%, rgba(23,42,69,0.6) 70%)'
                  : 'rgba(23,42,69,0.55)',
                border: today
                  ? '1px solid #ffd9a0'
                  : isSelected
                    ? '1px solid #6fb4ff'
                    : '1px solid rgba(45,74,117,0.4)',
                color: !cell.isCurrentMonth
                  ? 'rgba(143,166,196,0.4)'
                  : today
                    ? '#ffd9a0'
                    : isSelected
                      ? '#e2ecfa'
                      : '#8fa6c4',
                boxShadow: today
                  ? '0 0 14px rgba(255,217,160,0.18)'
                  : isSelected
                    ? '0 0 12px rgba(111,180,255,0.15)'
                    : 'none',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                outline: 'none',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              };

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => handleDayClick(cell.dateStr, cell.isCurrentMonth)}
                  style={style}
                  onMouseEnter={(e) => {
                    if (cell.isCurrentMonth && !isSelected && !today) {
                      e.currentTarget.style.borderColor = 'rgba(111,180,255,0.4)';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = today
                        ? '#ffd9a0'
                        : hasEntry
                          ? 'rgba(111,180,255,0.3)'
                          : 'rgba(45,74,117,0.4)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  aria-label={`${cell.dateStr}${hasEntry ? ', 有日记' : ''}`}
                  role="gridcell"
                >
                  <span>{cell.day}</span>
                  {hasEntry && (
                    <span
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#6fb4ff', boxShadow: '0 0 6px #6fb4ff',
                        marginTop: 4, pointerEvents: 'none',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 右侧：玻璃回忆卡 ── */}
        <div
          className="cal-memory"
          style={{
            width: 180,
            flexShrink: 0,
            borderRadius: 16,
            padding: 16,
            background: 'rgba(12,22,38,0.7)',
            backdropFilter: 'blur(28px) saturate(160%)',
            border: '1px solid rgba(111,180,255,0.2)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            transition: 'opacity 0.25s ease',
            opacity: selectedDay ? 1 : 0.55,
          }}
        >
          {selectedDay ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#e2ecfa', marginBottom: 4 }}>
                {selectedLabel}
              </div>
              <div style={{ fontSize: 11, color: '#ffd9a0', marginBottom: 12, letterSpacing: 1 }}>
                水波浮起 {selectedDay.count} 段回忆
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 300 }}>
                {selectedDay.previews.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      fontSize: 11, padding: '8px 10px', borderRadius: 10, marginBottom: 8,
                      background: 'rgba(74,106,148,0.16)', color: '#8fa6c4',
                      border: '1px solid rgba(74,106,148,0.18)', lineHeight: 1.5,
                    }}
                  >
                    {p.preview}
                    {p.mood && (
                      <div style={{ fontSize: 10, color: '#a8d0ff', marginTop: 4 }}>
                        {p.mood}
                      </div>
                    )}
                  </div>
                ))}
                {selectedDay.previews.length > 4 && (
                  <div style={{ fontSize: 10, color: '#8fa6c4', textAlign: 'center', paddingTop: 4 }}>
                    还有 {selectedDay.previews.length - 4} 段
                  </div>
                )}
              </div>
              <button
                onClick={() => onDayClick?.(selectedDate!)}
                style={{
                  marginTop: 'auto',
                  padding: '8px 0',
                  borderRadius: 999,
                  fontSize: 11,
                  cursor: 'pointer',
                  background: 'rgba(111,180,255,0.16)',
                  color: '#a8d0ff',
                  border: '1px solid rgba(111,180,255,0.35)',
                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,217,160,0.2)'; e.currentTarget.style.color = '#ffd9a0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(111,180,255,0.16)'; e.currentTarget.style.color = '#a8d0ff'; }}
              >
                去读这段回忆 →
              </button>
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#8fa6c4', textAlign: 'center', paddingTop: 60, lineHeight: 1.8 }}>
              点一个日期
              <br />
              回忆会像水波
              <br />
              浮到水面
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
