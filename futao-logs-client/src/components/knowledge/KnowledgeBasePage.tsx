'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';

interface KnowledgeEntry {
  id: number;
  content: string;
  source: string;
  sourceId: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgeBasePage({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewModal, setViewModal] = useState<KnowledgeEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const pageRef = useRef(page);
  pageRef.current = page;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const result = await api.knowledgeList({ page: p, size: 20 });
      // 如果当前页无数据但 page>1，自动回退到第1页
      if (result.items.length === 0 && p > 1) {
        const fallback = await api.knowledgeList({ page: 1, size: 20 });
        setEntries(fallback.items);
        setTotalPages(fallback.totalPages);
        setPage(1);
      } else {
        setEntries(result.items);
        setTotalPages(result.totalPages);
        setPage(p);
      }
    } catch {
      showToast('加载知识库失败');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    load(1);
  }, [load]);

  const handleView = useCallback((entry: KnowledgeEntry) => {
    setEditContent(entry.content);
    setViewModal(entry);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!viewModal) return;
    setSaving(true);
    try {
      await api.knowledgeUpdate({ id: viewModal.id, content: editContent });
      setViewModal(null);
      showToast('✅ 已保存修改');
      load(page);
    } catch {
      showToast('保存失败');
    }
    setSaving(false);
  }, [viewModal, editContent, page, load, showToast]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.knowledgeDelete(id);
      setDeleteConfirm(null);
      showToast('🗑️ 已删除');
      // Use refs to get fresh values, avoiding stale closure
      const currentEntries = entriesRef.current;
      const currentPage = pageRef.current;
      const newPage = currentEntries.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      load(newPage);
    } catch {
      showToast('删除失败');
    }
  }, [load, showToast]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm transition-all"
            style={{ color: 'var(--accent)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            💬 返回树洞
          </button>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          共 {entries.length} 条知识
        </span>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="text-4xl mb-4">📚</div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>还没有保存的知识</p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
            在树洞对话中把对你有价值的内容保存到知识库，方便随时查看。
          </p>
          <motion.button
            onClick={onBack}
            className="px-4 py-2 rounded-2xl text-sm cursor-pointer relative overflow-visible"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.25) 0%, rgba(111,180,255,0.08) 60%, rgba(111,180,255,0.02) 100%)',
              color: '#6fb4ff',
              border: '1px solid rgba(111,180,255,0.18)',
              boxShadow: '0 0 4px rgba(111,180,255,0.08)',
            }}
            whileHover={{
              background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.40) 0%, rgba(111,180,255,0.15) 50%, rgba(111,180,255,0.05) 100%)',
              color: '#a8d0ff',
              boxShadow: '0 0 20px rgba(111,180,255,0.25), 0 0 40px rgba(111,180,255,0.10)',
            }}
            whileTap={{
              scale: 0.95,
              background: 'radial-gradient(circle at 50% 50%, rgba(255,217,160,0.35) 0%, rgba(111,180,255,0.20) 50%, rgba(111,180,255,0.08) 100%)',
              color: '#ffd9a0',
              borderColor: 'rgba(255,217,160,0.3)',
              boxShadow: '0 0 40px rgba(255,217,160,0.25), 0 0 80px rgba(111,180,255,0.15)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            💬 去树洞聊一聊
          </motion.button>
        </motion.div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl flex gap-3 overflow-hidden"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
                >
                  {/* Bookmark leaf vein strip — 波光蓝书签条 */}
                  <div
                    className="w-[6px] flex-shrink-0 self-stretch relative"
                    style={{
                      background: 'linear-gradient(180deg, rgba(168,208,255,0.30) 0%, rgba(111,180,255,0.08) 100%)',
                      clipPath: 'polygon(50% 0%, 100% 10%, 100% 90%, 0% 100%, 0% 10%)',
                      boxShadow: '1px 0 8px rgba(111,180,255,0.06)',
                    }}
                  />
                  <div className="flex-1 py-3 pr-3">
                    <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {entry.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(entry.updatedAt).toLocaleDateString('zh-CN')} · 来自{entry.source === 'treehole' ? '树洞对话' : entry.source}
                      </span>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => handleView(entry)}
                          className="text-xs px-2 py-1 rounded transition-all cursor-pointer"
                          style={{ color: 'var(--text-tertiary)' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.92, backgroundColor: 'rgba(111,180,255,0.15)' }}
                          transition={{ duration: 0.1 }}
                        >
                          👁️ 查看
                        </motion.button>
                        <motion.button
                          onClick={() => setDeleteConfirm(entry.id)}
                          className="text-xs px-2 py-1 rounded transition-all cursor-pointer"
                          style={{ color: 'var(--text-tertiary)' }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.92, backgroundColor: 'rgba(111,180,255,0.15)' }}
                          transition={{ duration: 0.1 }}
                        >
                          🗑️ 删除
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <motion.button
                  key={p}
                  onClick={() => load(p)}
                  className="w-8 h-8 rounded-lg text-xs transition-all cursor-pointer"
                  style={{
                    background: p === page ? 'var(--accent)' : 'transparent',
                    color: p === page ? 'var(--accent-text)' : 'var(--text-tertiary)',
                  }}
                  whileTap={{ scale: 0.94, backgroundColor: p === page ? undefined : 'rgba(111,180,255,0.15)' }}
                  transition={{ duration: 0.1 }}
                >
                  {p}
                </motion.button>
              ))}
            </div>
          )}
        </>
      )}

      {/* View/Edit Modal */}
      <AnimatePresence>
        {viewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setViewModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-lg rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-modal)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>保存内容</span>
                <button onClick={() => setViewModal(null)} className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}>✕</button>
              </div>
              <div className="p-4">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full min-h-[120px] rounded-lg p-3 text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  来源：{viewModal.source === 'treehole' ? '树洞对话' : viewModal.source} · {new Date(viewModal.updatedAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-default)' }}>
                <motion.button
                  onClick={() => setDeleteConfirm(viewModal.id)}
                  className="px-4 py-1.5 rounded-lg text-sm transition-all cursor-pointer"
                  style={{ background: '#ef4444', color: '#fff' }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95, backgroundColor: '#dc2626', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}
                  transition={{ duration: 0.1 }}
                >
                  🗑️ 删除
                </motion.button>
                <motion.button
                  onClick={() => setViewModal(null)}
                  className="px-4 py-1.5 rounded-lg text-sm cursor-pointer"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  whileTap={{ scale: 0.95, backgroundColor: 'rgba(111,180,255,0.15)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-2xl text-sm cursor-pointer disabled:opacity-30 relative overflow-visible"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.25) 0%, rgba(111,180,255,0.08) 60%, rgba(111,180,255,0.02) 100%)',
                    color: '#6fb4ff',
                    border: '1px solid rgba(111,180,255,0.18)',
                    boxShadow: '0 0 4px rgba(111,180,255,0.08)',
                  }}
                  whileHover={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.40) 0%, rgba(111,180,255,0.15) 50%, rgba(111,180,255,0.05) 100%)',
                    color: '#a8d0ff',
                    boxShadow: '0 0 20px rgba(111,180,255,0.25), 0 0 40px rgba(111,180,255,0.10)',
                  }}
                  whileTap={{
                    scale: 0.95,
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,217,160,0.35) 0%, rgba(111,180,255,0.20) 50%, rgba(111,180,255,0.08) 100%)',
                    color: '#ffd9a0',
                    borderColor: 'rgba(255,217,160,0.3)',
                    boxShadow: '0 0 40px rgba(255,217,160,0.25), 0 0 80px rgba(111,180,255,0.15)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  {saving ? '保存中...' : '💾 保存修改'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-xl p-6"
              style={{ background: 'var(--bg-elevated)', width: 360, boxShadow: 'var(--shadow-modal)' }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>确认删除</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>删除后无法恢复</p>
              <div className="flex justify-end gap-3">
                <motion.button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  whileTap={{ scale: 0.95, backgroundColor: 'rgba(111,180,255,0.15)' }}
                  transition={{ duration: 0.1 }}
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 rounded-lg text-sm text-white cursor-pointer"
                  style={{ background: '#ef4444' }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95, backgroundColor: '#dc2626', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' }}
                  transition={{ duration: 0.1 }}
                >
                  确认删除
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <span className="text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
