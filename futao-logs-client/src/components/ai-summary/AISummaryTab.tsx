'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import SummaryCard from './SummaryCard';
import KnowledgeGraph from '../knowledge-graph/KnowledgeGraph';
import type { SummaryLevel, SummaryData } from './SummaryCard';

/* ─── Level config ─── */

const LEVELS: { key: SummaryLevel; label: string; icon: string }[] = [
  { key: 'day', label: '日报', icon: '📅' },
  { key: 'week', label: '周报', icon: '📆' },
  { key: 'month', label: '月报', icon: '📊' },
  { key: 'year', label: '年报', icon: '📈' },
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ═══ Level tabs ═══ */}
      <div className="flex gap-1.5 mb-4">
        {LEVELS.map(l => {
          const isActive = l.key === level;
          return (
            <button
              key={l.key}
              onClick={() => switchLevel(l.key)}
              disabled={generating}
              className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
                opacity: generating ? 0.5 : 1,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ Date navigation + Generate button ═══ */}
      <div
        className="flex items-center justify-between rounded-xl p-3 mb-4"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}
          >
            ◀
          </button>
          <span className="text-sm font-medium min-w-[7rem] text-center" style={{ color: 'var(--text-primary)' }}>
            {navLabel(level, periodKey)}
          </span>
          <button onClick={() => navigate(1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}
          >
            ▶
          </button>
        </div>

        <button
          onClick={() => generate()}
          disabled={generating}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            background: generating ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: 'var(--accent-text)',
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin inline-block"
                style={{ borderColor: 'var(--accent-text)', borderTopColor: 'transparent' }} />
              生成中…
            </>
          ) : (
            `✨ 生成${levelDef.label}总结`
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
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-3"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>加载中…</p>
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
              className="rounded-xl p-6 text-center"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                {levelDef.icon} {navLabel(level, periodKey)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                点击上方「✨ 生成{levelDef.label}总结」由 AI 自动生成
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

      {/* ─── Knowledge Graph ─── */}
      <div className="mt-8">
        <h2
          className="text-sm font-medium mb-3 flex items-center gap-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          🗺 知识图谱
        </h2>
        <KnowledgeGraph />
      </div>
    </div>
  );
}
