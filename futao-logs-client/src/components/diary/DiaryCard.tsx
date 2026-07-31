'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Diary } from '../../lib/types';

interface DiaryCardProps {
  diary: Diary;
  onEdit?: (diary: Diary) => void;
  onDelete?: (id: number) => void;
}

export default function DiaryCard({ diary, onEdit, onDelete }: DiaryCardProps) {
  const [showMore, setShowMore] = useState(false);

  const content = diary.content || '';
  const plainText = content.replace(/[#*`\[\]>|~]/g, '');
  const isLong = plainText.length > 120;
  const previewText = isLong && !showMore ? plainText.slice(0, 120) + '…' : plainText;

  const hasAttachments = diary.attachments && diary.attachments.length > 0;

  const moodEmoji: Record<string, string> = {
    calm: '🌿', happy: '😊', sad: '😢', fire: '🔥', idea: '💡', sparkle: '✨',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      whileHover={{
        y: -8,
        scale: 1.01,
        borderColor: 'rgba(111,180,255,0.35)',
        boxShadow: '0 8px 28px rgba(2,8,20,0.5), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 24px rgba(111,180,255,0.08)',
      }}
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer rounded-xl border p-4 transition-colors relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(33,57,92,0.45) 0%, var(--bg-secondary) 55%)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
      onClick={() => onEdit?.(diary)}
    >
      {/* 玻璃雾高光 — 卡片上层浮起感 */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,208,255,0.35), transparent)' }}
      />
      {/* Top: time + mood */}
      <div className="flex items-center justify-between mb-2" style={{ height: 20 }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
          {diary.createdAt ? new Date(diary.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
        </span>
        {diary.mood && (
          <span className="text-sm">{moodEmoji[diary.mood] || '🌿'}</span>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border-default)', marginBottom: 10 }} />

      {/* Content preview — white-space: pre-wrap 保留换行 */}
      <div
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{
          color: 'var(--text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: showMore ? 'unset' : 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {previewText}
      </div>

      {isLong && !showMore && (
        <button
          className="text-xs mt-1 transition-colors"
          style={{ color: 'var(--accent)' }}
          onClick={(e) => { e.stopPropagation(); setShowMore(true); }}
        >
          查看更多 →
        </button>
      )}

      {/* Attachments preview */}
      {hasAttachments && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {diary.attachments.slice(0, 3).map((att) => (
            <div
              key={att.id}
              className="flex-shrink-0 rounded-lg overflow-hidden"
              style={{ width: 60, height: 60, background: 'var(--bg-tertiary)' }}
            >
              {att.mimeType?.startsWith('image/') ? (
                <img
                  src={att.filepath}
                  alt={att.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  📎
                </div>
              )}
            </div>
          ))}
          {diary.attachments.length > 3 && (
            <div
              className="flex-shrink-0 rounded-lg flex items-center justify-center text-xs"
              style={{ width: 60, height: 60, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              +{diary.attachments.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Bottom: tags + actions */}
      <div className="flex items-center justify-between mt-3" style={{ height: 32 }}>
        <div className="flex gap-1.5 overflow-x-auto">
          {diary.tags?.slice(0, 3).map((dt) => (
            <span
              key={dt.tagId}
              className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              #{dt.tag.name}
            </span>
          ))}
        </div>
        {/* futao ⑤：点卡片本身=编辑，去掉独立编辑按钮；删除按钮加大（文案化：删除） */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="px-2.5 py-1 rounded-lg transition-colors text-xs cursor-pointer"
            style={{
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            onClick={(e) => { e.stopPropagation(); onDelete?.(diary.id); }}
            title="删除日记"
          >
            <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </motion.div>
  );
}
