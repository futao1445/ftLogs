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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group cursor-pointer rounded-xl border p-4 transition-all duration-200"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onClick={() => onEdit?.(diary)}
    >
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
      <div className="flex items-center justify-between mt-3" style={{ height: 28 }}>
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
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={(e) => { e.stopPropagation(); onEdit?.(diary); }}
            title="编辑"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
          <button
            className="p-1 rounded transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={(e) => { e.stopPropagation(); onDelete?.(diary.id); }}
            title="删除"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
