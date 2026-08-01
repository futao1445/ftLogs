'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../lib/api';
import type { Diary, TimelineGroup, Tag, CalendarDay } from '../../lib/types';
import PageShell from '../common/PageShell';
import DiaryTimeline from '../diary/DiaryTimeline';
import DiaryEditor from '../diary/DiaryEditor';
import CalendarView from '../calendar/CalendarView';
import MoodChart from '../common/MoodChart';
import AISummaryTab from '../ai-summary/AISummaryTab';
import SearchView from '../search/SearchView';
import TreeholePage from '../treehole/TreeholePage';
import PondHero from '../common/PondHero';
import PondConfirmModal from '../common/PondConfirmModal';

export default function HomePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'diary' | 'calendar' | 'search' | 'summary' | 'treehole'>('diary');

  // Data
  const [groups, setGroups] = useState<TimelineGroup[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Calendar
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calDays, setCalDays] = useState<CalendarDay[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Diary[]>([]);
  const [searching, setSearching] = useState(false);

  // Editor
  const [editingDiary, setEditingDiary] = useState<Diary | null | 'new'>(null);
  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Settings external trigger (from SearchView)
  const [triggerSettings, setTriggerSettings] = useState(0);
  const openSettings = triggerSettings > 0;

  // Cross-tab navigation (graph <-> knowledge base)
  const [autoOpenKnowledge, setAutoOpenKnowledge] = useState(false);
  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) {
        if (detail.knowledge && detail.tab === 'treehole') setAutoOpenKnowledge(true);
        setActiveTab(detail.tab as any);
      }
    };
    window.addEventListener('nav-tab', onNav);
    return () => window.removeEventListener('nav-tab', onNav);
  }, []);

  // On This Day
  const [onThisDay, setOnThisDay] = useState<{ id: number; preview: string; year: number } | null>(null);

  // Tag filter
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  // ─── Load timeline ───
  const loadTimeline = useCallback(async (p: number, tagId?: number | null) => {
    setLoading(true);
    try {
      const tagFilter = tagId !== undefined ? tagId : selectedTagId;
      const result = await api.diaryTimeline(p, 10, tagFilter);
      if (p === 1) {
        setGroups(result.items);
      } else {
        setGroups((prev) => [...prev, ...result.items]);
      }
      setHasMore(p < result.totalPages);
      setPage(p);
    } catch (e) {
      console.error('Failed to load timeline', e);
    } finally {
      setLoading(false);
    }
  }, [selectedTagId]);

  // ─── Load On This Day ───
  const loadOnThisDay = useCallback(async () => {
    try {
      const now = new Date();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      const result = await api.diaryOnThisDay(m, d);
      setOnThisDay(result);
    } catch {
      setOnThisDay(null);
    }
  }, []);

  // ─── Load tags ───
  const loadTags = useCallback(async () => {
    try {
      const tags = await api.tagList();
      setAllTags(tags);
    } catch {
      // tags might fail if none exist yet
    }
  }, []);

  // ─── Calendar ───
  const loadCalendar = useCallback(async (year: number, month: number) => {
    try {
      const result = await api.diaryCalendar(year, month);
      setCalDays(result.days);
    } catch {
      // ignore
    }
  }, []);

  // ─── Search ───
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await api.diaryList({ searchText: searchQuery, page: 1, size: 50 });
        setSearchResults(result.items);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Init ───
  useEffect(() => {
    loadTimeline(1);
    loadTags();
    loadOnThisDay();
  }, [loadTimeline, loadTags, loadOnThisDay]);

  useEffect(() => {
    if (activeTab === 'calendar') loadCalendar(calYear, calMonth);
  }, [activeTab, calYear, calMonth, loadCalendar]);

  // ─── Save diary ───
  const handleSave = async (input: {
    content: string;
    date: string;
    mood: string | null;
    tags: number[];
    attachments: File[];
  }) => {
    try {
      const diaryId = editingDiary && editingDiary !== 'new' ? editingDiary.id : undefined;
      await api.diaryUpsert({
        content: input.content,
        date: input.date,
        mood: input.mood,
        tags: input.tags,
        id: diaryId,
      });

      // Upload files if any
      for (const file of input.attachments) {
        await api.uploadFile(file);
      }

      setEditingDiary(null);
      loadTimeline(1);
      loadOnThisDay();
      if (activeTab === 'calendar') loadCalendar(calYear, calMonth);
    } catch {
      showToast('保存失败，请检查网络后重试');
    }
  };

  // ─── Delete diary ───
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false); // ⑧ 删除中反馈
  const handleDelete = async (id: number) => {
    setDeleting(true); // ⑧ 删除中：文本 + UI 反馈
    try {
      await api.diaryDelete([id]);
      await loadTimeline(1);
      if (activeTab === 'calendar') await loadCalendar(calYear, calMonth);
      showToast('🗑️ 已沉入水底，这条回忆删掉了', 'success'); // ⑧ 删除成功反馈
    } catch {
      showToast('删除失败，请重试'); // 删除失败反馈
    }
    setDeleting(false);
  };

  // ─── Tag filter handler ───
  const handleTagChange = useCallback((tagId: number | null) => {
    setSelectedTagId(tagId);
    loadTimeline(1, tagId);
  }, [loadTimeline]);
  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);
  const streak = (() => {
    if (groups.length === 0) return 0;
    const now = new Date();
    // Adjust for China timezone for the local date
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    // Map for quick lookup
    const dateSet = new Set(groups.map(g => g.date));
    if (!dateSet.has(todayStr)) return 0;
    let count = 1;
    const d = new Date(now);
    while (true) {
      d.setDate(d.getDate() - 1);
      const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (dateSet.has(s)) count++;
      else break;
    }
    return count;
  })();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ─── Mood chart data from calendar days ───
  const moodChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const day of calDays) {
      for (const preview of day.previews) {
        if (preview.mood) {
          counts[preview.mood] = (counts[preview.mood] || 0) + 1;
        }
      }
    }
    return Object.entries(counts).map(([mood, count]) => ({ mood, count }));
  }, [calDays]);
  const totalMoodCount = moodChartData.reduce((s, d) => s + d.count, 0);

  /* ── C 水层：每页一个水色背景（滚动即下潜）── */
  // 浅水面 #21395c（树洞·当下对话）→ 中层水 #172a45（日记/日历/搜索/总结·当下记录）→ 深海夜 #0c1626（图谱沉底，全局默认）
  // 亮色模式：用浅水晨光 tint（futao 修改⑤-5：合理调色非反转）
  const layerTint: Record<string, string> = {
    diary: 'linear-gradient(180deg, rgba(33,57,92,0.35) 0%, rgba(23,42,69,0.0) 180px, transparent 100%)',
    calendar: 'linear-gradient(180deg, rgba(33,57,92,0.28) 0%, transparent 200px)',
    search: 'linear-gradient(180deg, rgba(33,57,92,0.28) 0%, transparent 200px)',
    summary: 'linear-gradient(180deg, rgba(23,42,69,0.45) 0%, transparent 220px)',
    treehole: 'linear-gradient(180deg, rgba(33,57,92,0.28) 0%, rgba(23,42,69,0.15) 200px, transparent 100%)',
  };
  const layerTintLight: Record<string, string> = {
    diary: 'linear-gradient(180deg, rgba(111,180,255,0.14) 0%, rgba(232,240,248,0.0) 180px, transparent 100%)',
    calendar: 'linear-gradient(180deg, rgba(111,180,255,0.12) 0%, transparent 200px)',
    search: 'linear-gradient(180deg, rgba(111,180,255,0.12) 0%, transparent 200px)',
    summary: 'linear-gradient(180deg, rgba(63,139,212,0.10) 0%, transparent 220px)',
    treehole: 'linear-gradient(180deg, rgba(111,180,255,0.12) 0%, rgba(220,231,243,0.4) 200px, transparent 100%)',
  };
  // 用 CSS 媒体/属性检测当前主题（跟随 [data-theme]）
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  const tint = isLight ? layerTintLight : layerTint;

  return (
    <PageShell
      activeTab={activeTab}
      onTabChange={(tab: 'diary' | 'calendar' | 'search' | 'summary' | 'treehole') => {
        setActiveTab(tab);
      }}
      onNewDiary={() => setEditingDiary('new')}
      openSettings={openSettings}
      onSettingsClosed={() => setTriggerSettings(0)}
      waterLayer={tint[activeTab]}
    >
      {/* ─── Pond Hero 首屏：层叠卡片 + 宽空白 ─── */}
      {activeTab === 'diary' && (
        <PondHero
          groups={groups}
          totalCount={totalCount}
          streak={streak}
          onWrite={() => setEditingDiary('new')}
          onEditDiary={(d) => {
            api.diaryDetail(d.id).then((full) => {
              if (full) setEditingDiary(full);
            });
          }}
          onScrollToTimeline={() => {
            document.getElementById('diary-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      {/* ─── Timeline Tab ─── */}
      {activeTab === 'diary' && (
        <div id="diary-timeline">
          <DiaryTimeline
          groups={groups}
          loading={loading}
          hasMore={hasMore}
          onEdit={(d) => setEditingDiary(d)}
          onDelete={(id) => setPendingDelete(id)}
          onLoadMore={() => loadTimeline(page + 1)}
          totalCount={totalCount}
          streak={streak}
          onThisDay={onThisDay}
          onViewOnThisDay={(id) => {
            api.diaryDetail(id).then((d) => {
              if (d) setEditingDiary(d);
            });
          }}
          tags={allTags}
          selectedTagId={selectedTagId}
          onTagChange={handleTagChange}
          onNew={() => setEditingDiary('new')}
        />
        </div>
      )}

      {/* ─── Calendar Tab ─── */}
      {activeTab === 'calendar' && (
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-12 py-6">
          {/* Mood chart at top of calendar view */}
          <div className="mb-6">
            <MoodChart
              data={moodChartData}
              totalCount={totalMoodCount}
            />
          </div>

          <CalendarView
            year={calYear}
            month={calMonth}
            days={calDays}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
            onDayClick={() => {
              // 点右侧回忆卡「去读这段回忆」→ 切到日记 tab
              setActiveTab('diary');
              loadTimeline(1);
              setTimeout(() => {
                document.getElementById('diary-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 300);
            }}
          />
        </div>
      )}

      {/* ─── Search Tab ─── */}
      {activeTab === 'search' && (
        <SearchView onEditDiary={(d) => setEditingDiary(d)} onDeleteDiary={(id) => setPendingDelete(id)} onOpenSettings={() => setTriggerSettings(n => n + 1)} />
      )}

      {/* ─── AI Summary Tab ─── */}
      {activeTab === 'summary' && <AISummaryTab />}

      {/* ─── Treehole Tab ─── */}
      {activeTab === 'treehole' && (
        <TreeholePage autoOpenKnowledge={autoOpenKnowledge} />
      )}

      {/* ─── Editor Modal ─── */}
      {editingDiary && (
        <DiaryEditor
          diary={editingDiary === 'new' ? null : editingDiary}
          onSave={handleSave}
          onClose={() => setEditingDiary(null)}
        />
      )}

      {/* Toast（futao ⑧：删除成功/失败反馈，NIGHT POND 玻璃浮标样式） */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm shadow-lg flex items-center gap-2"
          style={{
            background: toast.type === 'error'
              ? 'rgba(239,68,68,0.9)'
              : 'rgba(23,42,69,0.9)',
            border: toast.type === 'error'
              ? '1px solid rgba(239,68,68,0.5)'
              : '1px solid rgba(111,180,255,0.4)',
            color: toast.type === 'error' ? '#fff' : '#a8d0ff',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 28px rgba(2,8,20,0.5)',
          }}
        >
          {toast.type === 'success' && (
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: '#ffd9a0',
                boxShadow: '0 0 8px rgba(255,217,160,0.8)',
              }}
            />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── NIGHT POND 删除确认弹窗（futao 第六轮①：专属设计替换原生 confirm）───
          futao ⑧：删除中→成功完整反馈。删除中弹窗保持打开显示 busy（正在沉入水底…），成功后关闭+toast */}
      <PondConfirmModal
        open={pendingDelete !== null}
        title="沉入水底？"
        message="这篇日记删除后无法找回，确定要让它沉入水底吗？"
        confirmText="确认删除"
        cancelText="再想想"
        busy={deleting}
        busyText="正在沉入水底…"
        onCancel={() => { if (!deleting) setPendingDelete(null); }}
        onConfirm={() => {
          if (pendingDelete !== null && !deleting) {
            handleDelete(pendingDelete).then(() => setPendingDelete(null));
          }
        }}
      />
    </PageShell>
  );
}
