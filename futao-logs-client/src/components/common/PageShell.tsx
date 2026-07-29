'use client';

import { useState } from 'react';
import SearchBar from '../search/SearchBar';
import ThemeToggle from './ThemeToggle';
import OfflineBanner from './OfflineBanner';

type Tab = 'diary' | 'calendar' | 'search';

interface PageShellProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onNewDiary: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  children: React.ReactNode;
}

export default function PageShell({
  activeTab,
  onTabChange,
  onNewDiary,
  searchValue = '',
  onSearchChange,
  children,
}: PageShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Offline banner */}
      <OfflineBanner />

      {/* Top Navigation */}
      <nav
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <TabButton
                active={activeTab === 'diary'}
                onClick={() => onTabChange('diary')}
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                }
                label="日记"
              />
              <TabButton
                active={activeTab === 'calendar'}
                onClick={() => onTabChange('calendar')}
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
                label="日历"
              />
              <TabButton
                active={activeTab === 'search'}
                onClick={() => onTabChange('search')}
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                }
                label="搜索"
              />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={onNewDiary}
                className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full transition-all duration-150"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-text)',
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
                <span className="text-xs font-medium">写日记</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Search bar (shown when search tab or when searching) */}
      {(activeTab === 'search') && onSearchChange && (
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <SearchBar value={searchValue} onChange={onSearchChange} />
        </div>
      )}

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
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm py-1 transition-all duration-150"
      style={{
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
