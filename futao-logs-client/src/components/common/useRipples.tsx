'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/* ─── 水波涟漪 hook：点击处一圈圈月金闪光扩散（池塘涟漪通用交互） ───
 *
 * 用法：
 *   const ripple = useRipples();
 *   <motion.button onPointerDown={ripple.add} ...whileTap/whileHover>
 *     {ripple.render()}
 *     ...
 *   </motion.button>
 *
 * 涟漪参数与 TreeholePage 发送按钮 / PondHero CTA 同一套（miky 定稿）：
 * 14px 起始 → scale 2.4 扩散 → 0.65s 消散，月金描边 2px/0.7 + 微金色填充。
 */

interface Ripple { id: number; x: number; y: number; }

export function useRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);

  const add = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const id = ++idRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setRipples((prev) => [...prev, { id, x, y }]);
  }, []);

  const remove = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const render = useCallback(() => {
    return ripples.map((r) => (
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
          zIndex: 20,
        }}
        initial={{ scale: 0.35, opacity: 0.9 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
        onAnimationComplete={() => remove(r.id)}
      />
    ));
  }, [ripples, remove]);

  return { add, render };
}
