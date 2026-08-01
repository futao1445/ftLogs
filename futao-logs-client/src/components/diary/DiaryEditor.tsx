'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Diary } from '../../lib/types';
import { useRipples } from '../common/useRipples';

// ─── Props ───
interface DiaryEditorProps {
  diary?: Diary | null;
  onSave: (input: {
    content: string;
    date: string;
    mood: string | null;
    tags: number[];
    attachments: File[];
  }) => Promise<void>;
  onClose: () => void;
}

// ─── Mood definitions (matching DiaryCard moodEmoji) ───
const MOODS = [
  { key: 'calm', emoji: '🌿', label: '平静' },
  { key: 'happy', emoji: '😊', label: '开心' },
  { key: 'sad', emoji: '😢', label: '难过' },
  { key: 'fire', emoji: '🔥', label: '热情' },
  { key: 'idea', emoji: '💡', label: '灵感' },
  { key: 'sparkle', emoji: '✨', label: '闪耀' },
] as const;

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dow = DAY_NAMES[d.getDay()];
  return `${y}.${m}.${day} ${dow}`;
}

export default function DiaryEditor({ diary, onSave, onClose }: DiaryEditorProps) {
  // ─── Visibility for exit animation ───
  const [isVisible, setIsVisible] = useState(true);

  // ─── Form state ───
  const [content, setContent] = useState(diary?.content || '');
  // 使用本地日期（避免 toISOString 在凌晨时跳到前一天）
  const today = new Date();
  const localDateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const date = diary?.date || localDateStr;
  const [mood, setMood] = useState<string | null>(diary?.mood || null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    diary?.tags?.map((dt) => dt.tag.id) || [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── 水波涟漪（保存按钮月金扩散） ───
  const ripple = useRipples();

  // ─── Refs ───
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewUrlsRef = useRef<Map<File, string>>(new Map());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ─── Lock body scroll ───
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // ─── Clean up blob URLs ───
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // ─── Get or create preview blob URL ───
  const getPreviewUrl = useCallback((file: File): string => {
    if (!previewUrlsRef.current.has(file)) {
      previewUrlsRef.current.set(file, URL.createObjectURL(file));
    }
    return previewUrlsRef.current.get(file)!;
  }, []);

  // ─── Close (exit animation then callback) ───
  const handleClose = useCallback(() => {
    if (loading) return;
    setIsVisible(false);
    setTimeout(() => onCloseRef.current(), 250);
  }, [loading]);

  // ─── ESC key ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  // ─── Auto-focus textarea ───
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // ─── Toggle tag selection ───
  const toggleTag = useCallback((tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }, []);

  // ─── File select ───
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setNewFiles((prev) => [...prev, ...files]);
      e.target.value = '';
    },
    [],
  );

  // ─── Remove file ───
  const removeFile = useCallback((index: number) => {
    setNewFiles((prev) => {
      const file = prev[index];
      if (file && previewUrlsRef.current.has(file)) {
        URL.revokeObjectURL(previewUrlsRef.current.get(file)!);
        previewUrlsRef.current.delete(file);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // ─── Save ───
  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      await onSave({ content, date, mood, tags: selectedTagIds, attachments: newFiles });
    } finally {
      setLoading(false);
    }
  }, [content, date, mood, selectedTagIds, newFiles, onSave]);

  // ─── Backdrop click ───
  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose],
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdrop}
        >
          <motion.div
            className="relative flex flex-col w-full rounded-xl overflow-hidden"
            style={{
              maxWidth: 640,
              maxHeight: 'calc(100vh - 48px)',
              background: 'var(--bg-elevated)',
              boxShadow: 'var(--shadow-modal)',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ═══════════ Top bar ═══════════ */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b shrink-0 gap-3"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">✏️</span>
                <span
                  className="font-medium truncate"
                  style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-base)' }}
                >
                  {diary ? '编辑日记' : '新日记'}
                </span>
                <span
                  className="shrink-0"
                  style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}
                >
                  {formatDateDisplay(date)}
                </span>
              </div>

              <motion.button
                onClick={handleSave}
                onPointerDown={ripple.add}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium relative overflow-visible shrink-0 disabled:opacity-50 disabled:cursor-not-allowed select-none"
                style={{
                  background: loading
                    ? 'var(--accent-soft)'
                    : 'linear-gradient(135deg, #6fb4ff 0%, #a8d0ff 100%)',
                  color: loading ? 'var(--accent)' : '#0a1626',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(111,180,255,0.18)',
                }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                {!loading && ripple.render()}
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17,21 17,13 7,13 7,21" />
                      <polyline points="7,3 7,8 15,8" />
                    </svg>
                    <span>保存</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* ═══════════ Scrollable body ═══════════ */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* ── Mood selector ── */}
              <div>
                <span
                  className="text-xs font-medium block mb-2.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  心情
                </span>
                <div className="flex gap-2">
                  {MOODS.map((m) => {
                    const selected = mood === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMood(selected ? null : m.key)}
                        className="relative flex items-center justify-center w-9 h-9 rounded-full text-lg transition-all duration-150 cursor-pointer"
                        style={{
                          background: selected ? 'var(--gold-soft)' : 'transparent',
                          outline: selected
                            ? '2px solid var(--gold)'
                            : '2px solid transparent',
                          outlineOffset: '2px',
                          transform: selected ? 'scale(1.15)' : 'scale(1)',
                        }}
                        title={m.label}
                        aria-label={`心情: ${m.label}${selected ? ' (已选)' : ''}`}
                        aria-pressed={selected}
                      >
                        {m.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Markdown textarea ── */}
              <div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={"# 标题（可选）\n\n正文内容..."}
                  className="w-full resize-none rounded-xl p-4 text-sm leading-relaxed outline-none transition-colors duration-150"
                  style={{
                    minHeight: 260,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--border-default)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                />
                <div
                  className="text-xs mt-1.5 flex items-center justify-between"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <span>**加粗** *斜体* ~~删除线~~ - 列表项</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">已写 {Array.from(content).length} 字</span>
                  </div>
                </div>
              </div>

              {/* ── Image upload area ── */}
              <div>
                <span
                  className="text-xs font-medium block mb-2.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  图片
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {/* Existing attachments (read-only) */}
                  {diary?.attachments?.map((att) => (
                    <div
                      key={att.id}
                      className="relative rounded-lg overflow-hidden flex-shrink-0"
                      style={{
                        width: 72,
                        height: 72,
                        background: 'var(--bg-tertiary)',
                      }}
                    >
                      {att.mimeType?.startsWith('image/') ? (
                        <img
                          src={att.filepath}
                          alt={att.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-lg"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          📎
                        </div>
                      )}
                    </div>
                  ))}

                  {/* New files (with remove button) */}
                  {newFiles.map((file, i) => (
                    <div
                      key={`new-${i}`}
                      className="relative rounded-lg overflow-hidden flex-shrink-0 group"
                      style={{
                        width: 72,
                        height: 72,
                        background: 'var(--bg-tertiary)',
                      }}
                    >
                      {file.type?.startsWith('image/') ? (
                        <img
                          src={getPreviewUrl(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-lg"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          📎
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                        style={{
                          background: 'rgba(0,0,0,0.6)',
                          color: 'var(--accent-text)',
                        }}
                        aria-label="移除图片"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Add button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center rounded-lg flex-shrink-0 cursor-pointer transition-all duration-150 hover:opacity-80"
                    style={{
                      width: 72,
                      height: 72,
                      background: 'var(--bg-secondary)',
                      border: '1px dashed var(--border-hover)',
                      color: 'var(--text-secondary)',
                    }}
                    aria-label="添加图片"
                  >
                    <span className="text-base leading-none">＋</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              {/* ── Tags ── */}
              {diary?.tags && diary.tags.length > 0 && (
                <div>
                  <span
                    className="text-xs font-medium block mb-2.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    标签
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {diary.tags.map((dt) => {
                      const sel = selectedTagIds.includes(dt.tag.id);
                      const tagColor = dt.tag.color || 'var(--accent)';
                      return (
                        <button
                          key={dt.tagId}
                          type="button"
                          onClick={() => toggleTag(dt.tag.id)}
                          className="text-xs px-3 py-1 rounded-full transition-all duration-150 cursor-pointer"
                          style={{
                            background: sel ? tagColor : 'var(--accent-soft)',
                            color: sel ? 'var(--accent-text)' : 'var(--accent)',
                            opacity: sel ? 1 : 0.65,
                          }}
                          aria-pressed={sel}
                        >
                          {sel ? '✓ ' : ''}#{dt.tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom safe spacer */}
            <div className="h-2 shrink-0" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
