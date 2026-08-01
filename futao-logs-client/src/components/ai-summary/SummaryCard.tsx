'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';

/* ─── Types ─── */

export type SummaryLevel = 'day' | 'week' | 'month' | 'year';

export interface AnalysisData {
  body?: string;
  mind?: string;
  psychology?: string;
  growth?: string;
}

export interface SummaryData {
  id: number;
  type: string;
  periodKey: string;
  content: string;
  analysis: string; // JSON string
  advice: string;
  keywords: string;
  version: number;
  feedback: string;
  createdAt: string;
}

export interface SummaryGenerateResult {
  success: boolean;
  summary?: string;
  analysis?: AnalysisData;
  advice?: string;
  keywords?: string[];
  version?: number;
  periodKey?: string;
  error?: string;
}

/* ─── Props ─── */

interface SummaryCardProps {
  data: SummaryData;
  level: SummaryLevel;
  generating?: boolean;
  onRegenerate: (feedback?: string) => void;
  onUpdate: (input: { content?: string; analysis?: string; advice?: string; keywords?: string }) => void;
}

/* ─── Helper: parse JSON safely ─── */

function parseJsonSafe(str: string, fallback: any) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/* ─── Analysis dimensions ─── */

const ANALYSIS_DIMS: { key: keyof AnalysisData; label: string; icon: string }[] = [
  { key: 'body', label: '身体状态', icon: '💪' },
  { key: 'mind', label: '精神状态', icon: '🧠' },
  { key: 'psychology', label: '心理状态', icon: '❤️' },
  { key: 'growth', label: '成长收获', icon: '🌱' },
];

/* ─── Main Component ─── */

export default function SummaryCard({ data, level, generating, onRegenerate, onUpdate }: SummaryCardProps) {
  const [editing, setEditing] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');

  // Edit state
  const [editContent, setEditContent] = useState(data.content || '');
  const [editAdvice, setEditAdvice] = useState(data.advice || '');
  const [editAnalysis, setEditAnalysis] = useState('');
  const [editKeywords, setEditKeywords] = useState('');

  const analysis = parseJsonSafe(data.analysis, {}) as AnalysisData;
  const keywords = parseJsonSafe(data.keywords, []) as string[];
  const levelLabel = { day: '日', week: '周', month: '月', year: '年' }[level];
  const periodLabel = data.periodKey;

  /* ── Enter edit mode ── */
  const enterEdit = useCallback(() => {
    setEditContent(data.content || '');
    setEditAdvice(data.advice || '');
    setEditAnalysis(JSON.stringify(parseJsonSafe(data.analysis, {}), null, 2));
    setEditKeywords((parseJsonSafe(data.keywords, []) as string[]).join(', '));
    setEditing(true);
    setShowRefine(false);
  }, [data]);

  /* ── Save edit ── */
  const saveEdit = useCallback(async () => {
    // Try parse analysis JSON
    let parsedAnalysis: Record<string, string> = {};
    try {
      parsedAnalysis = JSON.parse(editAnalysis);
    } catch {
      // keep as-is
    }
    const kwArray = editKeywords.split(',').map(k => k.trim()).filter(Boolean);
    onUpdate({
      content: editContent,
      advice: editAdvice,
      analysis: JSON.stringify(parsedAnalysis),
      keywords: JSON.stringify(kwArray),
    });
    setEditing(false);
  }, [editContent, editAdvice, editAnalysis, editKeywords, onUpdate]);

  /* ── Cancel edit ── */
  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  /* ── Submit refine ── */
  const submitRefine = useCallback(() => {
    onRegenerate(refineFeedback || undefined);
    setShowRefine(false);
    setRefineFeedback('');
  }, [refineFeedback, onRegenerate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
    >
      {/* ── Card header ── */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            📊 {levelLabel}总结
          </span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {periodLabel} · v{data.version}
          </span>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="px-4 py-3">
        {editing ? (
          /* ═══ Edit mode ═══ */
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>总结内容</label>
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                className="w-full rounded-lg text-sm p-2 resize-none outline-none"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>四维分析 (JSON)</label>
              <textarea value={editAnalysis} onChange={e => setEditAnalysis(e.target.value)} rows={5}
                className="w-full rounded-lg text-sm p-2 resize-none outline-none font-mono"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>建议</label>
              <textarea value={editAdvice} onChange={e => setEditAdvice(e.target.value)} rows={2}
                className="w-full rounded-lg text-sm p-2 resize-none outline-none"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>关键词 (逗号分隔)</label>
              <input value={editKeywords} onChange={e => setEditKeywords(e.target.value)}
                className="w-full rounded-lg text-sm p-2 outline-none"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ color: 'var(--text-tertiary)' }}>取消</button>
              <button onClick={saveEdit}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>保存修改</button>
            </div>
          </div>
        ) : (
          /* ═══ Display mode ═══ */
          <div>
            {/* Summary text */}
            {data.content && (
              <p className="text-sm whitespace-pre-wrap mb-4" style={{ color: 'var(--text-primary)', lineHeight: 1.75 }}>
                {data.content}
              </p>
            )}

            {/* Health analysis */}
            <div className="space-y-2 mb-4">
              {ANALYSIS_DIMS.map(dim => {
                const content = analysis[dim.key];
                if (!content) return null;
                return (
                  <div key={dim.key} className="rounded-lg p-3" style={{ background: 'var(--bg-primary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {dim.icon} {dim.label}
                    </span>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {content}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Advice */}
            {data.advice && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>💡 建议</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.advice}</p>
              </div>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {keywords.map(kw => (
                  <span key={kw} className="inline-block px-2.5 py-0.5 rounded-full text-xs"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Card footer actions ── */}
      {!editing && (
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button onClick={enterEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            ✏️ 编辑
          </button>
          <button onClick={() => setShowRefine(!showRefine)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            🔄 重新生成
          </button>
          {generating && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span className="w-2 h-2 rounded-full animate-spin" style={{ border: '1.5px solid var(--accent)', borderTopColor: 'transparent' }} />
              生成中…
            </span>
          )}
        </div>
      )}

      {/* ── Refine dialog ── */}
      <AnimatePresence>
        {showRefine && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--border-default)' }}>
              <textarea
                value={refineFeedback}
                onChange={e => setRefineFeedback(e.target.value)}
                placeholder="告诉 AI 哪里需要修改…（选填）"
                rows={2}
                className="w-full rounded-lg text-sm p-2 resize-none outline-none mt-3"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => { setShowRefine(false); setRefineFeedback(''); }}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ color: 'var(--text-tertiary)' }}>取消</button>
                <button onClick={submitRefine} disabled={generating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: generating ? 'var(--bg-tertiary)' : 'var(--accent)',
                    color: 'var(--accent-text)',
                    opacity: generating ? 0.6 : 1,
                  }}>
                  {generating ? '生成中…' : '✅ 重新生成'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
