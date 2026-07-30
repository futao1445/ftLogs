'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';

/* ─── Types ─── */

type SummaryLevel = 'day' | 'week' | 'month' | 'year';

interface AnalysisData {
  body?: string;
  mind?: string;
  psychology?: string;
  growth?: string;
}

interface SummaryData {
  summary: string;
  analysis: AnalysisData;
  advice: string;
  keywords: string[];
  version: number;
  periodKey: string;
}

/* ─── Level definitions ─── */

const LEVELS: { key: SummaryLevel; label: string; icon: string }[] = [
  { key: 'day', label: '每日', icon: '📅' },
  { key: 'week', label: '每周', icon: '📆' },
  { key: 'month', label: '每月', icon: '📊' },
  { key: 'year', label: '每年', icon: '📈' },
];

const ANALYSIS_DIMS: { key: keyof AnalysisData; label: string; icon: string }[] = [
  { key: 'body', label: '身体', icon: '💪' },
  { key: 'mind', label: '精神', icon: '🧠' },
  { key: 'psychology', label: '心理', icon: '❤️' },
  { key: 'growth', label: '成长', icon: '🌱' },
];

/* ─── Main component ─── */

export default function AISummaryCard() {
  const [activeLevel, setActiveLevel] = useState<SummaryLevel>('day');
  const [dataMap, setDataMap] = useState<Record<string, SummaryData | null>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [feedbackInput, setFeedbackInput] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  const [refining, setRefining] = useState(false);
  const [generatedLevels, setGeneratedLevels] = useState<Record<string, boolean>>({});

  const isLoading = loadingMap[activeLevel] || false;
  const hasGenerated = !!generatedLevels[activeLevel];
  const data = dataMap[activeLevel] || null;
  const error = errorMap[activeLevel] || '';
  const levelDef = LEVELS.find(l => l.key === activeLevel)!;

  /* ── Generate summary for current level ── */

  const generate = useCallback(async (feedback?: string) => {
    const level = activeLevel;
    setLoadingMap(prev => ({ ...prev, [level]: true }));
    setErrorMap(prev => ({ ...prev, [level]: '' }));
    try {
      const result = await api.summaryGenerate({
        type: level,
        feedback: feedback || undefined,
      });
      if (result.success && result.summary) {
        setDataMap(prev => ({
          ...prev,
          [level]: {
            summary: result.summary!,
            analysis: (result.analysis || {}) as AnalysisData,
            advice: result.advice || '',
            keywords: result.keywords || [],
            version: result.version || 1,
            periodKey: result.periodKey || '',
          },
        }));
        setGeneratedLevels(prev => ({ ...prev, [level]: true }));
        setShowRefine(false);
        setFeedbackInput('');
      } else {
        setErrorMap(prev => ({ ...prev, [level]: result.error || '生成失败' }));
      }
    } catch (e: any) {
      setErrorMap(prev => ({ ...prev, [level]: e?.message || '请求失败' }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [level]: false }));
      setRefining(false);
    }
  }, [activeLevel]);

  /* ── Switch level tab ── */

  const switchLevel = useCallback((level: SummaryLevel) => {
    if (isLoading) return;
    setActiveLevel(level);
    setShowRefine(false);
    setFeedbackInput('');
  }, [isLoading]);

  /* ── Submit refine feedback ── */

  const handleRefine = useCallback(async () => {
    if (!feedbackInput.trim() || refining) return;
    setRefining(true);
    await generate(feedbackInput.trim());
  }, [feedbackInput, refining, generate]);

  /* ─── Render ─── */

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
    >
      {/* ═══ Level tabs ═══ */}
      <div className="flex gap-1.5 mb-4">
        {LEVELS.map(l => {
          const isActive = l.key === activeLevel;
          const completed = !!generatedLevels[l.key];
          return (
            <button
              key={l.key}
              onClick={() => switchLevel(l.key)}
              disabled={isLoading}
              className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1"
              style={{
                background: isActive ? 'var(--bg-secondary)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
                opacity: isLoading && !isActive ? 0.5 : 1,
                cursor: isLoading && !isActive ? 'not-allowed' : 'pointer',
              }}
            >
              <span>{l.icon}</span>
              <span className="hidden sm:inline">{l.label}</span>
              {completed && (
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ Content area ═══ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={
            activeLevel +
            (isLoading ? '-loading' : '')
          }
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── Loading spinner ── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-3"
                style={{
                  borderColor: 'var(--accent)',
                  borderTopColor: 'transparent',
                }}
              />
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                AI 正在分析{levelDef.label}数据…
              </p>
            </div>
          )}

          {/* ── Not generated yet → trigger button ── */}
          {!isLoading && !hasGenerated && !error && (
            <div className="text-center py-6">
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                {levelDef.icon} {levelDef.label}总结
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
                点击下方按钮由 AI 自动生成
              </p>
              <button
                onClick={() => generate()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                ✨ 生成{levelDef.label}总结
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {!isLoading && error && (
            <div className="text-center py-4">
              <p className="text-xs mb-3" style={{ color: 'var(--accent)' }}>{error}</p>
              <button
                onClick={() => generate()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                重试
              </button>
            </div>
          )}

          {/* ── Summary content ── */}
          {!isLoading && hasGenerated && data && (
            <div>
              {/* Summary text */}
              <p
                className="text-sm whitespace-pre-wrap mb-4"
                style={{ color: 'var(--text-primary)', lineHeight: 1.75 }}
              >
                {data.summary}
              </p>

              {/* Health analysis dimensions */}
              {data.analysis && (
                <div className="space-y-2 mb-4">
                  {ANALYSIS_DIMS.map(dim => {
                    const content = data.analysis![dim.key];
                    if (!content) return null;
                    return (
                      <div
                        key={dim.key}
                        className="text-sm rounded-lg p-3"
                        style={{ background: 'var(--bg-secondary)' }}
                      >
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {dim.icon} {dim.label}
                        </span>
                        <p
                          className="mt-1"
                          style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
                        >
                          {content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Advice */}
              {data.advice && (
                <div className="mb-4">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>
                    💡 建议
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
                  >
                    {data.advice}
                  </p>
                </div>
              )}

              {/* Keywords */}
              {data.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {data.keywords.map(kw => (
                    <span
                      key={kw}
                      className="inline-block px-2.5 py-0.5 rounded-full text-xs"
                      style={{
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer: refine button + version */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRefine(!showRefine)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  ✏️ 修改总结
                </button>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  v{data.version} · {data.periodKey}
                </span>
              </div>

              {/* Refine feedback input */}
              {showRefine && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 overflow-hidden"
                >
                  <textarea
                    value={feedbackInput}
                    onChange={e => setFeedbackInput(e.target.value)}
                    placeholder="告诉 AI 哪里需要修改…"
                    className="w-full rounded-lg text-sm p-2 resize-none outline-none"
                    rows={3}
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => { setShowRefine(false); setFeedbackInput(''); }}
                      className="px-3 py-1.5 rounded-lg text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleRefine}
                      disabled={refining || !feedbackInput.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                      style={{
                        background:
                          refining || !feedbackInput.trim()
                            ? 'var(--bg-tertiary)'
                            : 'var(--accent)',
                        color: 'var(--accent-text)',
                        opacity: refining || !feedbackInput.trim() ? 0.6 : 1,
                      }}
                    >
                      {refining ? '修改中…' : '确认修改'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
