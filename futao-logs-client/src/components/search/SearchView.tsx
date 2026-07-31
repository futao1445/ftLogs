'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import type { Diary, SemanticSearchResult } from '../../lib/types';
import DiaryCard from '../diary/DiaryCard';

type SearchMode = 'keyword' | 'semantic';

/* ─── 水面浮标 tab 切换（弃用压缩小气泡 · futao 修改③）─── */

function ModeToggle({ mode, onChange }: { mode: SearchMode; onChange: (m: SearchMode) => void }) {
  return (
    <div
      className="flex gap-1.5 mb-4 p-1.5 w-max rounded-2xl"
      style={{
        background: 'rgba(12,22,38,0.45)',
        border: '1px solid rgba(45,74,117,0.5)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {([
        { key: 'keyword' as const, label: '关键词搜索' },
        { key: 'semantic' as const, label: '语义搜索' },
      ]).map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className="relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-normal tracking-wide transition-all duration-300 cursor-pointer"
          style={{
            color: mode === m.key ? '#e2ecfa' : '#8fa6c4',
            fontFamily: 'inherit',
          }}
        >
          {/* 激活水面（大号水面片泛波光） */}
          {mode === m.key && (
            <span
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'linear-gradient(180deg, rgba(111,180,255,0.20) 0%, rgba(23,42,69,0.25) 100%)',
                border: '1px solid rgba(111,180,255,0.3)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px rgba(111,180,255,0.10)',
              }}
            />
          )}
          <span
            className="relative inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border transition-all duration-300"
            style={{
              borderColor: mode === m.key ? '#a8d0ff' : 'rgba(143,166,196,0.5)',
              color: mode === m.key ? '#a8d0ff' : '#8fa6c4',
              boxShadow: mode === m.key ? '0 0 10px rgba(168,208,255,0.3)' : 'none',
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {m.key === 'keyword' ? (
                <>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </>
              ) : (
                <>
                  <path d="M3 12h4l2-6 4 12 2-6h6" />
                </>
              )}
            </svg>
          </span>
          <span className="relative z-10">{m.label}</span>
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

/* ─── Score Badge — 涟漪分数圈（倒映水镜：关联度 = 涟漪）─── */

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  // 相关性色阶 → 池塘纵深：高相关波光亮、中相关晨雾、低相关弱化
  const color = pct >= 85 ? '#a8d0ff' : pct >= 70 ? '#6fb4ff' : '#8fa6c4';
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

/* 命中词高亮（倒映水镜：命中词泛波光）*/
function HighlightHit({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span style={{ color: 'var(--text-secondary)' }}>{text}</span>;
  try {
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span style={{ color: 'var(--text-secondary)' }}>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              style={{
                background: 'rgba(111,180,255,0.14)',
                color: '#a8d0ff',
                padding: '0 3px',
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  } catch {
    return <span style={{ color: 'var(--text-secondary)' }}>{text}</span>;
  }
}

/* ─── Main SearchView ─── */

interface SearchViewProps {
  onEditDiary?: (diary: Diary) => void;
  onDeleteDiary?: (id: number) => void;
  onOpenSettings?: () => void;
}

export default function SearchView({ onEditDiary, onDeleteDiary, onOpenSettings }: SearchViewProps) {
  const [mode, setMode] = useState<SearchMode>('keyword');
  const [query, setQuery] = useState('');
  const [keywordResults, setKeywordResults] = useState<Diary[]>([]);
  const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataFetched, setDataFetched] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Semantic search ── */
  const doSemanticSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSemanticResults([]); return; }
    setLoading(true);
    setError('');
    try {
      const result: any = await api.ragSearch(q, 20, 0.5);
      const items = (result.items || []).map((item: any) => ({
        diary: item.diary as Diary,
        score: item.score,
      }));
      setSemanticResults(items);
      if (result.error) {
        setError('💡 ' + result.error);
      } else if (!items.length) {
        setError('没有找到语义匹配的日记，换个说法试试');
      }
    } catch {
      setError('语义搜索暂时不可用（后端 RAG 引擎可能尚未就绪）');
      setSemanticResults([]);
    } finally {
      setLoading(false);
      setDataFetched(true);
    }
  }, []);

  /* ── Keyword tab：默认全量日志浏览；输入关键词 → 真实筛选（futao 修改⑤）── */
  const loadAllLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.diaryList({ page: 1, size: 50 });
      setKeywordResults(result.items);
    } catch {
      setKeywordResults([]);
      setError('加载日记失败，请检查网络');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'keyword') return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setError('');
    if (!query.trim()) {
      // 默认态 = 全量日志（完整浏览），不做关键词筛选
      loadAllLogs();
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await api.diaryList({ searchText: query, page: 1, size: 50 });
        setKeywordResults(result.items);
        setError(result.items.length ? '' : '没有找到匹配的回忆');
      } catch {
        setKeywordResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query, mode, loadAllLogs]);

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
  }, [mode, doSemanticSearch]);

  const hasResults = (mode === 'keyword' ? keywordResults.length : semanticResults.length) > 0;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-12 py-4">
      {/* ═══ 页头大标题（futao 修改③：搜索要加大标题）═══ */}
      <div className="flex items-end justify-between mb-4" style={{ paddingTop: 12 }}>
        <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: 3, color: '#e2ecfa' }}>
          寻找<span style={{ color: '#a8d0ff' }}>·</span><span style={{ color: '#a8d0ff', fontWeight: 400 }}>水面之下</span>
        </div>
        <div style={{ fontSize: 11, letterSpacing: 4, color: '#8fa6c4', textTransform: 'uppercase' }}>
          Night Pond Search
        </div>
      </div>

      {/* Mode toggle */}
      <ModeToggle mode={mode} onChange={setMode} />

      {/* ═══ 倒映水镜 · 搜索框 ═══ */}
      <div
        className="flex items-center gap-2 px-4 h-11 rounded-2xl transition-all duration-200 mb-3 search-mirror"
        style={{
          background: 'rgba(23,42,69,0.55)',
          border: '1px solid rgba(111,180,255,0.25)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 30px rgba(111,180,255,0.06)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* 镜面放大镜 */}
        <span
          className="w-3.5 h-3.5 rounded-full flex-shrink-0 relative"
          style={{ border: '2px solid #a8d0ff' }}
        >
          <span
            className="absolute"
            style={{
              width: 7, height: 2, background: '#a8d0ff',
              transform: 'rotate(45deg)', right: -5, bottom: -3, borderRadius: 2,
            }}
          />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'keyword' ? '向水面投一颗石子… 如「同事」' : '用自然语言搜索，如「上周开心的事」'}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {mode === 'semantic' && (
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #6fb4ff, #a8d0ff)',
              color: '#0a1626',
              boxShadow: '0 4px 16px rgba(111,180,255,0.25)',
              opacity: loading || !query.trim() ? 0.5 : 1,
            }}
          >
            {loading ? '泛起微波…' : '投入水中'}
          </button>
        )}
        {query && (
          <button
            onClick={() => { setQuery(''); setError(''); setSemanticResults([]); }}
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
          {/* 水面呼吸点 */}
          <div className="flex gap-1.5">
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
        </div>
      )}

      {/* Error / empty state — keyword */}
      {!loading && error && mode === 'keyword' && (
        <div className="py-8 text-center">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      )}

      {/* Error / empty state — semantic with embedding config button */}
      {!loading && error && mode === 'semantic' && (
        <div className="py-8 text-center">
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          {(error.toLowerCase().includes('embedding') || error.toLowerCase().includes('llm')) && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              ⚙️ 去配置 Embedding
            </button>
          )}
        </div>
      )}

      {/* Semantic search: empty state with guidance */}
      {!loading && !error && !query.trim() && dataFetched && mode === 'semantic' && semanticResults.length === 0 && (
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
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          {query.trim() ? '没有找到匹配的回忆' : '输入关键词，回忆会从水底浮起'}
        </p>
      )}

      {/* ═══ 关键词结果 ═══
          futao 修改⑤-4：默认态与命中态统一用设计稿浮起卡（金色日期标签+水纹+底部水雾），不再用普通日记卡 */}
      {!loading && mode === 'keyword' && keywordResults.map((d) => (
        <SearchHitCard key={d.id} diary={d} query={query} onEdit={onEditDiary} onDelete={onDeleteDiary} />
      ))}

      {/* ═══ 语义结果 — 水底浮起的回忆 ═══ */}
      {!loading && mode === 'semantic' && semanticResults.map((r) => (
        <SemanticHitCard key={r.diary.id} hit={r} onEdit={onEditDiary} onDelete={onDeleteDiary} query={query} />
      ))}

      {/* 结果计数 */}
      {!loading && query.trim() && hasResults && (
        <p className="text-[11px] text-center mt-4 mb-2" style={{ color: 'var(--text-tertiary)' }}>
          {mode === 'keyword' ? `找到 ${keywordResults.length} 段回忆` : `浮起 ${semanticResults.length} 段回忆`}
        </p>
      )}
    </div>
  );
}

/* ─── 金色日期标签（futao 修改③：搜索页所有内容标签统一设计稿样式）─── */

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** date 可能是 "YYYY-MM-DD" 或 ISO 时间戳 → 统一取前 10 位解析成 "JUL 06" */
function goldDateLabel(dateStr: string): string {
  const ymd = (dateStr || '').slice(0, 10).split('-').map(Number);
  if (ymd.length === 3 && ymd[0] && ymd[1] && ymd[2]) {
    const [, mm, dd] = ymd;
    if (mm >= 1 && mm <= 12) return `${MONTHS_EN[mm - 1]} ${String(dd).padStart(2, '0')}`;
  }
  return '';
}

/* ─── Semantic Hit Card ─── */

function SemanticHitCard({
  hit,
  onEdit,
  onDelete,
  query,
}: {
  hit: SemanticSearchResult;
  onEdit?: (d: Diary) => void;
  onDelete?: (id: number) => void;
  query: string;
}) {
  const dateLabel = goldDateLabel(hit.diary.date);
  return (
    <div className="relative mb-3">
      {/* Score badge */}
      <div className="absolute top-2 right-2 z-10">
        <ScoreBadge score={hit.score} />
      </div>
      {/* 统一金色日期标签（设计稿样式） */}
      {dateLabel && (
        <div
          className="mb-1.5"
          style={{ fontSize: 10, color: '#ffd9a0', letterSpacing: 1, fontWeight: 400 }}
        >
          {dateLabel}
        </div>
      )}
      <DiaryCard diary={hit.diary} onEdit={onEdit ? () => onEdit(hit.diary) : undefined} onDelete={onDelete} />
      {hit.matchedContent && (
        <div
          className="mx-3 mb-3 px-3 py-2 rounded-lg text-xs leading-relaxed"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
        >
          <span className="font-medium" style={{ color: 'var(--text-tertiary)' }}>匹配段落：</span>
          <HighlightHit text={hit.matchedContent} query={query} />
        </div>
      )}
    </div>
  );
}

/* ─── 关键词命中浮起卡（futao 修改⑤：按设计稿标签重做）───
   复刻方向稿 pond-pages-direction.html 的 .search-hit：
   金色日期标签 + 命中词波光高亮 + swirl 水纹 + 底部水雾渐变 */

function SearchHitCard({
  diary,
  query,
  onEdit,
  onDelete,
}: {
  diary: Diary;
  query: string;
  onEdit?: (d: Diary) => void;
  onDelete?: (id: number) => void;
}) {
  const dateLabel = goldDateLabel(diary.date);
  const content = diary.content || '';
  const plain = content.replace(/[#*`\[\]>|~]/g, '');

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(diary.id);
  };

  return (
    <div
      className="search-hit-card group relative mb-3 cursor-pointer rounded-2xl overflow-hidden"
      onClick={() => onEdit?.(diary)}
      style={{
        background: 'rgba(23,42,69,0.5)',
        border: '1px solid rgba(45,74,117,0.5)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(111,180,255,0.4)';
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(2,8,20,0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(45,74,117,0.5)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* swirl 涟漪装饰（方向稿 .search-hit .swirl） */}
      <span
        className="absolute rounded-full pointer-events-none"
        style={{ right: -14, top: -14, width: 60, height: 60, border: '1.5px solid rgba(168,208,255,0.25)' }}
      />
      <span
        className="absolute rounded-full pointer-events-none"
        style={{ right: 6, top: 4, width: 40, height: 40, opacity: 0.7, border: '1.5px solid rgba(168,208,255,0.25)' }}
      />
      <div className="relative px-4 py-3">
        {/* 金色日期标签（方向稿 .search-hit .date：10px gold 字距 1px） */}
        {dateLabel && (
          <div
            className="mb-1.5"
            style={{ fontSize: 10, color: '#ffd9a0', letterSpacing: 1, fontWeight: 400 }}
          >
            {dateLabel}
          </div>
        )}
        {/* 命中正文 · 波光高亮（方向稿 .search-hit .txt em） */}
        <div
          className="text-xs leading-relaxed"
          style={{ color: '#e2ecfa', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          <HighlightHit text={plain.slice(0, 140)} query={query} />
        </div>
      </div>
      {/* 底部水雾渐变（方向稿 .search-hit::after） */}
      <span
        className="absolute pointer-events-none"
        style={{
          left: 0, right: 0, bottom: 0, height: '40%',
          background: 'linear-gradient(180deg, transparent, rgba(12,22,38,0.5))',
        }}
      />
      {/* 编辑入口 hover 浮现 */}
      <span
        className="absolute right-3 bottom-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: '#8fa6c4' }}
      >
        打开 ↦
      </span>
      {onDelete && (
        <span
          onClick={handleDelete}
          className="absolute right-3 top-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          style={{ color: '#8fa6c4' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffd9a0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#8fa6c4'; }}
        >
          删除
        </span>
      )}
    </div>
  );
}
