'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import LLMConfigSection from './LLMConfigSection';

/* ─── Storage keys (shared with ThemeToggle) ─── */
const THEME_KEY = 'futao-logs-theme';

/* ─── Export history type ─── */
interface ExportRecord {
  format: string;
  status: string;
  filePath: string;
  diaryCount: number;
  createdAt: string;
}

/* ─── Props ─── */
interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

/* ─── Section IDs ─── */
type Section = 'general' | 'llm' | 'data' | 'about';

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['general']));
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json'>('markdown');

  // ── Read theme on mount ──
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    setTheme(stored === 'light' ? 'light' : 'dark');
  }, []);

  // ── Theme toggle ──
  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }, [theme]);

  // ── Toggle section expand ──
  const toggleSection = useCallback((s: Section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  // ── Load export history ──
  const loadExports = useCallback(async () => {
    try {
      const list = await api.exportHistory();
      setExports(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open) loadExports();
  }, [open, loadExports]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      if (exportFormat === 'markdown') await api.exportMarkdown({});
      else await api.exportJson({});
      await loadExports();
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  }, [exportFormat, loadExports]);

  // ── ESC ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0, 0, 0, 0.4)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 z-50 h-full overflow-y-auto"
            style={{
              width: 360,
              maxWidth: '100vw',
              background: 'var(--bg-elevated)',
              borderLeft: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-modal)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ borderColor: 'var(--border-default)', background: 'var(--bg-elevated)' }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>设置</span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 cursor-pointer"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-6">

              {/* ─── General ─── */}
              <SettingsSection title="通用" section="general" expanded={expandedSections.has('general')} onToggle={() => toggleSection('general')}>
                <SettingsRow
                  label="主题"
                  control={
                    <button
                      onClick={toggleTheme}
                      className="text-sm px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    >
                      {theme === 'dark' ? '🌙 暗色模式' : '☀️ 亮色模式'}
                    </button>
                  }
                />
                <SettingsRow
                  label="界面语言"
                  control={<span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>中文 🇨🇳</span>}
                />
              </SettingsSection>

              {/* ─── LLM 配置 ─── */}
              <SettingsSection title="LLM 配置" section="llm" expanded={expandedSections.has('llm')} onToggle={() => toggleSection('llm')}>
                {expandedSections.has('llm') && <LLMConfigSection />}
              </SettingsSection>

              {/* ─── Data ─── */}
              <SettingsSection title="数据" section="data" expanded={expandedSections.has('data')} onToggle={() => toggleSection('data')}>
                <SettingsRow
                  label="导出全部日记"
                  control={
                    <div className="flex items-center gap-2">
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value as 'markdown' | 'json')}
                        className="text-xs px-2 py-1 rounded-lg cursor-pointer"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                      >
                        <option value="markdown">Markdown</option>
                        <option value="json">JSON</option>
                      </select>
                      <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="text-xs px-3 py-1 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50"
                        style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
                      >
                        {exporting ? '导出中...' : '导出'}
                      </button>
                    </div>
                  }
                />

                {/* Export history */}
                <div className="mt-3 space-y-1">
                  {exports.length === 0 && (
                    <p className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>还没有导出记录</p>
                  )}
                  {exports.map((rec, i) => {
                    const fileName = rec.filePath.split('/').pop() || rec.filePath;
                    const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <a
                        key={i}
                        href={rec.filePath}
                        download
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-colors duration-150"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span className="truncate mr-2">📄 {fileName}</span>
                        <span className="shrink-0">
                          {dateStr} · {rec.diaryCount} 篇
                        </span>
                      </a>
                    );
                  })}
                </div>
              </SettingsSection>

              {/* ─── About ─── */}
              <SettingsSection title="关于" section="about" expanded={expandedSections.has('about')} onToggle={() => toggleSection('about')}>
                <SettingsRow label="版本" control={<span className="text-sm" style={{ color: 'var(--text-secondary)' }}>v1.0.0</span>} />
                <SettingsRow label="数据存储" control={<span className="text-sm" style={{ color: 'var(--text-secondary)' }}>本地 SQLite</span>} />
                <SettingsRow label="设计" control={<span className="text-sm" style={{ color: 'var(--text-secondary)' }}>雨林暖调 · miky</span>} />
                <SettingsRow label="感谢" control={<span className="text-sm" style={{ color: 'var(--text-secondary)' }}>调研 · 力齐早早 / 需求 · 麻也龙太</span>} />
              </SettingsSection>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Sub-components ─── */

function SettingsSection({ title, section, expanded, onToggle, children }: {
  title: string;
  section: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{title}</span>
        <svg
          className="w-3.5 h-3.5 transition-transform duration-150"
          style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <div className="space-y-0">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ label, control }: { label: string; control: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between h-10"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {control}
    </div>
  );
}
