'use client';

import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── 涟漪页 Banner（方向 B · 引导仪式）───
 * futao 需求（msg 6d7db75c + 小恒基线 msg 7416fb1b）：
 * 设计稿涟漪大标签页（涟.漪 字标 + 同心圆图案 + 月光 + 三行文案）未用于真实网页，
 * 合理融入涟漪窗口稍作重构。方向 B：无会话时全幅引导仪式，有会话后收起为顶部窄条。
 *
 * 设计语言（pond-round4-direction.html 页面02 name-panel 基准，miky 定稿）：
 * - 涟漪同心圆：4 圈 radial-gradient 抽象水纹（非生物 SVG）
 * - 月光：右上角月金光晕（gold 径向渐变）
 * - kicker「NIGHT POND · TALK TO THE WATER」月金
 * - 涟.漪：超细字标（200），涟=浪花白 .dot=水光蓝
 * - 三行文案原样：把心里的话，投进水里。水面泛起一圈圈光，有人在水下，静静听。
 *   （投进水里/静静听 用波光蓝高亮）
 */

interface RippleBannerProps {
  /** true = 无会话引导态（全幅仪式）/ false = 有会话（顶部窄条） */
  expanded: boolean;
  bubbles: string[];
  onGuideClick: (text: string) => void;
  onShuffle: () => void;
}

/* 涟漪同心圆（抽象水纹，非手绘 SVG） */
const RINGS: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  background: [
    'radial-gradient(circle, transparent 0 24px, rgba(168,208,255,0.12) 25px, transparent 26px)',
    'radial-gradient(circle, transparent 0 60px, rgba(168,208,255,0.10) 61px, transparent 62px)',
    'radial-gradient(circle, transparent 0 100px, rgba(111,180,255,0.08) 101px, transparent 102px)',
    'radial-gradient(circle, transparent 0 145px, rgba(111,180,255,0.06) 146px, transparent 147px)',
  ].join(','),
};

/* 月光光晕 */
const MOON: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 30%, rgba(255,217,160,0.9), rgba(255,217,160,0.35) 40%, transparent 70%)',
  boxShadow: '0 0 40px rgba(255,217,160,0.45)',
  opacity: 0.7,
};

export default function RippleBanner({ expanded, bubbles, onGuideClick, onShuffle }: RippleBannerProps) {
  return (
    <AnimatePresence mode="wait">
      {expanded ? (
        /* ─── 引导态 · 全幅仪式 banner ─── */
        <motion.div
          key="ripple-banner-full"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative overflow-hidden rounded-2xl mb-3"
          style={{
            padding: '34px 30px 26px',
            textAlign: 'center',
            background: 'linear-gradient(160deg, rgba(23,42,69,0.85) 0%, rgba(33,57,92,0.65) 100%)',
            border: '1px solid rgba(168,208,255,0.16)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(2,8,20,0.35)',
          }}
        >
          {/* 同心圆（居中，背景水纹） */}
          <motion.div
            style={{ ...RINGS, width: 340, height: 340, left: '50%', top: '50%', translateX: '-50%', translateY: '-50%', opacity: 0.7 }}
            animate={{ opacity: [0.55, 0.75, 0.55] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* 月光（右上） */}
          <div style={{ ...MOON, right: '10%', top: 12 }} />

          {/* 文案（相对 z 在图案上层） */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: 4, color: '#ffd9a0', marginBottom: 10 }}>
              NIGHT POND · TALK TO THE WATER
            </div>
            <div style={{ fontSize: 42, fontWeight: 200, letterSpacing: 12, color: '#e2ecfa', lineHeight: 1.1, marginBottom: 14 }}>
              涟<span style={{ color: '#a8d0ff' }}>.</span>漪
            </div>
            <div style={{ fontSize: 13, color: '#8fa6c4', lineHeight: 2, maxWidth: '34ch', margin: '0 auto' }}>
              把心里的话，<b style={{ color: '#a8d0ff', fontWeight: 400 }}>投进水里</b>。<br />
              水面泛起一圈圈光，<br />
              有人在水下，<b style={{ color: '#a8d0ff', fontWeight: 400 }}>静静听</b>。
            </div>

            {/* 引导标签（bubbles，贴合方向稿 tags 样式） */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              {bubbles.map((g) => (
                <motion.button
                  key={g}
                  onClick={() => onGuideClick(g)}
                  className="cursor-pointer"
                  style={{
                    fontSize: 11,
                    letterSpacing: 1,
                    padding: '6px 16px',
                    borderRadius: 999,
                    color: '#ffd9a0',
                    background: 'rgba(255,217,160,0.07)',
                    border: '1px solid rgba(255,217,160,0.22)',
                    whiteSpace: 'nowrap',
                  }}
                  whileHover={{
                    background: 'rgba(255,217,160,0.16)',
                    borderColor: 'rgba(255,217,160,0.5)',
                    boxShadow: '0 0 14px rgba(255,217,160,0.18)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  {g}
                </motion.button>
              ))}
              <motion.button
                onClick={onShuffle}
                className="cursor-pointer"
                style={{ fontSize: 11, padding: '6px 12px', borderRadius: 999, color: 'rgba(143,166,196,0.8)', border: '1px solid rgba(45,74,117,0.5)' }}
                whileHover={{ color: '#8fa6c4', boxShadow: '0 0 10px rgba(111,180,255,0.10)' }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                🔄 换一批
              </motion.button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ─── 会话态 · 顶部窄条 banner（收起版）─── */
        <motion.div
          key="ripple-banner-slim"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-xl mb-2"
          style={{
            padding: '10px 16px',
            background: 'linear-gradient(160deg, rgba(23,42,69,0.7) 0%, rgba(33,57,92,0.5) 100%)',
            border: '1px solid rgba(168,208,255,0.12)',
          }}
        >
          {/* 同心圆（左上小尺寸） */}
          <div style={{ ...RINGS, width: 120, height: 120, left: -30, top: -50, opacity: 0.5 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#ffd9a0', whiteSpace: 'nowrap' }}>
              NIGHT POND · TALK TO THE WATER
            </div>
            <div style={{ fontSize: 16, fontWeight: 200, letterSpacing: 5, color: '#e2ecfa', whiteSpace: 'nowrap' }}>
              涟<span style={{ color: '#a8d0ff' }}>.</span>漪
            </div>
            <div style={{ fontSize: 10, color: 'rgba(143,166,196,0.75)', lineHeight: 1.8, marginLeft: 'auto', textAlign: 'right', maxWidth: '40ch' }}>
              把心里的话，<b style={{ color: 'rgba(168,208,255,0.9)', fontWeight: 400 }}>投进水里</b>。水面泛起一圈圈光，有人在水下，<b style={{ color: 'rgba(168,208,255,0.9)', fontWeight: 400 }}>静静听</b>。
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
