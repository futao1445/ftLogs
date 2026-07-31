'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useRipples } from './useRipples';

/* ─── NIGHT POND 水风格确认弹窗 ───
 * 替换浏览器原生 confirm()（futao 第六轮①：删除弹窗要专属设计，不要标准弹窗）
 *
 * 设计语言（miky 定稿，10 色体系）：
 * - 遮罩：深海夜 60% + 底部涟漪环（抽象水纹，非生物 SVG）
 * - 卡片：中层水→近水面渐变 + 玻璃雾边框 + 左上角水面高光条（晨光波光）
 * - 删除按钮：月金描边，触发 0.65s 水波涟漪（useRipples 同一套参数）
 * - 弹簧入场 cubic-bezier(0.34,1.56,0.64,1)，卡片浮起 + 涟漪扩散
 *
 * 用法：
 *   const [confirmId, setConfirmId] = useState<number | null>(null);
 *   ...
 *   <PondConfirmModal
 *     open={confirmId !== null}
 *     title="沉入水底？"
 *     message="这篇日记删除后无法找回"
 *     confirmText="确认删除"
 *     onCancel={() => setConfirmId(null)}
 *     onConfirm={() => { api.diaryDelete([confirmId]); setConfirmId(null); }}
 *   />
 */

interface PondConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PondConfirmModal({
  open,
  title,
  message,
  confirmText = '确认删除',
  cancelText = '再想想',
  onConfirm,
  onCancel,
}: PondConfirmModalProps) {
  const ripple = useRipples();

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  // 背景滚动锁定
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ background: 'rgba(12,22,38,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
        >
          {/* 遮罩底层涟漪环（抽象水纹） */}
          <motion.div
            className="pointer-events-none absolute rounded-full"
            style={{
              width: 260,
              height: 260,
              border: '1px solid rgba(111,180,255,0.18)',
              boxShadow: '0 0 0 18px rgba(111,180,255,0.05), 0 0 0 42px rgba(111,180,255,0.03)',
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            className="relative w-full max-w-[400px] rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #172a45 0%, #21395c 55%, #2d4a75 100%)',
              border: '1px solid rgba(74,106,148,0.55)',
              boxShadow: '0 8px 32px rgba(2,8,20,0.6), 0 0 24px rgba(111,180,255,0.08)',
            }}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 左上角水面高光条（晨光波光） */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: 'linear-gradient(90deg, rgba(168,208,255,0.7), rgba(255,217,160,0.35), transparent)' }}
            />
            {/* 底部水雾渐变 */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(12,22,38,0.18))' }}
            />

            <div className="relative p-6">
              {/* 标题：月金 + 涟漪 */}
              <div className="flex items-center gap-2.5 mb-1">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--gold, #ffd9a0)', boxShadow: '0 0 8px rgba(255,217,160,0.6)' }}
                  animate={{ opacity: [1, 0.4, 1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="text-[11px] tracking-[2px]" style={{ color: 'var(--gold, #ffd9a0)' }}>
                  水面之下
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary, #e2ecfa)' }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary, #8fa6c4)' }}>
                {message}
              </p>

              {/* 按钮区：取消 = 近水面玻璃 / 确认 = 月金描边 + 涟漪 */}
              <div className="flex gap-3">
                <motion.button
                  onClick={onCancel}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style={{
                    background: 'rgba(111,180,255,0.08)',
                    border: '1px solid rgba(74,106,148,0.5)',
                    color: 'var(--text-secondary, #8fa6c4)',
                  }}
                  whileHover={{ background: 'rgba(111,180,255,0.16)', color: '#a8d0ff' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  onPointerDown={ripple.add}
                  className="relative flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,217,160,0.14), rgba(255,217,160,0.05))',
                    border: '1px solid rgba(255,217,160,0.5)',
                    color: 'var(--gold, #ffd9a0)',
                  }}
                  whileHover={{ background: 'linear-gradient(135deg, rgba(255,217,160,0.22), rgba(255,217,160,0.08))' }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                >
                  {ripple.render()}
                  {confirmText}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
