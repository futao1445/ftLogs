'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import OfflineBanner from './OfflineBanner';
import SettingsDrawer from '../settings/SettingsDrawer';

type Tab = 'diary' | 'calendar' | 'search' | 'summary' | 'treehole';

interface PageShellProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onNewDiary: () => void;
  openSettings?: boolean;
  onSettingsClosed?: () => void;
  children: React.ReactNode;
}

export default function PageShell({
  activeTab,
  onTabChange,
  onNewDiary,
  openSettings,
  onSettingsClosed,
  children,
}: PageShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { if (openSettings) setSettingsOpen(true); }, [openSettings]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Offline banner */}
      <OfflineBanner />

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => { setSettingsOpen(false); onSettingsClosed?.(); }} />

      {/* Top Navigation — 玻璃顶栏 */}
      <nav
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--bg-primary) 78%, transparent)',
          borderBottom: '1px solid rgba(45,74,117,0.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1">
              <TabButton active={activeTab === 'diary'} onClick={() => onTabChange('diary')} label="日记" />
              <TabButton active={activeTab === 'calendar'} onClick={() => onTabChange('calendar')} label="日历" />
              <TabButton active={activeTab === 'search'} onClick={() => onTabChange('search')} label="搜索" />
              <TabButton active={activeTab === 'summary'} onClick={() => onTabChange('summary')} label="AI 总结" />
              <TabButton active={activeTab === 'treehole'} onClick={() => onTabChange('treehole')} label="树洞" />
            </div>

            <div className="flex items-center gap-2">
              {/* Gear — settings entry */}
              <motion.button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer"
                style={{ color: 'var(--text-tertiary)' }}
                whileHover={{ scale: 1.06, color: 'var(--text-primary)', backgroundColor: 'rgba(74,106,148,0.18)' }}
                whileTap={{ scale: 0.92, backgroundColor: 'rgba(111,180,255,0.15)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                title="设置"
                aria-label="设置"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </motion.button>
              <ThemeToggle />
              {/* 写日记 — 水光蓝主按钮 */}
              <motion.button
                onClick={onNewDiary}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm cursor-pointer relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #6fb4ff 0%, #a8d0ff 100%)',
                  color: '#0a1626',
                  border: 'none',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(111,180,255,0.18)',
                }}
                whileHover={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px rgba(111,180,255,0.28)',
                }}
                whileTap={{
                  scale: 0.94,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(111,180,255,0.2)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <span className="text-sm">✒️</span>
                <span className="text-xs font-medium">写日记</span>
              </motion.button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer"
      style={{ color: active ? '#a8d0ff' : 'var(--text-tertiary)' }}
      whileHover={{ color: active ? '#a8d0ff' : 'var(--text-secondary)' }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      {/* 选中态 — 玻璃胶囊 + 水光发光 */}
      {active && (
        <motion.span
          layoutId="pond-tab-glow"
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(111,180,255,0.16), rgba(111,180,255,0.05))',
            border: '1px solid rgba(111,180,255,0.28)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px rgba(111,180,255,0.12)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 text-xs whitespace-nowrap">{label}</span>
    </motion.button>
  );
}
