'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import type { Diary, SemanticSearchResult } from '../../lib/types';
import DiaryCard from '../diary/DiaryCard';

type SearchMode = 'keyword' | 'semantic';

/* ─── Mode Toggle ─── */

function ModeToggle({ mode, onChange }: { mode: SearchMode; onChange: (m: SearchMode) => void }) {
  return (
    <div className="flex gap-1 mb-3">
      {([
        { key: 'keyword' as const, label: '关键词搜索', icon: '🔍' },
        { key: 'semantic' as const, label: '语义搜索', icon: '🧠' },
      ]).map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200"
          style={{
            background: mode === m.key ? 'var(--accent)' : 'var(--bg-secondary)',
            color: mode === m.key ? 'var(--accent-text)' : 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── Semantic Hint ─── */

function SemanticHint({ onFill }: { onFill: (q: string) => void }) {
  const hints = ['上周开心的事', '记录了我生病的日记', '关于工作的内容', '心情不好的时候'];
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {hints.map((h) => (
        <button
          key={h}
          onClick={() => onFill(h)}
          className="text-[11px] px-2 py-0.5 rounded-full transition-colors"
          style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-default)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        >
          {h}
        </button>
      ))}
    </div>
  );
}

/* ─── Score Badge ─── */

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#eab308' : '#ef4444';
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
      style={{ background: color + '20', color }}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {pct}%
    </span>
  );
}

/* ─── Main SearchView ─── */

interface SearchViewProps {
  onEditDiary?: (diary: Diary) => void;
  onDeleteDiary?: (id: number) => void;
}

export default function SearchView({ onEditDiary, onDeleteDiary }: SearchViewProps) {
  const [mode, setMode] = useState<SearchMode>('keyword');
  const [query, setQuery] = useState('');
  const [keywordResults, setKeywordResults] = useState<Diary[]>([]);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataFetched, setDataFetched] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Semantic search ── */
  const doSemanticSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSemanticResults([]); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.ragSearch(q, 20, 0.5);
      const items = (result.items || []).map((item: any) => ({
        diary: item.diary as Diary,
        score: item.score,
      }));
      setSemanticResults(items);
      if (!items.length) setError('没有找到语义匹配的日记，换个说法试试');
    } catch {
      setError('语义搜索暂时不可用（后端 RAG 引擎可能尚未就绪）');
      setSemanticResults([]);
    } finally {
      setLoading(false);
      setDataFetched(true);
    }
  }, []);

  /* ── Keyword search (debounced) ── */
  useEffect(() => {
    if (mode !== 'keyword') return;
    clearTimeout(searchTimerRef.current);
    if (!query.trim()) {
      setKeywordResults([]);
      setError('');
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await api.diaryList({ searchText: query, page: 1, size: 50 });
        setKeywordResults(result.items);
        if (!result.items.length) setError('没找到匹配的日记');
      } catch {
        setKeywordResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [query, mode]);

  /* ── Shared input ── */
  const handleSearch = useCallback(() => {
    if (mode === 'semantic') doSemanticSearch(query);
    // keyword is already debounced via useEffect
  }, [mode, query, doSemanticSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleHintClick = useCallback((hint: string) => {
    setQuery(hint);
    if (mode === 'semantic') doSemanticSearch(hint);
    else {
      // keyword: debounce will pick it up
    }
  }, [mode, doSemanticSearch]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Mode toggle */}
      <ModeToggle mode={mode} onChange={setMode} />

      {/* Search input area */}
      <div
        className="flex items-center gap-2 px-4 h-10 rounded-xl transition-colors duration-150 mb-3"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'keyword' ? '搜索日记内容...' : '用自然语言搜索，如「上周开心的事」'}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {mode === 'semantic' && (
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              opacity: loading || !query.trim() ? 0.5 : 1,
            }}
          >
            {loading ? '搜索中...' : '搜索'}
          </button>
        )}
        {query && (
          <button
            onClick={() => { setQuery(''); setError(''); setKeywordResults([]); setSemanticResults([]); }}
            className="p-0.5 rounded-full transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Semantic search hint chips */}
      {mode === 'semantic' && !query && <SemanticHint onFill={handleHintClick} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {/* Error / empty state — keyword */}
      {!loading && error && mode === 'keyword' && (
        <div className="py-8 text-center">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
        </div>
      )}

      {/* Semantic search: empty state with guidance */}
      {!loading && !query.trim() && dataFetched && mode === 'semantic' && semanticResults.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-4xl mb-4">🧠</div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>试试换个说法：</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['这周有什么收获', '记录过关于旅行的内容', '心情不好的时候写了什么'].map((h) => (
              <button
                key={h}
                onClick={() => handleHintClick(h)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                style={{ color: 'var(--accent)', border: '1px solid var(--accent-soft)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                「{h}」
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Idle state */}
      {!loading && !error && query && mode === 'keyword' && keywordResults.length === 0 && (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>输入关键词搜索日记内容</p>
      )}

      {/* Keyword results */}
      {!loading && mode === 'keyword' && keywordResults.map((d) => (
        <div key={d.id} className="mb-3">
          <DiaryCard diary={d} onEdit={onEditDiary ? () => onEditDiary(d) : undefined} onDelete={onDeleteDiary} />
        </div>
      ))}

      {/* Semantic results */}
      {!loading && mode === 'semantic' && semanticResults.map((r) => (
        <SemanticHitCard key={r.diary.id} hit={r} onEdit={onEditDiary} onDelete={onDeleteDiary} />
      ))}
    </div>
  );
}

/* ─── Semantic Hit Card ─── */

function SemanticHitCard({
  hit,
  onEdit,
  onDelete,
}: {
  hit: SemanticSearchResult;
  onEdit?: (d: Diary) => void;
  onDelete?: (id: number) => void;
}) {
  return (
    <div className="relative mb-3">
      {/* Score badge */}
      <div className="absolute top-2 right-2 z-10">
        <ScoreBadge score={hit.score} />
      </div>
      <DiaryCard diary={hit.diary} onEdit={onEdit ? () => onEdit(hit.diary) : undefined} onDelete={onDelete} />
      {hit.matchedContent && (
        <div
          className="mx-3 mb-3 px-3 py-2 rounded-lg text-xs leading-relaxed"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
        >
          <span className="font-medium" style={{ color: 'var(--text-tertiary)' }}>匹配段落：</span>
          <HighlightText text={hit.matchedContent} />
        </div>
      )}
    </div>
  );
}

/* ─── Text Highlighter ─── */

function HighlightText({ text }: { text: string }) {
  // Simple heuristic: accent-color the first clause or key terms
  // Actual backend will provide the highlighted context
  return <span style={{ color: 'var(--text-secondary)' }}>{text}</span>;
}
