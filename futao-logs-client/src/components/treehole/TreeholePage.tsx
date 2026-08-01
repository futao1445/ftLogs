'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import KnowledgeBasePage from '../knowledge/KnowledgeBasePage';

type Message = { role: 'user' | 'assistant'; content: string };

const ALL_BUBBLES: string[] = [
  // 了解维度
  '🌱 了解我最近的生活轨迹',
  '✨ 分析我自己都没发现的闪光点',
  '📊 我最常做的事情是什么？',
  '⏰ 我的作息习惯怎么样？',
  '🎯 我的兴趣爱好是什么？',
  '💪 我最近有什么成长和进步？',
  // 社交与关系
  '👥 我最近和谁来往比较多？',
  '💬 分析一下我的社交状态',
  '🤝 我在人际关系方面有什么模式？',
  // 情绪与心理健康
  '❤️ 我最近情绪状态怎么样？',
  '🧠 我最近压力来源是什么？',
  '🔄 我的情绪变化有什么规律？',
  // 知识图谱提问
  '🔗 我的知识图谱有什么有趣的联系？',
  '🎲 基于知识图谱问三个不了解我的问题',
  '🧩 从我的日记中找出我还没意识到的关联',
  // 随机好奇
  '🌟 随便问我三个问题，挑战你了解我',
  '🔮 从日记里挑一个有意思的话题聊聊',
  '🎪 告诉我一件我自己都没注意的事情',
  // 结合知识库
  '📚 根据我的知识库有什么新发现？',
  '🗺️ 我的知识图谱最近有什么变化？',
  '💡 结合知识库，给我三个新的思考方向',
  // 深度了解
  '🎭 我最近在为什么事情纠结？',
  '🏆 我今天取得了什么成就？',
  '🌙 我的睡眠质量如何？',
];

function pickRandomBubbles(count: number): string[] {
  const shuffled = [...ALL_BUBBLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function TreeholePage({ autoOpenKnowledge = false }: { autoOpenKnowledge?: boolean }) {
  const [sessions, setSessions] = useState<{ id: number; title: string; updatedAt: string }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [bubbles, setBubbles] = useState<string[]>(() => pickRandomBubbles(4));
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveProcessing, setSaveProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; onClick: () => void } } | null>(null);
  const [saveModal, setSaveModal] = useState<{ sessionId: number; content: string } | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showKnowledge, setShowKnowledge] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);
  const savingRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleIdRef = useRef(0);
  // ⑥ 批量选择/删除（futao 第3次打回⑥：涟漪对话+知识库窗口支持批量选择和删除）
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false); // ⑧ 批量删除中反馈

  /* ── 水波涟漪：点击处扩散 + 月金闪光 ── */
  const handleRipple = useCallback((e: React.PointerEvent) => {
    const btn = e.currentTarget as HTMLElement;
    let x = 50, y = 50;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      x = ((e.clientX - rect.left) / rect.width) * 100;
      y = ((e.clientY - rect.top) / rect.height) * 100;
    }
    const id = ++rippleIdRef.current;
    setRipples(prev => [...prev, { id, x, y }]);
  }, []);

  const removeRipple = useCallback((id: number) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  }, []);

  const showToast = useCallback((msg: string, action?: { label: string; onClick: () => void }) => {
    setToast({ msg, action });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Load sessions ── */
  const loadSessions = useCallback(async () => {
    try {
      const list = await api.treeholeSessions();
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id);
      }
    } catch {}
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load messages for a session ── */
  const loadMessages = useCallback(async (sessionId: number) => {
    setLoading(true);
    try {
      const data = await api.treeholeMessages(sessionId);
      const msgs = data.messages as Message[];
      setMessages(msgs);
      // Don't hide guide here — let handleSend/handleGuideClick control that
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Auto-load messages when activeSessionId is set ── */
  const prevSessionRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeSessionId && activeSessionId !== prevSessionRef.current) {
      prevSessionRef.current = activeSessionId;
      loadMessages(activeSessionId);
    }
  }, [activeSessionId, loadMessages]);

  /* ── Init ── */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    loadSessions();
  }, [loadSessions]);

  /* ── Auto-open knowledge base (cross-tab jump from graph) ── */
  useEffect(() => {
    if (autoOpenKnowledge) setShowKnowledge(true);
  }, [autoOpenKnowledge]);

  /* ── Select session ── */
  const handleSelectSession = useCallback(async (id: number) => {
    setActiveSessionId(id);
    await loadMessages(id);
  }, [loadMessages]);

  /* ── Save session to knowledge base ── */
  const handleSaveSession = useCallback(async (sessionId: number) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSavingId(sessionId);
    setSaveProcessing(true);
    try {
      // summarizeSession 已异步化：立即返回 processing，后台跑摘要
      // 先给用户进度反馈，再轮询 treehole.status 等摘要完成
      const summarizeResult = await api.treeholeSummarizeSession(sessionId);
      // 若 summarize 本身直接失败 → 立即兜底拼接原文，不等 60s
      if (!summarizeResult.success) {
        const data = await api.treeholeMessages(sessionId);
        const content = (data.messages as Message[]).map(m => `${m.role === 'user' ? '我' : 'AI'}: ${m.content}`).join('\n\n');
        if (content) {
          setEditContent(content);
          setSaveModal({ sessionId, content });
        } else {
          showToast('该对话暂无内容可保存');
        }
        setSaveProcessing(false);
        setSavingId(null);
        savingRef.current = false;
        return;
      }

      // 轮询摘要状态（最多 ~60s），done 才弹确认框，error 报错
      let content: string | null = null;
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 1500));
        const st = await api.treeholeStatus(sessionId);
        if (st.summary.status === 'done') {
          content = st.summary.summary || '';
          break;
        }
        if (st.summary.status === 'error') {
          showToast(st.summary.error || '生成总结失败，请重试');
          setSaveProcessing(false);
          setSavingId(null);
          savingRef.current = false;
          return;
        }
        // processing / idle → 继续轮询
      }

      if (content === null) {
        // 超时兜底：拼接原文
        const data = await api.treeholeMessages(sessionId);
        content = (data.messages as Message[]).map(m => `${m.role === 'user' ? '我' : 'AI'}: ${m.content}`).join('\n\n');
      }

      if (!content) {
        showToast('该对话暂无内容可保存');
      } else {
        setEditContent(content);
        setSaveModal({ sessionId, content });
      }
    } catch {
      showToast('获取对话内容失败');
    }
    setSaveProcessing(false);
    setSavingId(null);
    savingRef.current = false;
  }, [showToast]);

  /* ── Confirm save ── */
  const handleConfirmSave = useCallback(async () => {
    if (!saveModal) return;
    try {
      const result = await api.treeholeSaveToKnowledgeBase({ sessionId: saveModal.sessionId, content: editContent });
      setSaveModal(null);
      showToast(result.message || '✅ 已保存到知识库！', { label: '📚 查看知识库', onClick: () => setShowKnowledge(true) });
    } catch {
      showToast('保存失败，请重试');
    }
  }, [saveModal, editContent, showToast]);

  /* ── Delete session ── */
  const handleDeleteSession = useCallback(async (sessionId: number) => {
    setDeleteConfirm(null);
    setDeleting(sessionId);
    try {
      await api.treeholeDeleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        setShowGuide(true);
      }
      showToast('🗑️ 对话已删除');
    } catch {
      showToast('删除失败');
    }
    setDeleting(null);
  }, [activeSessionId, showToast]);

  /* ── ⑥ 批量选择/删除对话 ── */
  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === sessions.length) return new Set();
      return new Set(sessions.map(s => s.id));
    });
  }, [sessions]);
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      await api.treeholeDeleteSession([...selectedIds]);
      setSessions(prev => prev.filter(s => !selectedIds.has(s.id)));
      if (activeSessionId !== null && selectedIds.has(activeSessionId)) {
        setActiveSessionId(null);
        setMessages([]);
        setShowGuide(true);
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      showToast(`🗑️ 已沉入水底，删除 ${selectedIds.size} 段对话`);
    } catch {
      showToast('批量删除失败');
    }
    setBatchDeleting(false);
  }, [selectedIds, activeSessionId, showToast]);

  /* ── New session ── */
  const handleNewSession = useCallback(async () => {
    try {
      const result = await api.treeholeNewSession();
      setSessions(prev => [{ id: result.id, title: result.title, updatedAt: '' }, ...prev]);
      setActiveSessionId(result.id);
      setMessages([]);
      setShowGuide(true);
      setBubbles(pickRandomBubbles(4));
    } catch {}
  }, []);

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeSessionId || sending) return;
    setInput('');
    setShowGuide(false);

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const result = await api.treeholeAsk(activeSessionId, text);
      if (result.success && result.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.reply! }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'AI 暂时走神了，再问一次？' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI 暂时走神了，再问一次？' }]);
    } finally {
      setSending(false);
    }
  }, [input, activeSessionId, sending]);

  /* ── Send guide bubble as message ── */
  const handleGuideClick = useCallback(async (text: string) => {
    if (!activeSessionId) return;
    setShowGuide(false);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const result = await api.treeholeAsk(activeSessionId, text);
      if (result.success && result.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.reply! }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'AI 暂时走神了，再问一次？' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI 暂时走神了，再问一次？' }]);
    } finally {
      setSending(false);
    }
  }, [activeSessionId]);

  /* ── Auto scroll ── */
  useEffect(() => {
    // block:'nearest'：消息区不满/底部已可见时不滚动任何容器，
    // 避免 scrollIntoView 把外层 overflow-hidden 容器顶出（futao 反馈「聊天窗被顶上去截断」根因）
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  /* ── Key handler ── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const sessionTime = (s: string) => {
    if (!s) return '';
    const d = new Date(s);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // If showing knowledge base, render it
  if (showKnowledge) {
    return <KnowledgeBasePage onBack={() => setShowKnowledge(false)} />;
  }

  return (
    <div className="max-w-[1240px] mx-auto px-3 sm:px-4 lg:px-6 relative overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* L1 深水底（3D 纵深最底层）：铺满全页的氛围光 */}
      <div className="pond-deep-layer" />
      <div className="flex h-full gap-3 pt-3 pb-14 relative z-10">
        {/* ─── Left: 会话列表 ─── */}
        <div className="w-56 sm:w-60 lg:w-72 flex-shrink-0 flex flex-col gap-3">
          {/* 会话列表（上） */}
          <div
            className="flex-none rounded-xl overflow-hidden flex flex-col"
            style={{ maxHeight: '40%', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
          >
          {/* Knowledge base entry — 黑猫守夜（v5 落地：抽象几何剪影 + 独月眼 + 尾尖落水涟漪） */}
          <motion.button
            onClick={() => setShowKnowledge(true)}
            className="kb-cat-wrap flex items-center gap-2.5 px-2.5 py-2 mx-2 mt-2 rounded-2xl cursor-pointer relative overflow-hidden"
            style={{
              background: 'rgba(12,22,38,0.5)',
              border: '1px solid rgba(45,74,117,0.35)',
              color: '#8fa6c4',
            }}
            whileHover={{
              background: 'rgba(17,29,49,0.7)',
              borderColor: 'rgba(111,180,255,0.35)',
              boxShadow: '0 0 22px rgba(111,180,255,0.10), inset 0 0 18px rgba(111,180,255,0.05)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 24 }}
            title="知识库"
          >
            <svg className="cat-svg" viewBox="0 0 132 96" width="46" height="34" aria-hidden="true" style={{ flexShrink: 0 }}>
              <defs>
                <filter id="cat-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.4" /></filter>
              </defs>
              {/* 水面线 */}
              <line x1="10" y1="84" x2="124" y2="84" stroke="rgba(168,208,255,0.12)" strokeWidth="1" />
              {/* 猫身剪影：圆拱 + 双耳（禁手绘生物 → 抽象几何） */}
              <path d="M40 82 C 32 66, 36 48, 46 38 L 50 26 L 58 36 C 62 32, 78 32, 82 36 L 90 26 L 94 38 C 104 48, 108 66, 100 82 Z"
                    fill="#0d1b30" stroke="rgba(74,106,148,0.55)" strokeWidth="1" />
              {/* 尾：向右下卷出，触水 */}
              <path d="M100 66 C 112 64, 118 74, 112 82" fill="none" stroke="#0d1b30" strokeWidth="5" strokeLinecap="round" />
              {/* 尾尖落水涟漪 */}
              <circle className="tail-ring" cx="112" cy="84" r="5" fill="none" stroke="rgba(255,217,160,0.5)" strokeWidth="1.2" />
              <circle className="tail-ring" cx="112" cy="84" r="10" fill="none" stroke="rgba(255,217,160,0.25)" strokeWidth="0.9" style={{ animationDelay: '.4s' }} />
              {/* 月眼（唯一亮色） */}
              <circle className="cat-eye" cx="70" cy="48" r="3" fill="#ffd9a0" opacity="0.95" />
              <circle cx="70" cy="48" r="7" fill="rgba(255,217,160,0.14)" />
              {/* 水中倒影（向下镜像，淡 + 模糊） */}
              <g filter="url(#cat-blur)" opacity="0.3">
                <path d="M40 82 C 32 66, 36 48, 46 38 L 50 26 L 58 36 C 62 32, 78 32, 82 36 L 90 26 L 94 38 C 104 48, 108 66, 100 82 Z"
                      fill="rgba(74,106,148,0.5)" transform="scale(1,-1) translate(0,-168)" />
              </g>
            </svg>
            <div className="text-left">
              <div className="text-xs tracking-[2px]" style={{ color: '#8fa6c4' }}>知识库</div>
              <div className="text-[9px] tracking-[1px]" style={{ color: '#8fa6c4', opacity: 0.5, marginTop: 2 }}>MEMORY · 水面记下的</div>
            </div>
          </motion.button>

          <div className="p-2 border-b mt-2" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-1.5">
              <motion.button
                onClick={handleNewSession}
                className="flex-1 py-1.5 rounded-2xl text-xs font-medium cursor-pointer relative overflow-visible"
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
                ＋ 新对话
              </motion.button>
              {/* ⑥ 批量选择模式切换 */}
              <motion.button
                onClick={toggleSelectMode}
                className={`px-2 py-1.5 rounded-2xl text-xs cursor-pointer ${selectMode ? 'ring-1' : ''}`}
                style={{
                  background: selectMode ? 'rgba(255,217,160,0.12)' : 'rgba(111,180,255,0.06)',
                  color: selectMode ? '#ffd9a0' : '#8fa6c4',
                  border: `1px solid ${selectMode ? 'rgba(255,217,160,0.35)' : 'rgba(74,106,148,0.4)'}`,
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
                title="批量选择/删除"
              >
                {selectMode ? '✓ 选择中' : '⧉ 批量'}
              </motion.button>
            </div>
            {/* ⑥ 批量操作栏（选择模式下显示） */}
            {selectMode && (
              <div className="flex items-center justify-between mt-2 px-1">
                <motion.button
                  onClick={selectAll}
                  className="text-[11px] cursor-pointer"
                  style={{ color: '#a8d0ff' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {selectedIds.size === sessions.length && sessions.length > 0 ? '取消全选' : '全选'}
                </motion.button>
                <span className="text-[11px]" style={{ color: '#ffd9a0' }}>
                  已选 {selectedIds.size}
                </span>
                <motion.button
                  onClick={handleBatchDelete}
                  disabled={selectedIds.size === 0 || batchDeleting}
                  className="text-[11px] px-2 py-1 rounded-lg cursor-pointer disabled:opacity-30 flex items-center gap-1"
                  style={{
                    color: selectedIds.size > 0 ? '#ef4444' : 'var(--text-tertiary)',
                    border: selectedIds.size > 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border-default)',
                    background: selectedIds.size > 0 ? 'rgba(239,68,68,0.08)' : 'transparent',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {batchDeleting ? '删除中…' : '删除所选'}
                </motion.button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 pond-scroll">
            <AnimatePresence>
              {sessions.map(s => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="group relative"
                >
                  <button
                    onClick={() => selectMode ? toggleSelect(s.id) : handleSelectSession(s.id)}
                    className="w-full text-left px-2 py-2 rounded-lg text-xs transition-all pr-14 cursor-pointer"
                    style={{
                      background: selectMode
                        ? (selectedIds.has(s.id) ? 'rgba(255,217,160,0.10)' : 'transparent')
                        : (activeSessionId === s.id ? 'var(--accent-soft)' : 'transparent'),
                      color: selectMode
                        ? (selectedIds.has(s.id) ? '#ffd9a0' : 'var(--text-secondary)')
                        : (activeSessionId === s.id ? 'var(--accent)' : 'var(--text-secondary)'),
                      border: selectedIds.has(s.id) ? '1px solid rgba(255,217,160,0.3)' : '1px solid transparent',
                    }}
                    onMouseEnter={e => { if (!selectMode && activeSessionId !== s.id) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseLeave={e => { if (!selectMode && activeSessionId !== s.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-1.5">
                      {/* ⑥ 选择模式复选框 */}
                      {selectMode && (
                        <span
                          className="flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px]"
                          style={{
                            borderColor: selectedIds.has(s.id) ? '#ffd9a0' : 'rgba(74,106,148,0.6)',
                            background: selectedIds.has(s.id) ? 'rgba(255,217,160,0.2)' : 'transparent',
                            color: '#ffd9a0',
                          }}
                        >
                          {selectedIds.has(s.id) ? '✓' : ''}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{s.title}</div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{sessionTime(s.updatedAt)}</div>
                      </div>
                    </div>
                  </button>
                  {!selectMode && (
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={() => handleSaveSession(s.id)}
                      disabled={savingId === s.id}
                      className="flex flex-col items-center gap-[4px] rounded text-xs cursor-pointer disabled:opacity-30 px-1.5 py-1"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="保存到知识库"
                      whileHover={{ color: '#6fb4ff' }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span>💾</span>
                      {/* Water droplet — 一滴沉入水面的水光 */}
                      <motion.div className="relative" style={{ width: 20, height: 20 }}>
                        <motion.div
                          className="absolute"
                          style={{
                            width: 10, height: 10,
                            background: 'radial-gradient(circle at 35% 30%, rgba(168,208,255,0.5) 0%, rgba(111,180,255,0.12) 60%, rgba(74,106,148,0.15) 100%)',
                            borderRadius: '60% 60% 55% 55%',
                            left: 5, top: 5,
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)',
                            transition: 'all 0.3s ease',
                          }}
                          whileHover={{
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 10px rgba(111,180,255,0.45)',
                          }}
                          whileTap={{
                            scale: 0.9,
                            boxShadow: '0 0 14px rgba(255,217,160,0.6)',
                          }}
                        />
                        {/* 水滴高光 */}
                        <motion.div
                          className="absolute"
                          style={{
                            width: 3, height: 3,
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '50%',
                            left: 7, top: 7,
                            transition: 'all 0.3s ease',
                          }}
                          whileHover={{ scale: 1.3, background: 'rgba(255,255,255,0.9)' }}
                        />
                      </motion.div>
                    </motion.button>
                    <motion.button
                      onClick={() => setDeleteConfirm(s.id)}
                      disabled={deleting === s.id}
                      className="flex flex-col items-center gap-[4px] rounded text-xs cursor-pointer disabled:opacity-30 px-1.5 py-1"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="删除对话"
                      whileHover={{ color: '#ef4444' }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span>✕</span>
                      {/* Water droplet (destructive) — 红色水滴 */}
                      <motion.div className="relative" style={{ width: 20, height: 20 }}>
                        <motion.div
                          className="absolute"
                          style={{
                            width: 10, height: 10,
                            background: 'radial-gradient(circle at 35% 30%, rgba(255,150,150,0.5) 0%, rgba(239,68,68,0.12) 60%, rgba(120,40,40,0.15) 100%)',
                            borderRadius: '60% 60% 55% 55%',
                            left: 5, top: 5,
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)',
                            transition: 'all 0.3s ease',
                          }}
                          whileHover={{
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 10px rgba(239,68,68,0.45)',
                          }}
                          whileTap={{
                            scale: 0.9,
                            boxShadow: '0 0 14px rgba(255,217,160,0.6)',
                          }}
                        />
                        <motion.div
                          className="absolute"
                          style={{
                            width: 3, height: 3,
                            background: 'rgba(255,255,255,0.7)',
                            borderRadius: '50%',
                            left: 7, top: 7,
                            transition: 'all 0.3s ease',
                          }}
                          whileHover={{ scale: 1.3, background: 'rgba(255,255,255,0.9)' }}
                        />
                      </motion.div>
                    </motion.button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {sessions.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>暂无对话</p>
            )}
          </div>
        </div>

        </div>

        {/* ─── Right: Chat area（L3 聊天窗：浮在 L2 大水波上，唯一焦点）─── */}
        <div className="relative flex-1 min-w-0 flex flex-col">
          {/* 水面反光带：聊天窗底缘与下层水波交界处的细光 */}
          <div className="pond-waterline" />
          {/* L2 大水波（聊天窗「下层」水面层）：实体水面 + 波纹环 + 动态荡漾环
              futao ①大水波在聊天窗下完整可见（不再是只有波纹）+「大水波要动态荡漾」*/}
          <div className="pond-big-wave" />
          <div className="pond-wave-drift d1" />
          <div className="pond-wave-drift d2" />
          <div className="pond-wave-drift d3" />
          <div
            className="relative z-10 rounded-xl overflow-hidden flex flex-col"
            style={{
              /* 叶子(聊天窗)落在水上：纵向完整（futao ③）+ 底部留水层让涟漪泛开（futao ①叶子落水）
                 mx-auto 居中，两侧留白放装饰（futao ⑦ 背景文字不侵入聊天窗）
                 v5 落地：聊天窗往下再拓展一点（futao 08:46）→ 底部留白收到 ~70px（14px flex 内 + 56px 容器 pb），
                 水线/波心随之下移（bottom 150→70px，波心 250px=320-70），叶子更占满水面 */
              height: 'calc(100% - 14px)',
              width: 'min(100%, 680px)',
              marginLeft: 'auto',
              marginRight: 'auto',
              background:
                'linear-gradient(160deg, rgba(111,180,255,0.34) 0%, rgba(74,106,148,0.44) 52%, rgba(45,74,117,0.52) 100%)',
              border: '1px solid rgba(168,208,255,0.32)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -24px 44px rgba(12,22,38,0.18), 0 26px 54px rgba(2,8,20,0.5), 0 60px 120px rgba(2,8,20,0.3), 0 0 60px rgba(111,180,255,0.10), 0 0 160px rgba(168,208,255,0.06)',
            }}
          >
          {/* v5 顶部：静夜涟漪（名字）+ 副语 —— 不侵入聊天窗外 */}
          <div className="flex items-center gap-2.5 px-5 pt-4 pb-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ffd9a0', opacity: 0.9, boxShadow: '0 0 8px rgba(255,217,160,0.7)' }} />
            <span className="text-sm tracking-[2px] font-light" style={{ color: '#e2ecfa' }}>静夜涟漪</span>
            <span className="text-[11px] tracking-[1px]" style={{ color: '#a8d0ff', opacity: 0.7 }}>把话轻轻放进水里</span>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pond-scroll">
            <AnimatePresence mode="popLayout">
              {showGuide && (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Direction B：banner 已含仪式 + 引导标签，仅保留一句提示文案（协调不冲突） */}
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div
                      className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={{
                        background: 'rgba(74,106,148,0.28)',
                        color: 'var(--text-primary)',
                        border: '1px solid rgba(168,208,255,0.35)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px rgba(111,180,255,0.08)',
                      }}
                    >
                      <p>选择想说的话，或直接在下面输入。</p>
                    </div>
                  </motion.div>
                  {/* 话题气泡（futao 第3次打回②：在聊天窗口里，不在左下角） */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {bubbles.map(t => (
                      <button key={t} onClick={() => handleGuideClick(t)} className="pond-guide-tag">{t}</button>
                    ))}
                    <button onClick={() => setBubbles(pickRandomBubbles(4))} className="pond-guide-tag pond-guide-shuffle">🔄 换一批</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              </div>
            )}

            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={`msg-${i}`}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: msg.role === 'user' ? 0.2 : 0.3, ease: 'easeOut' }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        background: msg.role === 'user' ? 'var(--bg-secondary)' : 'rgba(74,106,148,0.35)',
                        color: 'var(--text-primary)',
                        border: msg.role === 'user' ? '1px solid var(--border-default)' : '1px solid rgba(168,208,255,0.35)',
                        boxShadow: msg.role === 'user'
                          ? '0 1px 3px rgba(2,8,20,0.4)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px rgba(111,180,255,0.08)',
                      }}
                    >
                      <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div
                  className="rounded-2xl px-4 py-2.5"
                  style={{
                    background: 'rgba(74,106,148,0.28)',
                    border: '1px solid rgba(168,208,255,0.35)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="typing-dots"><span /></span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>对方正在输入中…</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeSessionId ? '输入消息...' : '请先新建或选择对话'}
                disabled={!activeSessionId || sending}
                className="flex-1 h-10 px-4 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              />
              <motion.button
                onClick={handleSend}
                disabled={!input.trim() || !activeSessionId || sending}
                className="w-10 h-10 rounded-2xl flex items-center justify-center disabled:opacity-30 cursor-pointer relative overflow-visible"
                style={{
                  background: input.trim() && activeSessionId && !sending
                    ? 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.25) 0%, rgba(111,180,255,0.08) 60%, rgba(111,180,255,0.02) 100%)'
                    : 'transparent',
                  color: input.trim() && activeSessionId && !sending ? '#6fb4ff' : 'var(--text-tertiary)',
                  border: input.trim() && activeSessionId && !sending ? '1px solid rgba(111,180,255,0.18)' : '1px solid transparent',
                  boxShadow: input.trim() && activeSessionId && !sending ? '0 0 4px rgba(111,180,255,0.08)' : 'none',
                }}
                whileHover={input.trim() && activeSessionId && !sending ? {
                  background: 'radial-gradient(circle at 50% 50%, rgba(111,180,255,0.40) 0%, rgba(111,180,255,0.15) 50%, rgba(111,180,255,0.05) 100%)',
                  color: '#a8d0ff',
                  boxShadow: '0 0 20px rgba(111,180,255,0.25), 0 0 40px rgba(111,180,255,0.10)',
                } : {}}
                whileTap={input.trim() && activeSessionId && !sending ? {
                  scale: 0.96,
                  background: 'radial-gradient(circle at 50% 50%, rgba(255,217,160,0.40) 0%, rgba(111,180,255,0.20) 50%, rgba(111,180,255,0.08) 100%)',
                  color: '#ffd9a0',
                  borderColor: 'rgba(255,217,160,0.35)',
                  boxShadow: '0 0 40px rgba(255,217,160,0.30), 0 0 80px rgba(111,180,255,0.15)',
                } : {}}
                onPointerDown={input.trim() && activeSessionId && !sending ? handleRipple : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                {/* 水波涟漪：点击处一圈圈扩散 + 月金闪光 */}
                {ripples.map(r => (
                  <motion.span
                    key={r.id}
                    className="pointer-events-none absolute rounded-full"
                    style={{
                      left: `${r.x}%`,
                      top: `${r.y}%`,
                      translateX: '-50%',
                      translateY: '-50%',
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,217,160,0.7)',
                      background: 'rgba(255,217,160,0.10)',
                      boxShadow: '0 0 8px rgba(255,217,160,0.45), inset 0 0 4px rgba(168,208,255,0.25)',
                    }}
                    initial={{ scale: 0.35, opacity: 0.9 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
                    onAnimationComplete={() => removeRipple(r.id)}
                  />
                ))}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg>
              </motion.button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* L4 装饰元素（v5 落地：字标/右侧竖排，低存在感、不侵入聊天窗）
          v5 气质：字标=左上（进左栏顶部作品牌水印）、右侧竖排=留白处 */}
      <div className="pond-elem" style={{ left: 36, top: 74, zIndex: 20 }}>
        <div className="pond-kicker" style={{ color: '#ffd9a0', opacity: 0.20, marginBottom: 10 }}>涟漪 · 静夜</div>
        <div className="pond-wordmark" style={{ fontSize: 24, letterSpacing: 11, opacity: 0.12 }}>涟<span className="pond-wordmark-dot">.</span>漪</div>
      </div>
      {/* 右侧竖排一句（留白处，低存在感） */}
      <div className="pond-elem" style={{ right: 66, bottom: 150, zIndex: 20, fontSize: 10, lineHeight: 2.1, color: '#8fa6c4', opacity: 0.18, letterSpacing: 3, textAlign: 'right', whiteSpace: 'nowrap' }}>
        有人在水下，<b style={{ color: '#a8d0ff', fontWeight: 300, opacity: 0.7 }}>静静听</b>。
      </div>
      <div className="pond-rings" />
      <div className="pond-moon" style={{ right: 90, top: 96 }} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-lg text-sm shadow-lg"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <span>{toast.msg}</span>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium underline underline-offset-2 cursor-pointer"
                style={{ color: 'var(--accent)' }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 保存到知识库 · 进度提示（防止用户误以为操作完了/故障） */}
      <AnimatePresence>
        {saveProcessing && !saveModal && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="rounded-2xl px-6 py-5 flex items-center gap-4 pointer-events-auto"
              style={{
                background: 'rgba(12,22,38,0.82)',
                backdropFilter: 'blur(28px) saturate(160%)',
                border: '1px solid rgba(111,180,255,0.22)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 40px rgba(0,0,0,0.35)',
              }}
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="relative" style={{ width: 26, height: 26, flexShrink: 0 }}>
                <div
                  className="absolute inset-0 rounded-full animate-spin"
                  style={{
                    border: '2px solid rgba(111,180,255,0.15)',
                    borderTopColor: '#6fb4ff',
                    boxShadow: '0 0 12px rgba(111,180,255,0.15)',
                  }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '2px solid transparent',
                    borderTopColor: '#ffd9a0',
                    animation: 'save-spin 1.6s linear infinite',
                  }}
                />
              </div>
              <div>
                <div className="text-sm" style={{ color: 'var(--text-primary)' }}>正在整理这段对话…</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  AI 正在把我们的对话整理成一条记忆
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save preview modal */}
      <AnimatePresence>
        {saveModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSaveModal(null)}
          >
            <motion.div
              className="w-full max-w-lg rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-elevated)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>📌 预览保存内容</span>
                <button onClick={() => setSaveModal(null)} className="p-1 rounded cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>✕</button>
              </div>
              <div className="p-4">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-64 rounded-lg p-3 text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                />
              </div>
              <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-default)' }}>
                <button onClick={() => setSaveModal(null)} className="px-4 py-1.5 rounded-lg text-sm cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  取消
                </button>
                <motion.button
                  onClick={handleConfirmSave}
                  className="px-4 py-1.5 rounded-2xl text-sm cursor-pointer relative overflow-visible"
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
                    scale: 0.96,
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,217,160,0.40) 0%, rgba(111,180,255,0.20) 50%, rgba(111,180,255,0.08) 100%)',
                    color: '#ffd9a0',
                    borderColor: 'rgba(255,217,160,0.35)',
                    boxShadow: '0 0 40px rgba(255,217,160,0.30), 0 0 80px rgba(111,180,255,0.15)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  💾 确认保存
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              className="rounded-xl p-6"
              style={{ background: 'var(--bg-elevated)', width: 360, boxShadow: 'var(--shadow-modal)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>确认删除</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>删除后无法恢复</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  取消
                </button>
                <button
                  onClick={() => handleDeleteSession(deleteConfirm)}
                  disabled={deleting === deleteConfirm}
                  className="px-4 py-2 rounded-lg text-sm text-white cursor-pointer disabled:opacity-50"
                  style={{ background: '#ef4444' }}
                >
                  {deleting === deleteConfirm ? '删除中...' : '确认删除'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
