'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Diary, TimelineGroup } from '../../lib/types';

/* ─── Spring constants (池塘涟漪语言) ─── */
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 22 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 120, damping: 20 };

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
  onOpen,
}: {
  diary: Diary;
  depth: 0 | 1 | 2; // 0 = 最深（沉底），2 = 最前（玻璃）
  onOpen?: (d: Diary) => void;
}) {
  const dateLabel = diary.date.slice(5).replace('-', '/');

  // 后暗前亮：深度 0 最暗贴底，深度 2 最亮玻璃
  const layerStyle =
    depth === 0
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
      className="absolute rounded-[22px] cursor-pointer overflow-hidden"
      style={{ inset: 0, ...layerStyle }}
      initial={{ opacity: 0, y: 60, scale: 0.94, rotate: pose.rotate, x: pose.x }}
      animate={{ opacity: 1, y: pose.y, scale: 1, rotate: pose.rotate, x: pose.x }}
      transition={{ ...SPRING, delay: 0.25 + depth * 0.2 }}
      whileHover={{ ...hoverPose, scale: 1.02 }}
      onClick={() => onOpen?.(diary)}
    >
      <div className="h-full flex flex-col" style={{ padding: depth === 2 ? '22px 24px' : '20px 22px' }}>
        <div
          className="mb-3 text-[10px] tracking-[2px] uppercase"
          style={{ color: 'rgba(143,166,196,0.7)' }}
        >
          Memory · {dateLabel}
        </div>
        <div
          className="text-sm mb-2"
          style={{
            color: depth === 2 ? 'var(--text-primary)' : 'var(--text-primary)',
            fontWeight: 400,
            lineHeight: 1.7,
          }}
        >
          {excerpt(diary.content, depth === 2 ? 60 : 44)}
        </div>
        {depth === 2 && diary.mood && (
          <div className="mt-auto flex items-center justify-between">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              心情 {diary.mood}
            </span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#a8d0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
            </svg>
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
  onOpenDiary,
}: {
  groups: TimelineGroup[];
  totalCount: number;
  streak: number;
  onWrite?: () => void;
  onOpenDiary?: (d: Diary) => void;
}) {
  // 从时间线取最近 3 篇真实日记（深→浅，时间新的在前层）
  const recent = useMemo(() => {
    const flat: Diary[] = [];
    for (const g of groups) {
      for (const d of g.diaries) flat.push(d);
      if (flat.length >= 3) break;
    }
    return flat.slice(0, 3);
  }, [groups]);

  // 补齐到 3 张卡（不足时用占位，保持层叠结构）
  const stack: (Diary | null)[] = [recent[2] || null, recent[1] || null, recent[0] || null];

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

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          style={{ padding: '88px 0 120px' }}
        >
          {/* ── 左侧文案 ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.1 }}
              className="mb-6 text-[11px] tracking-[4px] uppercase"
              style={{ color: '#6fb4ff' }}
            >
              Night Pond · {new Date().getFullYear()}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.16 }}
              className="text-4xl lg:text-5xl font-light leading-[1.15] tracking-[2px] mb-7"
              style={{ color: '#e2ecfa' }}
            >
              夜深了
              <br />
              把心事<span style={{ color: '#a8d0ff', fontWeight: 400 }}>交给月光</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.22 }}
              className="text-base font-light leading-[1.9] mb-12 max-w-[42ch]"
              style={{ color: '#8fa6c4' }}
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
                  <div className="text-2xl font-light" style={{ color: '#e2ecfa' }}>{totalCount}</div>
                  <div className="text-xs mt-1" style={{ color: '#8fa6c4' }}>篇日记</div>
                </div>
              )}
              {streak > 0 && (
                <div>
                  <div className="text-2xl font-light" style={{ color: '#e2ecfa' }}>{streak}</div>
                  <div className="text-xs mt-1" style={{ color: '#8fa6c4' }}>天连续</div>
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
                className="px-8 py-4 rounded-full text-sm tracking-wide cursor-pointer"
                style={{
                  background: 'rgba(33,57,92,0.35)',
                  border: '1px solid rgba(45,74,117,0.6)',
                  color: '#8fa6c4',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#e2ecfa';
                  e.currentTarget.style.borderColor = '#2d4a75';
                  e.currentTarget.style.background = 'rgba(33,57,92,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8fa6c4';
                  e.currentTarget.style.borderColor = 'rgba(45,74,117,0.6)';
                  e.currentTarget.style.background = 'rgba(33,57,92,0.35)';
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

            {/* 卡片堆叠：后暗前亮 */}
            <div className="relative w-[400px] h-[520px] max-w-[92%]" style={{ perspective: 1000 }}>
              {stack.map((d, i) => {
                const depth = i as 0 | 1 | 2;
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
                      <MemoryCard diary={d} depth={depth} onOpen={onOpenDiary} />
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
                        <div className="h-full flex flex-col items-center justify-center">
                          <span className="text-2xl mb-3" style={{ opacity: 0.5 }}>🪷</span>
                          <span className="text-xs" style={{ color: 'rgba(143,166,196,0.6)' }}>
                            {depth === 0 ? '沉底的回忆' : depth === 1 ? '浮起的水面' : '等你写下今天'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
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
