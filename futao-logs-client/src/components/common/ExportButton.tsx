'use client';

import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

export default function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await api.exportMarkdown();
      setToast(`导出完成：${result.filePath}`);
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast('导出失败');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
        title="导出日记"
      >
        {exporting ? (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </button>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm shadow-lg animate-[fadeIn_0.2s_ease-out]"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
