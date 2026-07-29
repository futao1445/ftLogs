'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import type { Diary, TimelineGroup, Tag, CalendarDay } from '../../lib/types';
import PageShell from '../common/PageShell';
import DiaryTimeline from '../diary/DiaryTimeline';
import DiaryEditor from '../diary/DiaryEditor';
import CalendarView from '../calendar/CalendarView';
import DiaryCard from '../diary/DiaryCard';

export default function HomePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'diary' | 'calendar' | 'search'>('diary');

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
  };

  // ─── Delete diary ───
  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这篇日记？')) return;
    try {
      await api.diaryDelete([id]);
      loadTimeline(1);
      if (activeTab === 'calendar') loadCalendar(calYear, calMonth);
    } catch {
      // ignore
    }
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

  return (
    <PageShell
      activeTab={activeTab}
      onTabChange={(tab: 'diary' | 'calendar' | 'search') => {
        setActiveTab(tab);
        if (tab === 'search') setSearchQuery('');
      }}
      onNewDiary={() => setEditingDiary('new')}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {/* ─── Timeline Tab ─── */}
      {activeTab === 'diary' && (
        <DiaryTimeline
          groups={groups}
          loading={loading}
          hasMore={hasMore}
          onEdit={(d) => setEditingDiary(d)}
          onDelete={handleDelete}
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
      )}

      {/* ─── Calendar Tab ─── */}
      {activeTab === 'calendar' && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <CalendarView
            year={calYear}
            month={calMonth}
            days={calDays}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
            onDayClick={(date) => {
              // Switch to diary view filtered by this date
              setActiveTab('diary');
              loadTimeline(1);
            }}
          />
          {/* Calendar day previews */}
          <div className="mt-6 space-y-3">
            {calDays.map((day) => (
              <div key={day.date} className="mb-4">
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {day.date} ({day.count} 篇)
                </h3>
                <div className="space-y-2">
                  {day.previews.map((p) => (
                    <div
                      key={p.id}
                      className="text-sm p-3 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-secondary)',
                      }}
                      onClick={() => {
                        api.diaryDetail(p.id).then((d) => {
                          if (d) setEditingDiary(d);
                        });
                      }}
                    >
                      {p.mood && <span className="mr-1">{p.mood}</span>}
                      {p.preview}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {calDays.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                这个月还没有日记
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Search Tab ─── */}
      {activeTab === 'search' && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          {searching && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              搜索中...
            </p>
          )}
          {!searching && searchQuery && searchResults.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              没找到匹配的日记
            </p>
          )}
          {!searching &&
            searchResults.map((d) => (
              <DiaryCard key={d.id} diary={d} onEdit={() => setEditingDiary(d)} onDelete={handleDelete} />
            ))}
          {!searchQuery && !searching && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              输入关键词搜索日记内容
            </p>
          )}
        </div>
      )}

      {/* ─── Editor Modal ─── */}
      {editingDiary && (
        <DiaryEditor
          diary={editingDiary === 'new' ? null : editingDiary}
          onSave={handleSave}
          onClose={() => setEditingDiary(null)}
        />
      )}
    </PageShell>
  );
}
