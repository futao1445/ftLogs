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
  entityIds?: string;
  entityNames?: string;
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
      showToast('已保存修改');
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
      showToast('已删除');
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
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-12 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm transition-all"
            style={{ color: '#a8d0ff' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            返回涟漪
          </button>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => window.dispatchEvent(new CustomEvent('nav-tab', { detail: { tab: 'summary' } }))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs cursor-pointer relative overflow-visible"
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
            查看知识图谱
          </motion.button>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            共 {entries.length} 支记忆瓶
          </span>
        </div>
      </div>

      {/* Entries — 池底记忆瓶阵列 */}
      {loading ? (
        <div className="flex justify-center py-16">
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
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          {/* 池底空瓶插画 — 几何玻璃瓶 */}
          <svg className="mx-auto mb-5" width="64" height="72" viewBox="0 0 64 72" fill="none" aria-hidden="true">
            <path d="M22 14 h20 v10 h8 v34 a4 4 0 0 1 -4 4 H18 a4 4 0 0 1 -4 -4 V24 h8 z"
              fill="rgba(74,106,148,0.12)" stroke="#4a6a94" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="27" y="6" width="10" height="10" rx="2.5" fill="rgba(111,180,255,0.08)" stroke="#4a6a94" strokeWidth="1.2" />
            <circle cx="24" cy="42" r="2.5" fill="#6fb4ff" opacity="0.5" />
            <circle cx="40" cy="50" r="2" fill="#a8d0ff" opacity="0.4" />
            <path d="M24 60 l16 -2" stroke="#6fb4ff" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
          </svg>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>池底还没有记忆瓶</p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
            在涟漪对话中把对你有价值的内容保存进玻璃瓶，沉在池底随时打捞。
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
            去涟漪聊一聊
          </motion.button>
        </motion.div>
      ) : (
        <>
          {/* 玻璃瓶网格 */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            }}
          >
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  whileHover={{ y: -5 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  className="relative cursor-pointer overflow-hidden"
                  style={{
                    borderRadius: 18,
                    background: 'linear-gradient(160deg, rgba(23,42,69,0.75) 0%, rgba(12,22,38,0.85) 100%)',
                    border: '1px solid rgba(74,106,148,0.35)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.25)',
                    backdropFilter: 'blur(12px)',
                  }}
                  onClick={() => handleView(entry)}
                >
                  {/* 瓶口（月金微光）*/}
                  <div
                    style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 52, height: 7,
                      background: 'linear-gradient(90deg, rgba(255,217,160,0.15), rgba(255,217,160,0.5), rgba(255,217,160,0.15))',
                      borderRadius: '0 0 999px 999px',
                      boxShadow: '0 0 12px rgba(255,217,160,0.25)',
                    }}
                  />
                  {/* 瓶身高光 */}
                  <div
                    style={{
                      position: 'absolute', left: 10, top: 14, bottom: 14, width: 2,
                      background: 'linear-gradient(180deg, rgba(168,208,255,0.35), transparent)',
                      borderRadius: 2,
                    }}
                  />
                  {/* 瓶内月金微光 */}
                  <div
                    style={{
                      position: 'absolute', right: 12, bottom: 10, width: 34, height: 34,
                      background: 'radial-gradient(circle, rgba(255,217,160,0.16) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div className="py-4 px-4" style={{ paddingTop: 18 }}>
                    <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {entry.content.length > 90 ? entry.content.slice(0, 90) + '…' : entry.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(entry.updatedAt).toLocaleDateString('zh-CN')} · {entry.source === 'treehole' ? '涟漪对话' : entry.source}
                      </span>
                      <div className="flex items-center gap-1">
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); handleView(entry); }}
                          className="text-[11px] px-1.5 py-0.5 rounded transition-all cursor-pointer"
                          style={{ color: '#8fa6c4' }}
                          whileHover={{ scale: 1.05, color: '#a8d0ff' }}
                          whileTap={{ scale: 0.92, backgroundColor: 'rgba(111,180,255,0.15)' }}
                          transition={{ duration: 0.1 }}
                        >
                          查看
                        </motion.button>
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(entry.id); }}
                          className="text-[11px] px-1.5 py-0.5 rounded transition-all cursor-pointer"
                          style={{ color: '#8fa6c4' }}
                          whileHover={{ scale: 1.05, color: '#ffd9a0' }}
                          whileTap={{ scale: 0.92, backgroundColor: 'rgba(111,180,255,0.15)' }}
                          transition={{ duration: 0.1 }}
                        >
                          删除
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
                  来源：{viewModal.source === 'treehole' ? '涟漪对话' : viewModal.source} · {new Date(viewModal.updatedAt).toLocaleString('zh-CN')}
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
                  删除
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
                  {saving ? '保存中…' : '保存修改'}
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
