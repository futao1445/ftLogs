'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import SummaryCard from './SummaryCard';
import KnowledgeGraph from '../knowledge-graph/KnowledgeGraph';
import type { SummaryLevel, SummaryData } from './SummaryCard';

/* ─── Level config ─── */

const LEVELS: { key: SummaryLevel; label: string; sub: string; depth: string }[] = [
  { key: 'day', label: '日报', sub: '浅水面 · 当日细波', depth: 'rgba(168,208,255,0.45)' },
  { key: 'week', label: '周报', sub: '中层水 · 一周回响', depth: 'rgba(111,180,255,0.45)' },
  { key: 'month', label: '月报', sub: '中层水 · 一月沉流', depth: 'rgba(74,106,148,0.5)' },
  { key: 'year', label: '年报', sub: '深水层 · 一年沉积', depth: 'rgba(12,22,38,0.55)' },
];

/* ─── Date helpers ─── */

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** ISO week key (Monday-based) */
function getWeekKey(d: Date): string {
  const t = new Date(d);
  const day = t.getDay() || 7; // Mon=1..Sun=7
  t.setDate(t.getDate() - day + 1);
  const y = t.getFullYear();
  const m = t.getMonth() + 1;
  const d2 = t.getDate();
  return `${y}-W${pad2(Math.ceil(d2 / 7))}`;
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function getYearKey(d: Date): string {
  return `${d.getFullYear()}`;
}

/** Get default periodKey for a level */
function defaultPeriodKey(level: SummaryLevel, base?: Date): string {
  const d = base || new Date();
  switch (level) {
    case 'day': return getTodayStr();
    case 'week': return getWeekKey(d);
    case 'month': return getMonthKey(d);
    case 'year': return getYearKey(d);
  }
}

/** Human label for a periodKey */
function periodLabel(level: SummaryLevel, periodKey: string): string {
  switch (level) {
    case 'day': return periodKey;
    case 'week': return periodKey.replace('-W', ' 第') + ' 周';
    case 'month': return periodKey + ' 月';
    case 'year': return periodKey + ' 年';
  }
}

/** Nav label for date navigation */
function navLabel(level: SummaryLevel, periodKey: string): string {
  switch (level) {
    case 'day': return periodKey;
    case 'week': return periodKey.replace('-W', ' 第').replace(/-/g, '年') + '周';
    case 'month': return periodKey.replace('-', '年') + '月';
    case 'year': return periodKey + '年';
  }
}

/** Parse a date from a periodKey for navigation */
function periodKeyToDate(level: SummaryLevel, key: string): Date {
  switch (level) {
    case 'day': return new Date(key);
    case 'week': {
      const [y, w] = key.split('-W');
      return new Date(parseInt(y), 0, 1 + (parseInt(w) - 1) * 7);
    }
    case 'month': {
      const [y, m] = key.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    case 'year': return new Date(parseInt(key), 0, 1);
  }
}

/** Shift a periodKey by delta steps */
function shiftPeriodKey(level: SummaryLevel, periodKey: string, delta: number): string {
  const d = periodKeyToDate(level, periodKey);
  switch (level) {
    case 'day':
      d.setDate(d.getDate() + delta);
      return getTodayStr();
    case 'week':
      d.setDate(d.getDate() + delta * 7);
      return getWeekKey(d);
    case 'month':
      d.setMonth(d.getMonth() + delta);
      return getMonthKey(d);
    case 'year':
      d.setFullYear(d.getFullYear() + delta);
      return getYearKey(d);
  }
}

/* ─── Main Component ─── */

export default function AISummaryTab() {
  const [level, setLevel] = useState<SummaryLevel>('day');
  const [periodKey, setPeriodKey] = useState(() => defaultPeriodKey('day'));
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<SummaryData | null>(null);
  const [hasData, setHasData] = useState(false); // true if source diaries existed
  const [needData, setNeedData] = useState(false); // true if checked and no source
  const dataFetchedRef = useRef(false);

  /* ── Fetch saved summary ── */
  const fetchData = useCallback(async (lv: SummaryLevel, pk: string) => {
    setLoading(true);
    setError('');
    setData(null);
    setHasData(false);
    setNeedData(false);
    dataFetchedRef.current = false;
    try {
      const result = await api.summaryGet(lv, pk);
      if (result) {
        setData(result as unknown as SummaryData);
        setHasData(true);
      } else {
        // No saved summary — check whether there's any source data
        setData(null);
        setNeedData(true);
      }
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
      dataFetchedRef.current = true;
    }
  }, []);

  /* ── Generate summary ── */
  const generate = useCallback(async (feedback?: string) => {
    setGenerating(true);
    setError('');
    try {
      const result = await api.summaryGenerate({ type: level, date: periodKey, feedback });
      if (result.success) {
        // Re-fetch saved data
        await fetchData(level, periodKey);
      } else {
        setError(result.error || '生成失败');
      }
    } catch (e: any) {
      setError(e?.message || '请求失败');
    } finally {
      setGenerating(false);
    }
  }, [level, periodKey, fetchData]);

  /* ── Update summary (direct edit) ── */
  const handleUpdate = useCallback(async (input: { content?: string; analysis?: string; advice?: string; keywords?: string }) => {
    const result = await api.summaryUpdate({ type: level, periodKey, ...input });
    if (result.success) {
      await fetchData(level, periodKey);
    } else {
      setError(result.error || '保存失败');
    }
  }, [level, periodKey, fetchData]);

  /* ── Switch level ── */
  const switchLevel = useCallback((lv: SummaryLevel) => {
    setLevel(lv);
    const pk = defaultPeriodKey(lv);
    setPeriodKey(pk);
    fetchData(lv, pk);
  }, [fetchData]);

  /* ── Navigate time ── */
  const navigate = useCallback((delta: number) => {
    const pk = shiftPeriodKey(level, periodKey, delta);
    setPeriodKey(pk);
    fetchData(level, pk);
  }, [level, periodKey, fetchData]);

  /* ── Init ── */
  useEffect(() => {
    fetchData(level, periodKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const levelDef = LEVELS.find(l => l.key === level)!;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-12 py-6">
      {/* ═══ 水面分层 · 三层浮标（浅水面 → 中层水 → 深水层）═══ */}
      <div
        className="summary-buoys mb-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          position: 'relative',
        }}
      >
        {/* 背景水层渐变（横向从左浅到右深）*/}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
            background: 'linear-gradient(90deg, rgba(33,57,92,0.35) 0%, rgba(23,42,69,0.45) 45%, rgba(12,22,38,0.55) 100%)',
            border: '1px solid rgba(45,74,117,0.35)',
          }}
        />
        {LEVELS.map((l, idx) => {
          const isActive = l.key === level;
          return (
            <button
              key={l.key}
              onClick={() => switchLevel(l.key)}
              disabled={generating}
              className="summary-buoy relative"
              style={{
                padding: '12px 8px 10px',
                borderRadius: 14,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.55 : 1,
                background: isActive
                  ? 'radial-gradient(circle at 50% 30%, rgba(168,208,255,0.22) 0%, rgba(23,42,69,0.5) 70%)'
                  : 'rgba(23,42,69,0.35)',
                border: `1px solid ${isActive ? 'rgba(168,208,255,0.5)' : 'rgba(45,74,117,0.35)'}`,
                color: isActive ? '#e2ecfa' : '#8fa6c4',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                outline: 'none',
                fontFamily: 'inherit',
                position: 'relative',
                boxShadow: isActive
                  ? '0 0 20px rgba(111,180,255,0.18), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* 浮标体：三小层（浅-中-深）*/}
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 3, marginBottom: 6,
                }}
              >
                {[0, 1, 2].map((layerIdx) => (
                  <span
                    key={layerIdx}
                    style={{
                      width: 6 + (2 - layerIdx) * 2,
                      height: 6 + (2 - layerIdx) * 2,
                      borderRadius: '50%',
                      background: isActive ? l.depth : 'rgba(74,106,148,0.5)',
                      opacity: 0.5 + (layerIdx === 0 ? 0.35 : 0),
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: 1 }}>{l.label}</div>
              <div
                style={{
                  fontSize: 9, marginTop: 2, letterSpacing: 0.3,
                  color: isActive ? '#8fa6c4' : 'rgba(143,166,196,0.6)',
                }}
              >
                {l.sub}
              </div>
              {/* 当前层指示线 */}
              <span
                style={{
                  position: 'absolute', left: '50%', bottom: -1,
                  transform: 'translateX(-50%)',
                  width: isActive ? 22 : 0, height: 2,
                  borderRadius: 2,
                  background: '#ffd9a0',
                  boxShadow: '0 0 8px rgba(255,217,160,0.7)',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  opacity: isActive ? 1 : 0,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* ═══ 日期导航 + 生成（水面浮标条）═══ */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4"
        style={{
          background: 'linear-gradient(180deg, rgba(33,57,92,0.35) 0%, rgba(23,42,69,0.4) 100%)',
          border: '1px solid rgba(45,74,117,0.4)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all"
            style={{
              color: '#a8d0ff',
              background: 'rgba(23,42,69,0.6)',
              border: '1px solid rgba(111,180,255,0.25)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(111,180,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(23,42,69,0.6)'; }}
          >
            ◀
          </button>
          <span className="text-sm font-medium min-w-[7rem] text-center" style={{ color: '#e2ecfa' }}>
            {navLabel(level, periodKey)}
          </span>
          <button onClick={() => navigate(1)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all"
            style={{
              color: '#a8d0ff',
              background: 'rgba(23,42,69,0.6)',
              border: '1px solid rgba(111,180,255,0.25)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(111,180,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(23,42,69,0.6)'; }}
          >
            ▶
          </button>
        </div>

        <button
          onClick={() => generate()}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer"
          style={{
            background: generating
              ? 'rgba(23,42,69,0.6)'
              : 'linear-gradient(135deg, rgba(111,180,255,0.85), rgba(168,208,255,0.9))',
            color: generating ? '#8fa6c4' : '#0a1626',
            border: `1px solid ${generating ? 'rgba(45,74,117,0.5)' : 'rgba(168,208,255,0.6)'}`,
            opacity: generating ? 0.8 : 1,
            boxShadow: generating ? 'none' : '0 4px 18px rgba(111,180,255,0.28)',
            fontFamily: 'inherit',
          }}
        >
          {generating ? (
            <>
              {/* 水波进度条 */}
              <span className="wave-bar relative" style={{ width: 44, height: 10, overflow: 'hidden', borderRadius: 999, background: 'rgba(23,42,69,0.7)', display: 'inline-block' }}>
                <span
                  className="wave-fill"
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '45%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #6fb4ff, #a8d0ff)',
                    animation: 'wave-sweep 1.4s ease-in-out infinite',
                  }}
                />
              </span>
              水波升起中…
            </>
          ) : (
            <>
              <span className="relative inline-flex" style={{ width: 10, height: 10 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid currentColor', opacity: 0.5 }} />
                <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: 'currentColor' }} />
              </span>
              生成{levelDef.label}总结
            </>
          )}
        </button>
      </div>

      {/* ═══ Content ═══ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={level + '-' + periodKey + (loading ? '-loading' : '')}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex gap-1.5 mb-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#4a6a94',
                      animation: `pond-pulse 2s ease-in-out ${i * 0.3}s infinite`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>水面轻晃，回忆浮起…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-sm mb-3" style={{ color: 'var(--accent)' }}>{error}</p>
              <button onClick={() => fetchData(level, periodKey)}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                重试
              </button>
            </div>
          )}

          {/* No saved summary, needs generation */}
          {!loading && !error && data === null && needData && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(33,57,92,0.3) 0%, rgba(23,42,69,0.35) 100%)',
                border: '1px solid rgba(45,74,117,0.4)',
              }}
            >
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                {navLabel(level, periodKey)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                点击上方「生成{levelDef.label}总结」，让 AI 把这{levelDef.label === '日报' ? '一天的细波' : levelDef.label === '周报' ? '一周的回响' : levelDef.label === '月报' ? '一月的沉流' : '一年的沉积'}捞到水面
              </p>
            </div>
          )}

          {/* Summary card */}
          {!loading && !error && data && (
            <SummaryCard
              data={data}
              level={level}
              generating={generating}
              onRegenerate={(feedback) => generate(feedback)}
              onUpdate={handleUpdate}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── 知识图谱 · 沉底一层 ─── */}
      <div className="mt-8">
        <h2
          className="text-sm font-medium mb-3 flex items-center gap-2"
          style={{ color: '#8fa6c4' }}
        >
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#4a6a94', boxShadow: '0 0 6px rgba(74,106,148,0.8)' }} />
          知识图谱 · 沉底一层
        </h2>
        <KnowledgeGraph />
      </div>
    </div>
  );
}
