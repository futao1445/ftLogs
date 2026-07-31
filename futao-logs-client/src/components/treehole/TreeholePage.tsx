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

const GREETING = '嗨，我是你的 AI 树洞 🤗\n我可以看到你的日记、知识图谱和整个知识库。\n要不要试试这些？';

export default function TreeholePage() {
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

  /* ── Select session ── */
  const handleSelectSession = useCallback(async (id: number) => {
    setActiveSessionId(id);
    await loadMessages(id);
  }, [loadMessages]);

  /* ── Save session to knowledge base ── */
  const handleSaveSession = useCallback(async (sessionId: number) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      // First get AI summary of the conversation
      const summaryResult = await api.treeholeSummarizeSession(sessionId);
      let content: string;
      if (summaryResult.success && summaryResult.summary) {
        content = summaryResult.summary;
      } else {
        // Fallback: concatenate raw messages
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="flex h-full gap-3 py-3">
        {/* ─── Left: Session list ─── */}
        <div
          className="w-36 sm:w-44 flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
        >
          {/* Knowledge base entry — 玻璃雾水光 */}
          <motion.button
            onClick={() => setShowKnowledge(true)}
            className="flex items-center justify-center gap-1.5 py-2 mx-2 mt-2 rounded-2xl text-xs cursor-pointer relative overflow-visible"
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
            📚 知识库
          </motion.button>

          <div className="p-2 border-b mt-2" style={{ borderColor: 'var(--border-default)' }}>
            <motion.button
              onClick={handleNewSession}
              className="w-full py-1.5 rounded-2xl text-xs font-medium cursor-pointer relative overflow-visible"
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
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
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
                    onClick={() => handleSelectSession(s.id)}
                    className="w-full text-left px-2 py-2 rounded-lg text-xs transition-all pr-14 cursor-pointer"
                    style={{
                      background: activeSessionId === s.id ? 'var(--accent-soft)' : 'transparent',
                      color: activeSessionId === s.id ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseLeave={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="truncate font-medium">{s.title}</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{sessionTime(s.updatedAt)}</div>
                  </button>
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
                </motion.div>
              ))}
            </AnimatePresence>
            {sessions.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-tertiary)' }}>暂无对话</p>
            )}
          </div>
        </div>

        {/* ─── Right: Chat area (玻璃前景对话卡 — pond-premium card-chat) ─── */}
        <div
          className="flex-1 rounded-xl overflow-hidden flex flex-col"
          style={{
            background:
              'linear-gradient(150deg, rgba(74,106,148,0.42) 0%, rgba(33,57,92,0.62) 100%)',
            border: '1px solid rgba(168,208,255,0.22)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04), 0 32px 80px rgba(2,8,20,0.5)',
          }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  {/* AI greeting — 玻璃雾浮起气泡 */}
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
                      <p style={{ whiteSpace: 'pre-wrap' }}>{GREETING}</p>
                    </div>
                  </motion.div>
                  {/* Guide chips — 玻璃雾水滴 */}
                  <motion.div
                    className="flex flex-wrap gap-2 pl-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.15 }}
                  >
                    {bubbles.map((g) => (
                      <motion.button
                        key={g}
                        onClick={() => handleGuideClick(g)}
                        className="text-xs cursor-pointer relative inline-flex items-center gap-1.5"
                        style={{
                          padding: '2px 18px 2px 14px',
                          borderRadius: '30px 30px 30px 4px',
                          background: 'linear-gradient(135deg, rgba(74,106,148,0.30) 0%, rgba(23,42,69,0.35) 100%)',
                          border: '1px solid rgba(74,106,148,0.40)',
                          color: 'var(--text-secondary)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                        }}
                        whileHover={{
                          background: 'linear-gradient(135deg, rgba(111,180,255,0.18) 0%, rgba(74,106,148,0.30) 100%)',
                          borderColor: 'rgba(168,208,255,0.45)',
                          color: '#a8d0ff',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(111,180,255,0.15)',
                        }}
                        whileTap={{
                          scale: 0.96,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      >
                        <span
                          className="inline-block rounded-full"
                          style={{
                            width: '5px', height: '5px',
                            background: '#6fb4ff',
                            boxShadow: '0 0 5px rgba(111,180,255,0.6)',
                          }}
                        />
                        {g}
                      </motion.button>
                    ))}
                    <motion.button
                      onClick={() => setBubbles(pickRandomBubbles(4))}
                      className="px-2 py-1.5 rounded-full text-xs cursor-pointer"
                      style={{ color: 'var(--text-tertiary)' }}
                      whileHover={{
                        color: 'var(--text-secondary)',
                        boxShadow: '0 0 10px rgba(111,180,255,0.10)',
                      }}
                      whileTap={{
                        scale: 0.94,
                        backgroundColor: 'rgba(111,180,255,0.15)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    >
                      🔄 换一批
                    </motion.button>
                  </motion.div>
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
                  className="rounded-2xl px-4 py-3"
                  style={{
                    background: 'rgba(74,106,148,0.28)',
                    border: '1px solid rgba(168,208,255,0.35)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="typing-dots">...</span>
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
