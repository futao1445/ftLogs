'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Diary, TimelineGroup } from '../../lib/types';

/* ─── Spring constants (池塘涟漪语言) ─── */
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 22 };

/* ─── 当前主题（跟随 [data-theme]）─── */
function useTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const read = () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/* ─── 水波涟漪 ─── */
interface Ripple { id: number; x: number; y: number; }

/* ─── 文案截断 ─── */
function excerpt(content: string, len = 46): string {
  const plain = content.replace(/[#>*`\-\n]/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > len ? plain.slice(0, len) + '…' : plain;
}

/* ─── 记忆卡（层叠栈的一层） ─── */

function MemoryCard({
  diary,
  depth,
  onEdit,
  onTop,
  dragProps,
}: {
  diary: Diary;
  depth: 0 | 1 | 2; // 0 = 最深（沉底），2 = 最前（玻璃）
  onEdit?: (d: Diary) => void;
  onTop?: () => void;
  dragProps?: {
    drag: 'x';
    dragConstraints: { left: number; right: number };
    dragElastic: number;
    onDragStart: () => void;
    onDragEnd: (e: unknown, info: { offset: { x: number } }) => void;
  };
}) {
  const dateLabel = (diary.date || '').slice(0, 10).slice(5).replace('-', '/');

  // 后暗前亮：深度 0 最暗贴底，深度 2 最亮玻璃
  // 亮色模式跟随 token（futao 修改⑤-5：合理调色非反转）
  const theme = useTheme();
  const layerStyle =
    theme === 'dark'
      ? depth === 0
        ? {
            background:
              'linear-gradient(160deg, rgba(33,57,92,0.85) 0%, rgba(23,42,69,0.95) 100%)',
            border: '1px solid rgba(45,74,117,0.35)',
          }
        : depth === 1
        ? {
            background:
              'linear-gradient(155deg, rgba(74,106,148,0.50) 0%, rgba(33,57,92,0.90) 100%)',
            border: '1px solid rgba(74,106,148,0.30)',
            backdropFilter: 'blur(16px)',
          }
        : {
            background:
              'linear-gradient(150deg, rgba(74,106,148,0.42) 0%, rgba(33,57,92,0.62) 100%)',
            border: '1px solid rgba(168,208,255,0.22)',
            backdropFilter: 'blur(28px) saturate(160%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.12), 0 32px 80px rgba(2,8,20,0.5)',
          }
      // 亮色：晨光玻璃（浅水影卡，保留层叠）
      : depth === 0
      ? {
          background:
            'linear-gradient(160deg, #c9d9ec 0%, #dfe9f5 100%)',
          border: '1px solid rgba(88,112,143,0.30)',
        }
      : depth === 1
      ? {
          background:
            'linear-gradient(155deg, #e8f1fa 0%, #d3e2f2 100%)',
          border: '1px solid rgba(88,112,143,0.25)',
          backdropFilter: 'blur(16px)',
        }
      : {
          background:
            'linear-gradient(150deg, #ffffff 0%, #eef4fb 100%)',
          border: '1px solid rgba(63,139,212,0.25)',
          backdropFilter: 'blur(28px) saturate(160%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.9), 0 32px 80px rgba(63,91,124,0.22)',
        };

  // 错落堆叠：每层轻微旋转 + 偏移
  const pose =
    depth === 0
      ? { rotate: -3, x: -10, y: 4 }
      : depth === 1
      ? { rotate: 1.6, x: 6, y: 2 }
      : { rotate: 0, x: 0, y: 0 };

  // hover 时旋转回正 + 浮起
  const hoverPose =
    depth === 0 ? { rotate: -1, y: -8 } : depth === 1 ? { rotate: 0.5, y: -8 } : { rotate: 0, y: -6 };

  return (
    <motion.div
      className="absolute rounded-[22px] overflow-hidden"
      style={{ inset: 0, ...layerStyle }}
      initial={{ opacity: 0, y: 60, scale: 0.94, rotate: pose.rotate, x: pose.x }}
      animate={{ opacity: 1, y: pose.y, scale: 1, rotate: pose.rotate, x: pose.x }}
      transition={{ ...SPRING, delay: 0.25 + depth * 0.2 }}
      whileHover={{ ...hoverPose, scale: 1.02 }}
      {...dragProps}
    >
      <div
        className="h-full flex flex-col cursor-pointer"
        style={{ padding: depth === 2 ? '22px 24px' : '20px 22px' }}
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(diary);
        }}
        title="点击编辑"
      >
        <div
          className="mb-3 text-[10px] tracking-[2px] uppercase"
          style={{ color: theme === 'light' ? '#7c91ad' : 'rgba(143,166,196,0.7)' }}
        >
          Memory · {dateLabel}
        </div>
        <div className="text-sm mb-2" style={{ color: 'var(--text-primary)', fontWeight: 400, lineHeight: 1.7 }}>
          {excerpt(diary.content, depth === 2 ? 60 : 44)}
        </div>
        {depth === 2 && (
          <div className="mt-auto flex items-center justify-between" style={{ paddingTop: 8 }}>
            {diary.mood && (
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                心情 {diary.mood}
              </span>
            )}
            {/* 右下角：回到第一张（回到水面 = 回最新一张/首页） */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onTop?.();
              }}
              className="flex items-center gap-1 text-[11px] cursor-pointer relative"
              style={{ color: theme === 'light' ? '#7c91ad' : 'rgba(143,166,196,0.85)', border: 'none', background: 'transparent', padding: '2px 4px' }}
              whileHover={{ color: theme === 'light' ? '#3f8bd4' : '#a8d0ff' }}
              whileTap={{ scale: 0.9, color: theme === 'light' ? '#b9852f' : '#ffd9a0' }}
              transition={SPRING}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 11l4-4 4 4" />
                <path d="M8 17l4-4 4 4" />
              </svg>
              <span>回到水面</span>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── 主组件：池塘首屏 ─── */

export default function PondHero({
  groups,
  totalCount,
  streak,
  onWrite,
  onEditDiary,
  onScrollToTimeline,
}: {
  groups: TimelineGroup[];
  totalCount: number;
  streak: number;
  onWrite?: () => void;
  onEditDiary?: (d: Diary) => void;
  onScrollToTimeline?: () => void;
}) {
  const theme = useTheme();
  // 亮色模式 hero 文案色（合理调色：深墨水蓝 + 水光蓝，非反转）
  const heroText = theme === 'light'
    ? { heading: '#1c2f4a', sub: '#58708f', meta: '#3f8bd4', gold: '#b9852f' }
    : { heading: '#e2ecfa', sub: '#8fa6c4', meta: '#6fb4ff', gold: '#ffd9a0' };
  // 全部日记（时间新→旧），轮播数据源
  const allDiaries = useMemo(() => {
    const flat: Diary[] = [];
    for (const g of groups) {
      for (const d of g.diaries) flat.push(d);
    }
    return flat;
  }, [groups]);

  // 当前置顶卡片在 allDiaries 中的下标（0 = 最新/第一张）
  const [index, setIndex] = useState(0);
  const clamped = Math.min(index, Math.max(allDiaries.length - 1, 0));
  const current = clamped;
  const isFirst = current === 0;
  const isLast = current >= allDiaries.length - 1;

  // 层叠栈：前置卡 + 后两张（沉底记忆）
  const stack: (Diary | null)[] = [
    allDiaries[current] || null,
    allDiaries[current + 1] || null,
    allDiaries[current + 2] || null,
  ];

  // 手势阈值
  const DRAG_THRESHOLD = 60;

  // 拖拽后抑制 click（防止滑完误开编辑）
  const draggedRef = useRef(false);

  // 水波涟漪
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useMemo(() => {
    let n = 0;
    return () => ++n;
  }, []);
  const addRipple = (e: React.PointerEvent) => {
    const id = rippleId();
    const rect = e.currentTarget.getBoundingClientRect();
    setRipples((r) => [
      ...r,
      { id, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 },
    ]);
  };
  const removeRipple = (id: number) => setRipples((r) => r.filter((x) => x.id !== id));

  // 切卡：n=+1 往后翻（更旧），n=-1 往前翻（更新）
  const go = (n: number) => {
    setIndex((i) => {
      const next = i + n;
      if (next < 0) return 0;
      if (next >= allDiaries.length) return Math.max(allDiaries.length - 1, 0);
      return next;
    });
  };

  // 点击编辑（抑制拖拽后的误触 click）
  const handleEditDiary = (d: Diary) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onEditDiary?.(d);
  };

  return (
    <section className="relative overflow-hidden">
      {/* 月光层（右上） */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 82% -8%, rgba(168,208,255,0.10) 0%, transparent 46%), radial-gradient(ellipse at 18% 112%, rgba(111,180,255,0.05) 0%, transparent 42%)',
        }}
      />

      <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-12">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          style={{ padding: '96px 0 120px' }}
        >
          {/* ── 左侧文案 ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.1 }}
              className="mb-6 text-[11px] tracking-[4px] uppercase"
              style={{ color: heroText.meta }}
            >
              Night Pond · {new Date().getFullYear()}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.16 }}
              className="text-4xl lg:text-5xl font-light leading-[1.15] tracking-[2px] mb-7"
              style={{ color: heroText.heading }}
            >
              夜深了
              <br />
              把心事<span style={{ color: heroText.meta, fontWeight: 400 }}>交给月光</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.22 }}
              className="text-base font-light leading-[1.9] mb-12 max-w-[42ch]"
              style={{ color: heroText.sub }}
            >
              水面之下是沉底的回忆，水面之上是和 AI 的轻声对话。
              把今天写下来，让它浮出水面。
            </motion.p>

            {/* 统计 + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.28 }}
              className="flex items-center gap-8 mb-12"
            >
              {totalCount > 0 && (
                <div>
                  <div className="text-2xl font-light" style={{ color: heroText.heading }}>{totalCount}</div>
                  <div className="text-xs mt-1" style={{ color: heroText.sub }}>篇日记</div>
                </div>
              )}
              {streak > 0 && (
                <div>
                  <div className="text-2xl font-light" style={{ color: heroText.heading }}>{streak}</div>
                  <div className="text-xs mt-1" style={{ color: heroText.sub }}>天连续</div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.34 }}
              className="flex gap-4"
            >
              <motion.button
                onClick={onWrite}
                onPointerDown={addRipple}
                className="relative overflow-visible px-8 py-4 rounded-full text-sm font-semibold tracking-wide cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #6fb4ff, #a8d0ff)',
                  color: '#0a1626',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 12px 34px rgba(111,180,255,0.22)',
                  border: 'none',
                }}
                whileHover={{ y: -2, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 18px 44px rgba(111,180,255,0.32)' }}
                whileTap={{ scale: 0.96, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(111,180,255,0.2)' }}
                transition={SPRING}
              >
                {ripples.map((r) => (
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
                      boxShadow: '0 0 8px rgba(255,217,160,0.45)',
                    }}
                    initial={{ scale: 0.35, opacity: 0.9 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
                    onAnimationComplete={() => removeRipple(r.id)}
                  />
                ))}
                写一篇日记
              </motion.button>
              <button
                onClick={onScrollToTimeline}
                className="px-8 py-4 rounded-full text-sm tracking-wide cursor-pointer"
                style={{
                  background: theme === 'light' ? 'rgba(220,231,243,0.7)' : 'rgba(33,57,92,0.35)',
                  border: `1px solid ${theme === 'light' ? 'rgba(88,112,143,0.35)' : 'rgba(45,74,117,0.6)'}`,
                  color: heroText.sub,
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = heroText.heading;
                  e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(88,112,143,0.6)' : '#2d4a75';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = heroText.sub;
                  e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(88,112,143,0.35)' : 'rgba(45,74,117,0.6)';
                }}
              >
                翻看日记 ↓
              </button>
            </motion.div>
          </div>

          {/* ── 右侧层叠卡片场景 ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative h-[540px] flex items-center justify-center"
          >
            {/* 涟漪环背景装饰 */}
            <div className="absolute w-[420px] h-[420px] pointer-events-none" style={{ maxWidth: '90%' }}>
              {[0, 1.8, 3.6].map((delay, i) => (
                <span
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '1px solid rgba(168,208,255,0.07)',
                    animation: `ripple-expand 7s cubic-bezier(0.22, 1.28, 0.42, 1) ${delay}s infinite`,
                  }}
                />
              ))}
            </div>

            {/* 卡片堆叠：前卡玻璃 → 后卡沉底；stack[0] 最新最前（futao 修改⑤-1：置顶=最新） */}
            <div className="relative w-[400px] h-[520px] max-w-[92%]" style={{ perspective: 1000 }}>
              {stack.map((d, i) => {
                // depth: 0=沉底最暗, 2=玻璃最前 —— 最新卡(stack[0])必须在最前
                const depth = (2 - i) as 0 | 1 | 2;
                return (
                  <div
                    key={d ? `diary-${d.id}` : `placeholder-${i}`}
                    className="absolute rounded-[22px]"
                    style={{
                      inset: 0,
                      zIndex: depth + 1,
                      transform: `translateY(${depth * 2}px)`,
                    }}
                  >
                    {d ? (
                      <MemoryCard
                        diary={d}
                        depth={depth}
                        onEdit={handleEditDiary}
                        onTop={() => setIndex(0)}
                        dragProps={
                          depth === 2 && allDiaries.length > 1
                            ? {
                                drag: 'x',
                                dragConstraints: { left: 0, right: 0 },
                                dragElastic: 0.15,
                                onDragStart: () => { draggedRef.current = true; },
                                onDragEnd: (_, info) => {
                                  if (info.offset.x <= -DRAG_THRESHOLD) go(1);
                                  else if (info.offset.x >= DRAG_THRESHOLD) go(-1);
                                  // 延迟清除抑制标记，等 click 事件过去
                                  setTimeout(() => { draggedRef.current = false; }, 100);
                                },
                              }
                            : undefined
                        }
                      />
                    ) : (
                      <motion.div
                        className="absolute rounded-[22px]"
                        style={{
                          inset: 0,
                          background:
                            'linear-gradient(160deg, rgba(33,57,92,0.6) 0%, rgba(23,42,69,0.9) 100%)',
                          border: '1px solid rgba(45,74,117,0.3)',
                          ...(depth === 0 ? { transform: 'rotate(-3deg)' } : {}),
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="h-full flex flex-col items-center justify-center gap-3">
                          {/* 抽象水波环（不用 emoji，守住 10 色纪律） */}
                          <span className="relative w-10 h-10">
                            <span
                              className="absolute inset-0 rounded-full"
                              style={{ border: '1px solid rgba(168,208,255,0.2)' }}
                            />
                            <span
                              className="absolute inset-1 rounded-full"
                              style={{ border: '1px solid rgba(111,180,255,0.18)' }}
                            />
                            <span
                              className="absolute inset-2.5 rounded-full"
                              style={{ background: 'rgba(168,208,255,0.10)' }}
                            />
                          </span>
                          <span className="text-xs" style={{ color: theme === 'light' ? 'rgba(124,145,173,0.8)' : 'rgba(143,166,196,0.6)' }}>
                            {depth === 0 ? '沉底的回忆' : depth === 1 ? '浮起的水面' : '等你写下今天'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}

              {/* 底部指示：页码点 */}
              {allDiaries.length > 1 && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <span className="text-[10px] tracking-[2px] uppercase" style={{ color: theme === 'light' ? '#7c91ad' : 'rgba(143,166,196,0.5)' }}>
                    {current + 1} / {allDiaries.length}
                  </span>
                </div>
              )}
            </div>

            {/* 置顶 / 左右切换辅助按钮（桌面 hover 可见，移动端常显） */}
            {allDiaries.length > 1 && (
              <div className="absolute bottom-0 right-4 flex items-center gap-2">
                <button
                  onClick={() => go(-1)}
                  disabled={isFirst}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30"
                  style={{
                    background: theme === 'light' ? 'rgba(220,231,243,0.8)' : 'rgba(33,57,92,0.45)',
                    border: `1px solid ${theme === 'light' ? 'rgba(88,112,143,0.3)' : 'rgba(45,74,117,0.6)'}`,
                    color: heroText.sub,
                    backdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = heroText.heading; e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(88,112,143,0.55)' : '#2d4a75'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = heroText.sub; e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(88,112,143,0.3)' : 'rgba(45,74,117,0.6)'; }}
                  title="上一张"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => go(1)}
                  disabled={isLast}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30"
                  style={{
                    background: theme === 'light' ? 'rgba(220,231,243,0.8)' : 'rgba(33,57,92,0.45)',
                    border: `1px solid ${theme === 'light' ? 'rgba(88,112,143,0.3)' : 'rgba(45,74,117,0.6)'}`,
                    color: heroText.sub,
                    backdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = heroText.heading; e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(88,112,143,0.55)' : '#2d4a75'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = heroText.sub; e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(88,112,143,0.3)' : 'rgba(45,74,117,0.6)'; }}
                  title="下一张"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
                <button
                  onClick={() => setIndex(0)}
                  disabled={isFirst}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30"
                  style={{
                    background: theme === 'light' ? 'rgba(220,231,243,0.8)' : 'rgba(33,57,92,0.45)',
                    border: `1px solid ${theme === 'light' ? 'rgba(88,112,143,0.3)' : 'rgba(45,74,117,0.6)'}`,
                    color: heroText.sub,
                    backdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme === 'light' ? '#b9852f' : '#ffd9a0'; e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(185,133,47,0.5)' : 'rgba(255,217,160,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = heroText.sub; e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(88,112,143,0.3)' : 'rgba(45,74,117,0.6)'; }}
                  title="回到第一张"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 11l4-4 4 4" />
                    <path d="M8 17l4-4 4 4" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 关键帧：涟漪环扩散 */}
      <style>{`
        @keyframes ripple-expand {
          0%   { transform: scale(0.35); opacity: 0; }
          30%  { opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
